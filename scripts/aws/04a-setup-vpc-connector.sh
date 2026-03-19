#!/usr/bin/env bash
# =============================================================================
# 04a-setup-vpc-connector.sh — Create networking for the Preventia App Runner
# VPC connector.
#
# Creates or reuses:
# - 3 private subnets in the default VPC
# - 1 Elastic IP
# - 1 NAT gateway in a default public subnet
# - 1 private route table associated to the private subnets
# - 1 App Runner VPC connector named "preventia-vpc-connector"
#
# The connector uses the default VPC security group so it can reach the Redis
# cluster that is currently created in the default security group.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/aws-profile.sh"

REGION="ap-south-1"
ACCOUNT="246599827879"
CONNECTOR_NAME="preventia-vpc-connector"
NAT_GATEWAY_NAME="preventia-nat-gateway"
NAT_EIP_NAME="preventia-nat-eip"
PRIVATE_ROUTE_TABLE_NAME="preventia-private-rt"
CONNECTOR_SG_NAME="preventia-apprunner-sg"
PRIVATE_SUBNET_CIDRS="${PRIVATE_SUBNET_CIDRS:-172.31.64.0/20,172.31.80.0/20,172.31.96.0/20}"
ENABLE_NAT_GATEWAY="${ENABLE_NAT_GATEWAY:-auto}"

echo "=== Setting up Preventia App Runner VPC connector ==="

CALLER=$(aws sts get-caller-identity --query '{Account:Account,Arn:Arn}' --output text 2>/dev/null)
echo "  AWS identity: $CALLER"
if ! echo "$CALLER" | grep -q "246599827879"; then
  echo "  ERROR: Wrong AWS account. Expected ${ACCOUNT}."
  echo "  Run: export AWS_PROFILE=preventia"
  exit 1
fi

CONNECTOR_STATUS=$(aws apprunner list-vpc-connectors \
  --region "$REGION" \
  --query "VpcConnectors[?VpcConnectorName=='${CONNECTOR_NAME}'].Status | [0]" \
  --output text 2>/dev/null || true)
CONNECTOR_ARN=$(aws apprunner list-vpc-connectors \
  --region "$REGION" \
  --query "VpcConnectors[?VpcConnectorName=='${CONNECTOR_NAME}'].VpcConnectorArn | [0]" \
  --output text 2>/dev/null || true)

if [[ "$CONNECTOR_STATUS" == "ACTIVE" ]]; then
  echo "  ✓ VPC connector ${CONNECTOR_NAME} already exists"
  echo "  ARN: ${CONNECTOR_ARN}"
  exit 0
fi

if [[ -n "${CONNECTOR_STATUS}" && "${CONNECTOR_STATUS}" != "None" ]]; then
  echo "  ERROR: VPC connector ${CONNECTOR_NAME} exists with status ${CONNECTOR_STATUS}."
  echo "  Delete or wait for it to stabilize before rerunning."
  exit 1
fi

DEFAULT_VPC=$(aws ec2 describe-vpcs \
  --filters Name=isDefault,Values=true \
  --region "$REGION" \
  --query 'Vpcs[0].VpcId' \
  --output text)
VPC_CIDR=$(aws ec2 describe-vpcs \
  --vpc-ids "$DEFAULT_VPC" \
  --region "$REGION" \
  --query 'Vpcs[0].CidrBlock' \
  --output text)

if [[ -z "$DEFAULT_VPC" || "$DEFAULT_VPC" == "None" ]]; then
  echo "  ERROR: No default VPC found in ${REGION}."
  exit 1
fi

echo "  Default VPC: ${DEFAULT_VPC} (${VPC_CIDR})"

if [[ "$VPC_CIDR" != "172.31.0.0/16" && "${PRIVATE_SUBNET_CIDRS}" == "172.31.64.0/20,172.31.80.0/20,172.31.96.0/20" ]]; then
  echo "  ERROR: Default VPC CIDR is ${VPC_CIDR}, but the script default private subnet CIDRs assume 172.31.0.0/16."
  echo "  Export PRIVATE_SUBNET_CIDRS with 3 comma-separated non-overlapping CIDRs inside your VPC and rerun."
  exit 1
fi

IFS=',' read -r -a CIDR_LIST <<< "$PRIVATE_SUBNET_CIDRS"
AZ_LIST=(ap-south-1a ap-south-1b ap-south-1c)
if (( ${#CIDR_LIST[@]} < ${#AZ_LIST[@]} )); then
  echo "  ERROR: PRIVATE_SUBNET_CIDRS must contain at least ${#AZ_LIST[@]} CIDRs."
  exit 1
fi

echo ""
echo "=== Private subnets ==="
PRIVATE_SUBNET_IDS=()
for i in "${!AZ_LIST[@]}"; do
  AZ="${AZ_LIST[$i]}"
  LETTER="$(printf '%s' "$AZ" | rev | cut -c1)"
  SUBNET_NAME="preventia-private-apprunner-${LETTER}"
  CIDR="${CIDR_LIST[$i]}"

  SUBNET_ID=$(aws ec2 describe-subnets \
    --filters Name=vpc-id,Values="$DEFAULT_VPC" Name=tag:Name,Values="$SUBNET_NAME" \
    --region "$REGION" \
    --query 'Subnets[0].SubnetId' \
    --output text 2>/dev/null || true)

  if [[ -z "$SUBNET_ID" || "$SUBNET_ID" == "None" ]]; then
    SUBNET_ID=$(aws ec2 create-subnet \
      --vpc-id "$DEFAULT_VPC" \
      --availability-zone "$AZ" \
      --cidr-block "$CIDR" \
      --region "$REGION" \
      --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${SUBNET_NAME}},{Key=project,Value=preventia},{Key=env,Value=prod}]" \
      --query 'Subnet.SubnetId' \
      --output text)
    aws ec2 modify-subnet-attribute \
      --subnet-id "$SUBNET_ID" \
      --no-map-public-ip-on-launch \
      --region "$REGION"
    echo "  ✓ Created ${SUBNET_NAME} (${SUBNET_ID}, ${CIDR}, ${AZ})"
  else
    echo "  ✓ Reusing ${SUBNET_NAME} (${SUBNET_ID}, ${AZ})"
  fi

  PRIVATE_SUBNET_IDS+=("$SUBNET_ID")
done

echo ""
IGW_ID=$(aws ec2 describe-internet-gateways \
  --filters Name=attachment.vpc-id,Values="$DEFAULT_VPC" \
  --region "$REGION" \
  --query 'InternetGateways[0].InternetGatewayId' \
  --output text 2>/dev/null || true)

USE_NAT="false"
if [[ "$ENABLE_NAT_GATEWAY" == "true" ]]; then
  USE_NAT="true"
elif [[ "$ENABLE_NAT_GATEWAY" == "auto" && -n "$IGW_ID" && "$IGW_ID" != "None" ]]; then
  USE_NAT="true"
fi

if [[ "$USE_NAT" == "true" ]]; then
  echo "=== NAT gateway ==="

  PUBLIC_SUBNET_LINES=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && PUBLIC_SUBNET_LINES+=("$line")
  done < <(
    aws ec2 describe-subnets \
      --filters Name=vpc-id,Values="$DEFAULT_VPC" Name=map-public-ip-on-launch,Values=true \
      --region "$REGION" \
      --query 'Subnets[*].[AvailabilityZone,SubnetId,CidrBlock]' \
      --output text | sort -k1,1 | awk '!seen[$1]++' | head -n 3
  )

  if (( ${#PUBLIC_SUBNET_LINES[@]} == 0 )); then
    echo "  ERROR: NAT requested, but no public subnets were found in the default VPC."
    exit 1
  fi

  read -r _NAT_AZ NAT_PUBLIC_SUBNET_ID _ <<<"${PUBLIC_SUBNET_LINES[0]}"

  EIP_ALLOCATION_ID=$(aws ec2 describe-addresses \
    --filters Name=tag:Name,Values="$NAT_EIP_NAME" \
    --region "$REGION" \
    --query 'Addresses[0].AllocationId' \
    --output text 2>/dev/null || true)

  if [[ -z "$EIP_ALLOCATION_ID" || "$EIP_ALLOCATION_ID" == "None" ]]; then
    EIP_ALLOCATION_ID=$(aws ec2 allocate-address \
      --domain vpc \
      --region "$REGION" \
      --query 'AllocationId' \
      --output text)
    aws ec2 create-tags \
      --resources "$EIP_ALLOCATION_ID" \
      --tags Key=Name,Value="$NAT_EIP_NAME" Key=project,Value=preventia Key=env,Value=prod \
      --region "$REGION" > /dev/null
    echo "  ✓ Allocated Elastic IP ${EIP_ALLOCATION_ID}"
  else
    echo "  ✓ Reusing Elastic IP ${EIP_ALLOCATION_ID}"
  fi

  NAT_GATEWAY_ID=$(aws ec2 describe-nat-gateways \
    --filter Name=vpc-id,Values="$DEFAULT_VPC" Name=tag:Name,Values="$NAT_GATEWAY_NAME" Name=state,Values=pending,available \
    --region "$REGION" \
    --query 'NatGateways[0].NatGatewayId' \
    --output text 2>/dev/null || true)

  if [[ -z "$NAT_GATEWAY_ID" || "$NAT_GATEWAY_ID" == "None" ]]; then
    NAT_GATEWAY_ID=$(aws ec2 create-nat-gateway \
      --subnet-id "$NAT_PUBLIC_SUBNET_ID" \
      --allocation-id "$EIP_ALLOCATION_ID" \
      --region "$REGION" \
      --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=${NAT_GATEWAY_NAME}},{Key=project,Value=preventia},{Key=env,Value=prod}]" \
      --query 'NatGateway.NatGatewayId' \
      --output text)
    echo "  Waiting for NAT gateway to become available..."
    aws ec2 wait nat-gateway-available \
      --nat-gateway-ids "$NAT_GATEWAY_ID" \
      --region "$REGION"
    echo "  ✓ Created NAT gateway ${NAT_GATEWAY_ID}"
  else
    echo "  ✓ Reusing NAT gateway ${NAT_GATEWAY_ID}"
  fi

  echo ""
else
  if [[ "$ENABLE_NAT_GATEWAY" == "true" ]]; then
    echo "  ERROR: ENABLE_NAT_GATEWAY=true but no Internet gateway is attached to ${DEFAULT_VPC}."
    exit 1
  fi
  echo "=== NAT gateway ==="
  echo "  Skipping NAT gateway setup. No Internet gateway is attached to ${DEFAULT_VPC}."
  echo "  App Runner will still be able to reach VPC resources like RDS."
  NAT_GATEWAY_ID=""
  echo ""
fi

echo "=== Private routing ==="
PRIVATE_RT_ID=$(aws ec2 describe-route-tables \
  --filters Name=vpc-id,Values="$DEFAULT_VPC" Name=tag:Name,Values="$PRIVATE_ROUTE_TABLE_NAME" \
  --region "$REGION" \
  --query 'RouteTables[0].RouteTableId' \
  --output text 2>/dev/null || true)

if [[ -z "$PRIVATE_RT_ID" || "$PRIVATE_RT_ID" == "None" ]]; then
  PRIVATE_RT_ID=$(aws ec2 create-route-table \
    --vpc-id "$DEFAULT_VPC" \
    --region "$REGION" \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PRIVATE_ROUTE_TABLE_NAME}},{Key=project,Value=preventia},{Key=env,Value=prod}]" \
    --query 'RouteTable.RouteTableId' \
    --output text)
  echo "  ✓ Created route table ${PRIVATE_RT_ID}"
else
  echo "  ✓ Reusing route table ${PRIVATE_RT_ID}"
fi

if [[ -n "$NAT_GATEWAY_ID" ]]; then
  if ! aws ec2 create-route \
      --route-table-id "$PRIVATE_RT_ID" \
      --destination-cidr-block 0.0.0.0/0 \
      --nat-gateway-id "$NAT_GATEWAY_ID" \
      --region "$REGION" > /dev/null 2>&1; then
    aws ec2 replace-route \
      --route-table-id "$PRIVATE_RT_ID" \
      --destination-cidr-block 0.0.0.0/0 \
      --nat-gateway-id "$NAT_GATEWAY_ID" \
      --region "$REGION" > /dev/null
  fi
  echo "  ✓ Configured default route through NAT gateway"
else
  echo "  Skipping default route creation because NAT gateway is disabled."
fi

ASSOCIATED_SUBNETS=$(aws ec2 describe-route-tables \
  --route-table-ids "$PRIVATE_RT_ID" \
  --region "$REGION" \
  --query 'RouteTables[0].Associations[].SubnetId' \
  --output text 2>/dev/null || true)

for SUBNET_ID in "${PRIVATE_SUBNET_IDS[@]}"; do
  if [[ " ${ASSOCIATED_SUBNETS} " == *" ${SUBNET_ID} "* ]]; then
    echo "  ✓ Route table already associated to ${SUBNET_ID}"
  else
    aws ec2 associate-route-table \
      --route-table-id "$PRIVATE_RT_ID" \
      --subnet-id "$SUBNET_ID" \
      --region "$REGION" > /dev/null
    echo "  ✓ Associated route table to ${SUBNET_ID}"
  fi
done

echo ""
echo "=== App Runner connector ==="
CONNECTOR_SG_ID=$(aws ec2 describe-security-groups \
  --filters Name=vpc-id,Values="$DEFAULT_VPC" Name=group-name,Values="$CONNECTOR_SG_NAME" \
  --region "$REGION" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || true)

if [[ -z "$CONNECTOR_SG_ID" || "$CONNECTOR_SG_ID" == "None" ]]; then
  CONNECTOR_SG_ID=$(aws ec2 create-security-group \
    --group-name "$CONNECTOR_SG_NAME" \
    --description "Preventia App Runner VPC connector egress" \
    --vpc-id "$DEFAULT_VPC" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text)
  aws ec2 create-tags \
    --resources "$CONNECTOR_SG_ID" \
    --tags Key=Name,Value="$CONNECTOR_SG_NAME" Key=project,Value=preventia Key=env,Value=prod \
    --region "$REGION" > /dev/null
  echo "  ✓ Created connector security group ${CONNECTOR_SG_ID}"
else
  echo "  ✓ Reusing connector security group ${CONNECTOR_SG_ID}"
fi

if ! aws ec2 authorize-security-group-egress \
    --group-id "$CONNECTOR_SG_ID" \
    --ip-permissions '[
      {
        "IpProtocol": "-1",
        "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
      }
    ]' \
    --region "$REGION" > /dev/null 2>&1; then
  echo "  ✓ Connector security group egress already configured"
else
  echo "  ✓ Allowed connector security group egress to 0.0.0.0/0"
fi

CONNECTOR_ARN=$(aws apprunner create-vpc-connector \
  --vpc-connector-name "$CONNECTOR_NAME" \
  --subnets "${PRIVATE_SUBNET_IDS[@]}" \
  --security-groups "$CONNECTOR_SG_ID" \
  --region "$REGION" \
  --tags Key=project,Value=preventia Key=env,Value=prod \
  --query 'VpcConnector.VpcConnectorArn' \
  --output text)

echo "  Waiting for VPC connector to become ACTIVE..."
for _ in $(seq 1 60); do
  CONNECTOR_STATUS=$(aws apprunner list-vpc-connectors \
    --region "$REGION" \
    --query "VpcConnectors[?VpcConnectorName=='${CONNECTOR_NAME}'].Status | [0]" \
    --output text 2>/dev/null || true)

  if [[ "$CONNECTOR_STATUS" == "ACTIVE" ]]; then
    echo "  ✓ VPC connector is ACTIVE"
    echo "  ARN: ${CONNECTOR_ARN}"
    echo ""
    echo "Run next:"
    echo "  ./deploy.sh both"
    echo "  ./05-setup-apprunner.sh"
    echo "  ./deploy.sh web"
    exit 0
  fi

  if [[ "$CONNECTOR_STATUS" == "FAILED" ]]; then
    echo "  ERROR: VPC connector creation failed."
    exit 1
  fi

  sleep 10
done

echo "  ERROR: Timed out waiting for VPC connector to become ACTIVE."
exit 1
