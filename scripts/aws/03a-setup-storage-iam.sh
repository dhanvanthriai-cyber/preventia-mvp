#!/usr/bin/env bash
# =============================================================================
# 03a-setup-storage-iam.sh — Create S3 bucket + IAM user for app uploads
#
# Creates:
# - S3 bucket for prescriptions and uploaded assets
# - IAM user "preventia-app"
# - Inline S3 policy scoped to that bucket
# - One access key pair for the app
#
# If .env.aws exists, the script updates:
# - S3_BUCKET_NAME
# - AWS_ACCESS_KEY_ID_APP
# - AWS_SECRET_ACCESS_KEY_APP
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/aws-profile.sh"

REGION="ap-south-1"
ACCOUNT="246599827879"
ENV_FILE="${SCRIPT_DIR}/.env.aws"
IAM_USER="preventia-app"
POLICY_NAME="preventia-app-s3-access"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

S3_BUCKET_NAME="${S3_BUCKET_NAME:-preventia-mvp-prescriptions}"

update_env_var() {
  local key="$1"
  local value="$2"

  if [[ ! -f "$ENV_FILE" ]]; then
    return 0
  fi

  local tmp
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    index($0, key "=") == 1 {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}

echo "=== Setting up Preventia storage + app IAM ==="

CALLER=$(aws sts get-caller-identity --query '{Account:Account,Arn:Arn}' --output text 2>/dev/null)
echo "  AWS identity: $CALLER"
if ! echo "$CALLER" | grep -q "246599827879"; then
  echo "  ERROR: Wrong AWS account. Expected ${ACCOUNT}."
  echo "  Run: export AWS_PROFILE=preventia"
  exit 1
fi

echo ""
echo "=== S3 bucket ==="
if aws s3api head-bucket --bucket "$S3_BUCKET_NAME" 2>/dev/null; then
  echo "  ✓ Bucket ${S3_BUCKET_NAME} already exists"
else
  aws s3api create-bucket \
    --bucket "$S3_BUCKET_NAME" \
    --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=${REGION}" > /dev/null
  echo "  ✓ Created bucket ${S3_BUCKET_NAME}"
fi

aws s3api put-public-access-block \
  --bucket "$S3_BUCKET_NAME" \
  --public-access-block-configuration \
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true' \
  > /dev/null
echo "  ✓ Blocked public access"

aws s3api put-bucket-encryption \
  --bucket "$S3_BUCKET_NAME" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
  > /dev/null
echo "  ✓ Enabled SSE-S3 default encryption"

aws s3api put-bucket-tagging \
  --bucket "$S3_BUCKET_NAME" \
  --tagging 'TagSet=[{Key=project,Value=preventia},{Key=env,Value=prod}]' \
  > /dev/null
echo "  ✓ Tagged bucket"

echo ""
echo "=== IAM user ==="
if aws iam get-user --user-name "$IAM_USER" &>/dev/null; then
  echo "  ✓ IAM user ${IAM_USER} already exists"
else
  aws iam create-user \
    --user-name "$IAM_USER" \
    --tags Key=project,Value=preventia Key=env,Value=prod > /dev/null
  echo "  ✓ Created IAM user ${IAM_USER}"
fi

cat > /tmp/preventia-app-s3-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BucketMetadata",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::${S3_BUCKET_NAME}"
    },
    {
      "Sid": "ObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload"
      ],
      "Resource": "arn:aws:s3:::${S3_BUCKET_NAME}/*"
    }
  ]
}
EOF

aws iam put-user-policy \
  --user-name "$IAM_USER" \
  --policy-name "$POLICY_NAME" \
  --policy-document file:///tmp/preventia-app-s3-policy.json > /dev/null
echo "  ✓ Applied inline S3 policy ${POLICY_NAME}"

echo ""
echo "=== Access key ==="
ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID_APP:-}"
SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY_APP:-}"

if [[ -n "$ACCESS_KEY_ID" && -n "$SECRET_ACCESS_KEY" ]]; then
  echo "  ✓ Reusing access key from .env.aws"
else
  EXISTING_KEYS=$(aws iam list-access-keys \
    --user-name "$IAM_USER" \
    --query 'AccessKeyMetadata[].AccessKeyId' \
    --output text)

  KEY_COUNT=$(printf '%s\n' "$EXISTING_KEYS" | awk 'NF { count += NF } END { print count + 0 }')
  if (( KEY_COUNT >= 2 )); then
    echo "  ERROR: IAM user ${IAM_USER} already has 2 access keys."
    echo "  Delete an old key or populate AWS_ACCESS_KEY_ID_APP / AWS_SECRET_ACCESS_KEY_APP in .env.aws first."
    exit 1
  fi

  read -r ACCESS_KEY_ID SECRET_ACCESS_KEY <<<"$(aws iam create-access-key \
    --user-name "$IAM_USER" \
    --query 'AccessKey.[AccessKeyId,SecretAccessKey]' \
    --output text)"
  echo "  ✓ Created new access key for ${IAM_USER}"
fi

update_env_var "S3_BUCKET_NAME" "$S3_BUCKET_NAME"
update_env_var "AWS_ACCESS_KEY_ID_APP" "$ACCESS_KEY_ID"
update_env_var "AWS_SECRET_ACCESS_KEY_APP" "$SECRET_ACCESS_KEY"

echo ""
echo "  Bucket: ${S3_BUCKET_NAME}"
echo "  IAM user: ${IAM_USER}"
echo "  Access key: ${ACCESS_KEY_ID}"
if [[ -f "$ENV_FILE" ]]; then
  echo "  ✓ Updated ${ENV_FILE}"
fi
echo ""
echo "Run next: ./04-setup-secrets.sh"
