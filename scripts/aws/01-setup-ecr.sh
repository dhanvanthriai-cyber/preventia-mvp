#!/usr/bin/env bash
# =============================================================================
# 01-setup-ecr.sh — Create ECR repositories for both images
# Run once. Safe to re-run (idempotent).
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/aws-profile.sh"

REGION="ap-south-1"
ACCOUNT="246599827879"

echo "=== Creating ECR repositories ==="

for repo in preventia/api preventia/web; do
  if aws ecr describe-repositories --repository-names "$repo" --region "$REGION" &>/dev/null; then
    echo "  ✓ $repo already exists"
  else
    aws ecr create-repository \
      --repository-name "$repo" \
      --region "$REGION" \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 \
      --tags Key=project,Value=preventia Key=env,Value=prod
    echo "  ✓ Created $repo"
  fi
done

echo ""
echo "ECR URIs:"
echo "  API: ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/preventia/api"
echo "  WEB: ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/preventia/web"
echo ""
echo "Run next: ./02-setup-rds.sh"
