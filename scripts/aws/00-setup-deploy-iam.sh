#!/usr/bin/env bash
# =============================================================================
# 00-setup-deploy-iam.sh — Create or update the Preventia deploy IAM user
#
# Run this with an existing admin-capable AWS profile. This script creates:
# - IAM user: preventia-deploy
# - Inline user policy: preventia-bootstrap-deploy
# - One access key pair (if the user has no existing access keys)
#
# It prints the access key once. Then run:
#   aws configure --profile preventia
# and paste the generated credentials.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGION="ap-south-1"
ACCOUNT="246599827879"
IAM_USER="preventia-deploy"
POLICY_NAME="preventia-bootstrap-deploy"
POLICY_FILE="${SCRIPT_DIR}/iam/preventia-deploy-bootstrap-policy.json"

if [[ ! -f "$POLICY_FILE" ]]; then
  echo "  ERROR: policy file not found: ${POLICY_FILE}"
  exit 1
fi

echo "=== Setting up Preventia deploy IAM user ==="
echo "  AWS_PROFILE: ${AWS_PROFILE:-default}"

CALLER=$(aws sts get-caller-identity --query '{Account:Account,Arn:Arn}' --output text 2>/dev/null)
echo "  AWS identity: $CALLER"
if ! echo "$CALLER" | grep -q "${ACCOUNT}"; then
  echo "  ERROR: Wrong AWS account. Expected ${ACCOUNT}."
  exit 1
fi

if aws iam get-user --user-name "$IAM_USER" &>/dev/null; then
  echo "  ✓ IAM user ${IAM_USER} already exists"
else
  aws iam create-user \
    --user-name "$IAM_USER" \
    --tags Key=project,Value=preventia Key=env,Value=prod > /dev/null
  echo "  ✓ Created IAM user ${IAM_USER}"
fi

aws iam put-user-policy \
  --user-name "$IAM_USER" \
  --policy-name "$POLICY_NAME" \
  --policy-document "file://${POLICY_FILE}" > /dev/null
echo "  ✓ Applied inline policy ${POLICY_NAME}"

EXISTING_KEYS=$(aws iam list-access-keys \
  --user-name "$IAM_USER" \
  --query 'AccessKeyMetadata[].AccessKeyId' \
  --output text)

KEY_COUNT=$(printf '%s\n' "$EXISTING_KEYS" | awk 'NF { count += NF } END { print count + 0 }')
if (( KEY_COUNT == 0 )); then
  read -r ACCESS_KEY_ID SECRET_ACCESS_KEY <<<"$(aws iam create-access-key \
    --user-name "$IAM_USER" \
    --query 'AccessKey.[AccessKeyId,SecretAccessKey]' \
    --output text)"
  echo "  ✓ Created access key for ${IAM_USER}"
  echo ""
  echo "Configure your local AWS profile:"
  echo "  aws configure --profile preventia"
  echo ""
  echo "Use these values:"
  echo "  AWS Access Key ID:     ${ACCESS_KEY_ID}"
  echo "  AWS Secret Access Key: ${SECRET_ACCESS_KEY}"
  echo "  Default region name:   ${REGION}"
  echo "  Default output format: json"
else
  echo "  ✓ IAM user ${IAM_USER} already has ${KEY_COUNT} access key(s)"
  echo "  Existing key IDs: ${EXISTING_KEYS}"
  echo "  Reuse one of those keys, or delete an old key before creating a new one."
  echo "  Then run: aws configure --profile preventia"
fi

echo ""
echo "Next:"
echo "  aws sts get-caller-identity --profile preventia"
echo "  export AWS_PROFILE=preventia"
echo "  cd ops/aws"
echo "  ./01-setup-ecr.sh"
