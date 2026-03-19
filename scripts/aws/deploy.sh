#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Build both images, push to ECR, trigger App Runner re-deploy
#
# Usage:
#   ./deploy.sh              # build + push + deploy both
#   ./deploy.sh api          # only API
#   ./deploy.sh web          # only Web
#   ./deploy.sh api --skip-build   # push existing local image only
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/aws-profile.sh"

REGION="ap-south-1"
ACCOUNT="246599827879"
ECR_BASE="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
TARGET="${1:-both}"
SKIP_BUILD="${2:-}"

# Use podman — already installed, no Docker Hub auth needed
# podman is API-compatible with docker for build/tag/push
DOCKER="podman"

get_service_field() {
  local service_name="$1"
  local field="$2"
  aws apprunner list-services --region "$REGION" \
    --query "ServiceSummaryList[?ServiceName=='${service_name}'].${field}" \
    --output text 2>/dev/null || true
}

describe_status_reason() {
  local service_arn="$1"
  if [[ -z "$service_arn" || "$service_arn" == "None" ]]; then
    return 0
  fi

  aws apprunner describe-service \
    --service-arn "$service_arn" \
    --region "$REGION" \
    --query 'Service.StatusReason' \
    --output text 2>/dev/null || true
}

# --- ECR login ---
echo "=== Logging in to ECR ==="
aws ecr get-login-password --region "$REGION" | \
  $DOCKER login --username AWS --password-stdin "${ECR_BASE}"
echo "  ✓ Logged in"

build_and_push_api() {
  echo ""
  echo "=== API — Spring Boot ==="
  cd "$(dirname "$0")/../../eng"

  if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
    echo "  Building Docker image (this takes ~2 min, platform: linux/amd64)…"
    $DOCKER build \
      --platform linux/amd64 \
      --format docker \
      --build-arg "CACHE_BUST=$(date +%s)" \
      -t "preventia/api:latest" \
      -f Dockerfile .
    echo "  ✓ Built"
  fi

  $DOCKER tag "preventia/api:latest" "${ECR_BASE}/preventia/api:latest"
  $DOCKER tag "preventia/api:latest" "${ECR_BASE}/preventia/api:$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"

  echo "  Pushing to ECR…"
  $DOCKER push "${ECR_BASE}/preventia/api:latest"
  echo "  ✓ Pushed API image"
  cd - > /dev/null
}

build_and_push_web() {
  echo ""
  echo "=== WEB — Next.js ==="

  # Build context is eng/ — contains both web-app/ and shared/
  ENG_DIR="${SCRIPT_DIR}/../../eng"
  ENG_DIR="$(cd "$ENG_DIR" && pwd)"

  if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
    # Fetch the API App Runner URL to bake into the image as NEXT_PUBLIC_API_BASE_URL
    API_URL=$(aws apprunner list-services --region "$REGION" \
      --query "ServiceSummaryList[?ServiceName=='preventia-api'].ServiceUrl" \
      --output text 2>/dev/null || echo "")
    API_ARG=""
    if [[ -n "$API_URL" && "$API_URL" != "None" ]]; then
      API_ARG="--build-arg NEXT_PUBLIC_API_BASE_URL=https://${API_URL}"
      echo "  Baking API URL into image: https://${API_URL}"
    fi

    echo "  Building Docker image (context: eng/, platform: linux/amd64)…"
    $DOCKER build \
      --platform linux/amd64 \
      --format docker \
      -f "${ENG_DIR}/Dockerfile.web" \
      $API_ARG \
      -t "preventia/web:latest" \
      "${ENG_DIR}"
    echo "  ✓ Built"
  fi

  $DOCKER tag "preventia/web:latest" "${ECR_BASE}/preventia/web:latest"
  $DOCKER tag "preventia/web:latest" "${ECR_BASE}/preventia/web:$(git -C "${ENG_DIR}" rev-parse --short HEAD 2>/dev/null || echo 'manual')"

  echo "  Pushing to ECR…"
  $DOCKER push "${ECR_BASE}/preventia/web:latest"
  echo "  ✓ Pushed Web image"
}

wait_for_service() {
  local service_name="$1"
  echo "  Waiting for $service_name to reach RUNNING…"
  for i in $(seq 1 30); do
    STATUS=$(get_service_field "$service_name" "Status")
    SERVICE_ARN=$(get_service_field "$service_name" "ServiceArn")

    if [[ "$STATUS" == "RUNNING" ]]; then
      echo "  ✓ $service_name is RUNNING"
      return 0
    fi

    if [[ "$STATUS" == "CREATE_FAILED" || "$STATUS" == "DELETE_FAILED" ]]; then
      echo "  ✗ $service_name entered ${STATUS}"
      STATUS_REASON=$(describe_status_reason "$SERVICE_ARN")
      if [[ -n "$STATUS_REASON" && "$STATUS_REASON" != "None" ]]; then
        echo "    Status reason: $STATUS_REASON"
      fi
      if [[ -n "$SERVICE_ARN" && "$SERVICE_ARN" != "None" ]]; then
        echo "    Service ARN: $SERVICE_ARN"
        echo "    Inspect operations: aws apprunner list-operations --service-arn ${SERVICE_ARN} --region ${REGION}"
      fi
      return 1
    fi

    echo "    [$i/30] Status: $STATUS — waiting 10s…"
    sleep 10
  done
  echo "  ⚠ Timed out waiting for $service_name"
  return 1
}

case "$TARGET" in
  api)
    build_and_push_api
    wait_for_service "preventia-api"
    ;;
  web)
    build_and_push_web
    wait_for_service "preventia-web"
    ;;
  both|*)
    build_and_push_api
    build_and_push_web
    wait_for_service "preventia-api"
    wait_for_service "preventia-web"
    ;;
esac

echo ""
echo "=== Deploy complete! ==="
API_URL=$(aws apprunner list-services --region "$REGION" \
  --query "ServiceSummaryList[?ServiceName=='preventia-api'].ServiceUrl" \
  --output text 2>/dev/null || echo "pending")
WEB_URL=$(aws apprunner list-services --region "$REGION" \
  --query "ServiceSummaryList[?ServiceName=='preventia-web'].ServiceUrl" \
  --output text 2>/dev/null || echo "pending")
echo "  API: https://${API_URL}"
echo "  WEB: https://${WEB_URL}"
echo ""
echo "Run ./verify.sh to confirm health."
