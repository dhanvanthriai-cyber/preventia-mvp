#!/usr/bin/env bash
# =============================================================================
# 04-setup-secrets.sh — Store all app secrets in AWS Secrets Manager
#
# Creates one secret per logical group. App Runner reads these at deploy time
# and injects them as environment variables.
#
# Usage:
#   Fill in .env.aws first, then run:
#   source .env.aws && ./04-setup-secrets.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/aws-profile.sh"

REGION="ap-south-1"

# Auto-source .env.aws from the same directory as this script
ENV_FILE="${SCRIPT_DIR}/.env.aws"
if [[ -f "$ENV_FILE" ]]; then
  echo "  Sourcing $ENV_FILE …"
  # Use set -a so all vars are exported, handle special chars safely
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "  ERROR: $ENV_FILE not found."
  echo "  Copy .env.aws.example to .env.aws and fill in all values."
  exit 1
fi

# Helper: create or update a secret
upsert_secret() {
  local name="$1"
  local value="$2"
  local desc="$3"

  if aws secretsmanager describe-secret --secret-id "$name" --region "$REGION" &>/dev/null; then
    local deleted_date
    deleted_date=$(aws secretsmanager describe-secret \
      --secret-id "$name" \
      --region "$REGION" \
      --query 'DeletedDate' \
      --output text 2>/dev/null || true)

    if [[ -n "$deleted_date" && "$deleted_date" != "None" ]]; then
      aws secretsmanager restore-secret \
        --secret-id "$name" \
        --region "$REGION" > /dev/null
      echo "  ✓ Restored $name from pending deletion"
    fi

    aws secretsmanager update-secret \
      --secret-id "$name" \
      --secret-string "$value" \
      --region "$REGION" > /dev/null
    echo "  ✓ Updated  $name"
  else
    aws secretsmanager create-secret \
      --name "$name" \
      --description "$desc" \
      --secret-string "$value" \
      --region "$REGION" \
      --tags Key=project,Value=preventia > /dev/null
    echo "  ✓ Created  $name"
  fi
}

echo "=== Storing secrets in Secrets Manager (${REGION}) ==="
echo ""

DB_NAME="${DB_NAME:-preventia_db}"
DB_USER="${DB_USER:-preventia_admin}"

# --- Validate required vars ---
required=(
  POSTGRES_PASSWORD RDS_HOST
  JWT_SECRET
  DAILY_API_KEY
  STREAM_API_KEY STREAM_API_SECRET
  AWS_ACCESS_KEY_ID_APP AWS_SECRET_ACCESS_KEY_APP
)
for var in "${required[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "  ERROR: $var is not set. Source .env.aws first."
    exit 1
  fi
done

JWT_SECRET_BYTES=$(printf '%s' "$JWT_SECRET" | wc -c | tr -d ' ')
if [[ "$JWT_SECRET_BYTES" -lt 32 ]]; then
  echo "  ERROR: JWT_SECRET must be at least 32 bytes for HS256."
  echo "  Current length: ${JWT_SECRET_BYTES} bytes."
  exit 1
fi

echo "  Database…"
upsert_secret \
  "preventia/prod/db" \
  "{\"url\":\"jdbc:postgresql://${RDS_HOST}:5432/${DB_NAME}\",\"username\":\"${DB_USER}\",\"password\":\"${POSTGRES_PASSWORD}\"}" \
  "Preventia RDS PostgreSQL credentials"

echo "  Redis…"
upsert_secret \
  "preventia/prod/redis" \
  "{\"host\":\"${REDIS_HOST:-localhost}\",\"port\":\"6379\"}" \
  "Preventia ElastiCache Redis endpoint"

echo "  JWT…"
upsert_secret \
  "preventia/prod/jwt" \
  "{\"secret\":\"${JWT_SECRET}\",\"expirySeconds\":\"86400\"}" \
  "Preventia JWT signing secret"

echo "  Daily.co…"
upsert_secret \
  "preventia/prod/daily" \
  "{\"apiKey\":\"${DAILY_API_KEY}\",\"webhookSecret\":\"${DAILY_WEBHOOK_SECRET:-STUB}\"}" \
  "Daily.co API key and webhook HMAC secret"

echo "  Stream Chat…"
upsert_secret \
  "preventia/prod/stream" \
  "{\"apiKey\":\"${STREAM_API_KEY}\",\"apiSecret\":\"${STREAM_API_SECRET}\"}" \
  "Stream Chat API credentials"

echo "  AWS (app-level S3)…"
upsert_secret \
  "preventia/prod/aws-app" \
  "{\"accessKeyId\":\"${AWS_ACCESS_KEY_ID_APP}\",\"secretAccessKey\":\"${AWS_SECRET_ACCESS_KEY_APP}\",\"region\":\"ap-south-1\",\"s3Bucket\":\"${S3_BUCKET_NAME:-preventia-mvp-prescriptions}\"}" \
  "App-level AWS credentials for S3 access"

echo "  Razorpay…"
upsert_secret \
  "preventia/prod/razorpay" \
  "{\"apiKey\":\"${RAZORPAY_API_KEY:-STUB}\",\"apiSecret\":\"${RAZORPAY_API_SECRET:-STUB}\",\"webhookSecret\":\"${RAZORPAY_WEBHOOK_SECRET:-STUB}\"}" \
  "Razorpay payment gateway credentials"

echo ""
echo "✓ All secrets stored."
echo ""
echo "Run next: ./04a-setup-vpc-connector.sh"
