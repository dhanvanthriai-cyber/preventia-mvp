#!/usr/bin/env bash
# =============================================================================
# 02-setup-rds.sh — Create RDS PostgreSQL 16 (db.t4g.micro, Single-AZ for MVP)
# Run once. Safe to re-run — skips if already exists.
# =============================================================================
set -euo pipefail

REGION="ap-south-1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/aws-profile.sh"

# Verify we're on the right account before doing anything
CALLER=$(aws sts get-caller-identity --query '{Account:Account,User:Arn}' --output text 2>/dev/null)
echo "  AWS identity: $CALLER"
if ! echo "$CALLER" | grep -q "246599827879"; then
  echo "  ERROR: Wrong AWS account. Expected 246599827879."
  echo "  Run: export AWS_PROFILE=preventia"
  exit 1
fi
DB_INSTANCE_ID="preventia-postgres"
DB_NAME="${DB_NAME:-preventia_db}"
DB_USER="preventia_admin"
DB_SUBNET_GROUP="preventia-db-subnet-group"
DB_INSTANCE_CLASS="db.t4g.micro"   # ~$15/mo in ap-south-1
DB_ENGINE_VERSION="16.13"          # latest stable in ap-south-1 as of Mar 2026
DB_STORAGE=20                      # GB gp3
SG_ID=""
DB_SUBNET_GROUP_NAME=""

ensure_rds_security_group() {
  local default_vpc="$1"
  local sg_id

  sg_id=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=preventia-rds-sg" \
              "Name=vpc-id,Values=${default_vpc}" \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || true)

  if [[ -z "$sg_id" || "$sg_id" == "None" ]]; then
    echo "  Creating security group…" >&2
    sg_id=$(aws ec2 create-security-group \
      --group-name "preventia-rds-sg" \
      --description "Preventia RDS - App Runner VPC connector access" \
      --vpc-id "$default_vpc" \
      --region "$REGION" \
      --query 'GroupId' \
      --output text)
    echo "  ✓ Created security group: $sg_id" >&2
  else
    echo "  ✓ Reusing security group: $sg_id" >&2
  fi

  if ! aws ec2 describe-security-groups \
      --group-ids "$sg_id" \
      --region "$REGION" > /dev/null 2>&1; then
    echo "  ERROR: Security group $sg_id could not be described after create/reuse." >&2
    exit 1
  fi

  if ! aws ec2 authorize-security-group-ingress \
      --group-id "$sg_id" \
      --protocol tcp \
      --port 5432 \
      --cidr 172.31.0.0/16 \
      --region "$REGION" > /dev/null 2>&1; then
    echo "  ✓ Ingress rule for port 5432 already present (or could not be added again)" >&2
  else
    echo "  ✓ Allowed port 5432 from VPC CIDR 172.31.0.0/16" >&2
  fi

  SG_ID="$sg_id"
}

ensure_db_subnet_group() {
  local default_vpc="$1"
  local subnet_group_name="$2"
  local subnet_lines=()
  local subnet_ids=()
  local subnet_id_list=""
  local existing_group
  local ensure_line=""

  collect_subnets() {
    subnet_lines=()
    while IFS= read -r line; do
      [[ -n "$line" ]] && subnet_lines+=("$line")
    done < <(
      aws ec2 describe-subnets \
        --filters Name=vpc-id,Values="$default_vpc" Name=state,Values=available \
        --region "$REGION" \
        --query 'Subnets[*].[AvailabilityZone,SubnetId,MapPublicIpOnLaunch,Tags[?Key==`Name`].Value | [0]]' \
        --output text | sort -k1,1 | awk '!seen[$1]++'
    )
  }

  collect_subnets

  if (( ${#subnet_lines[@]} < 2 )); then
    echo "  Not enough subnets for RDS DB subnet group. Creating missing private subnets…" >&2

    while IFS='|' read -r az cidr suffix; do
      [[ -z "$az" ]] && continue
      if printf '%s\n' "${subnet_lines[@]}" | grep -q "^${az}[[:space:]]"; then
        continue
      fi

      local subnet_name="preventia-rds-private-${suffix}"
      local existing_subnet_id
      existing_subnet_id=$(aws ec2 describe-subnets \
        --filters Name=vpc-id,Values="$default_vpc" Name=tag:Name,Values="$subnet_name" \
        --region "$REGION" \
        --query 'Subnets[0].SubnetId' \
        --output text 2>/dev/null || true)

      if [[ -z "$existing_subnet_id" || "$existing_subnet_id" == "None" ]]; then
        existing_subnet_id=$(aws ec2 create-subnet \
          --vpc-id "$default_vpc" \
          --availability-zone "$az" \
          --cidr-block "$cidr" \
          --region "$REGION" \
          --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${subnet_name}},{Key=project,Value=preventia},{Key=env,Value=prod}]" \
          --query 'Subnet.SubnetId' \
          --output text)
        aws ec2 modify-subnet-attribute \
          --subnet-id "$existing_subnet_id" \
          --no-map-public-ip-on-launch \
          --region "$REGION"
        echo "  ✓ Created ${subnet_name} (${existing_subnet_id}, ${cidr}, ${az})" >&2
      else
        echo "  ✓ Reusing ${subnet_name} (${existing_subnet_id}, ${az})" >&2
      fi
    done <<'EOF'
ap-south-1a|172.31.128.0/20|a
ap-south-1b|172.31.144.0/20|b
ap-south-1c|172.31.160.0/20|c
EOF

    collect_subnets
  fi

  if (( ${#subnet_lines[@]} < 2 )); then
    echo "  ERROR: Need at least 2 subnets in different AZs to create an RDS DB subnet group." >&2
    exit 1
  fi

  for line in "${subnet_lines[@]}"; do
    read -r _az _subnet_id _map_public _name <<<"$line"
    subnet_ids+=("$_subnet_id")
  done

  if (( ${#subnet_ids[@]} < 2 )); then
    echo "  ERROR: Could not resolve at least 2 subnet IDs for the DB subnet group." >&2
    exit 1
  fi

  subnet_id_list="${subnet_ids[*]}"

  existing_group=$(aws rds describe-db-subnet-groups \
    --db-subnet-group-name "$subnet_group_name" \
    --region "$REGION" \
    --query 'DBSubnetGroups[0].DBSubnetGroupName' \
    --output text 2>/dev/null || true)

  if [[ -z "$existing_group" || "$existing_group" == "None" ]]; then
    aws rds create-db-subnet-group \
      --db-subnet-group-name "$subnet_group_name" \
      --db-subnet-group-description "Preventia RDS subnet group" \
      --subnet-ids ${subnet_id_list} \
      --tags Key=project,Value=preventia Key=env,Value=prod \
      --region "$REGION" > /dev/null
    echo "  ✓ Created DB subnet group: $subnet_group_name" >&2
  else
    aws rds modify-db-subnet-group \
      --db-subnet-group-name "$subnet_group_name" \
      --subnet-ids ${subnet_id_list} \
      --region "$REGION" > /dev/null
    echo "  ✓ Updated DB subnet group: $subnet_group_name" >&2
  fi

  DB_SUBNET_GROUP_NAME="$subnet_group_name"
}

echo "=== Setting up RDS PostgreSQL ==="

# --- Resolve default VPC ---
DEFAULT_VPC=$(aws ec2 describe-vpcs \
  --filters Name=isDefault,Values=true \
  --region "$REGION" \
  --query 'Vpcs[0].VpcId' --output text)

if [[ -z "$DEFAULT_VPC" || "$DEFAULT_VPC" == "None" ]]; then
  echo "  ERROR: No default VPC found in $REGION."
  echo "  Create one: aws ec2 create-default-vpc --region $REGION"
  exit 1
fi
echo "  Default VPC: $DEFAULT_VPC"

ensure_rds_security_group "$DEFAULT_VPC"
ensure_db_subnet_group "$DEFAULT_VPC" "$DB_SUBNET_GROUP"

# Check if already exists
if aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --region "$REGION" &>/dev/null; then
  echo "  ✓ RDS instance $DB_INSTANCE_ID already exists"
  ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --region "$REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)
  CURRENT_STATUS=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --region "$REGION" \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text)
  CURRENT_SGS=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --region "$REGION" \
    --query 'DBInstances[0].VpcSecurityGroups[].VpcSecurityGroupId' \
    --output text 2>/dev/null || true)

  if [[ "$CURRENT_STATUS" == "incompatible-network" || " $CURRENT_SGS " != *" $SG_ID "* ]]; then
    echo "  Repairing DB security groups…"
    aws rds modify-db-instance \
      --db-instance-identifier "$DB_INSTANCE_ID" \
      --vpc-security-group-ids "$SG_ID" \
      --apply-immediately \
      --region "$REGION" > /dev/null

    echo "  Waiting for RDS to become available after security group repair…"
    aws rds wait db-instance-available \
      --db-instance-identifier "$DB_INSTANCE_ID" \
      --region "$REGION"
    echo "  ✓ RDS network configuration repaired"
  fi

  echo "  Endpoint: $ENDPOINT"
  exit 0
fi

# Read password from environment or prompt only when creating a new DB
if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo ""
  echo "  You are creating a NEW password for the RDS database user 'preventia_admin'."
  echo "  This is NOT your AWS password. Store it safely — you'll need it later."
  echo "  Rules: min 8 chars, no spaces, no /  @  or  \" characters."
  echo "  Example: PreventiaProd2026#"
  echo ""
  read -rsp "  Create RDS password: " POSTGRES_PASSWORD
  echo ""
  read -rsp "  Confirm password:    " POSTGRES_PASSWORD_CONFIRM
  echo ""
  if [[ "$POSTGRES_PASSWORD" != "$POSTGRES_PASSWORD_CONFIRM" ]]; then
    echo "  ERROR: Passwords do not match."
    exit 1
  fi
  if [[ ${#POSTGRES_PASSWORD} -lt 8 ]]; then
    echo "  ERROR: Password must be at least 8 characters."
    exit 1
  fi
  # These characters break JDBC connection strings
  if echo "$POSTGRES_PASSWORD" | grep -qE '[@/ "\\]'; then
    echo "  ERROR: Password contains a forbidden character (@ / space or \")."
    echo "  Use letters, digits, and symbols like # ! % ^ & * - _ + = ."
    exit 1
  fi
fi

# --- Create RDS instance ---
echo "  Creating RDS instance (takes ~5 minutes)…"

aws rds create-db-instance \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --db-instance-class "$DB_INSTANCE_CLASS" \
  --engine postgres \
  --engine-version "$DB_ENGINE_VERSION" \
  --master-username "$DB_USER" \
  --master-user-password "$POSTGRES_PASSWORD" \
  --db-name "$DB_NAME" \
  --allocated-storage "$DB_STORAGE" \
  --storage-type gp3 \
  --no-multi-az \
  --no-publicly-accessible \
  --db-subnet-group-name "$DB_SUBNET_GROUP_NAME" \
  --vpc-security-group-ids "$SG_ID" \
  --backup-retention-period 7 \
  --deletion-protection \
  --tags Key=project,Value=preventia Key=env,Value=prod \
  --region "$REGION" > /dev/null

echo "  Waiting for RDS to become available (this takes ~5 min)…"
aws rds wait db-instance-available \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --region "$REGION"

ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --region "$REGION" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo ""
echo "  ✓ RDS ready!"
echo "  Endpoint:  $ENDPOINT"
echo "  DB:        $DB_NAME"
echo "  User:      $DB_USER"
echo "  Version:   PostgreSQL $DB_ENGINE_VERSION"
echo ""
echo "  → Add to .env.aws:"
echo "    RDS_HOST=$ENDPOINT"
echo "    POSTGRES_PASSWORD=<the password you just entered>"
echo ""
echo "Run next: ./03-setup-elasticache.sh"
