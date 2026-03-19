#!/usr/bin/env bash
# =============================================================================
# verify.sh — Health check both App Runner services post-deploy
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/aws-profile.sh"

REGION="ap-south-1"

get_service_field() {
  local service_name="$1"
  local field="$2"
  aws apprunner list-services --region "$REGION" \
    --query "ServiceSummaryList[?ServiceName=='${service_name}'].${field}" \
    --output text
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

echo "=== Verifying Preventia deployments ==="
echo ""

API_ARN=$(get_service_field "preventia-api" "ServiceArn")
API_URL=$(get_service_field "preventia-api" "ServiceUrl")
API_STATUS=$(get_service_field "preventia-api" "Status")
WEB_ARN=$(get_service_field "preventia-web" "ServiceArn")
WEB_URL=$(get_service_field "preventia-web" "ServiceUrl")
WEB_STATUS=$(get_service_field "preventia-web" "Status")

echo "  API: https://${API_URL}"
echo "  API status: ${API_STATUS}"
echo "  WEB: https://${WEB_URL}"
echo "  WEB status: ${WEB_STATUS}"
echo ""

# Check API health
if [[ "$API_STATUS" == "RUNNING" ]]; then
  echo "  Checking API /actuator/health…"
  API_HEALTH=$(curl -sf "https://${API_URL}/actuator/health" 2>/dev/null || echo '{"status":"DOWN"}')
  echo "    $API_HEALTH"

  if echo "$API_HEALTH" | grep -q '"status":"UP"'; then
    echo "  ✓ API is healthy"
  else
    echo "  ✗ API health check FAILED"
    API_REASON=$(describe_status_reason "$API_ARN")
    if [[ -n "$API_REASON" && "$API_REASON" != "None" ]]; then
      echo "    Status reason: $API_REASON"
    fi
    echo "    Inspect operations: aws apprunner list-operations --service-arn ${API_ARN} --region ${REGION}"
  fi
else
  echo "  Skipping API health check because service is not RUNNING"
  API_REASON=$(describe_status_reason "$API_ARN")
  if [[ -n "$API_REASON" && "$API_REASON" != "None" ]]; then
    echo "    Status reason: $API_REASON"
  fi
  echo "    Inspect operations: aws apprunner list-operations --service-arn ${API_ARN} --region ${REGION}"
fi

echo ""

# Check Web health
if [[ "$WEB_STATUS" == "RUNNING" ]]; then
  echo "  Checking Web /api/health…"
  WEB_HEALTH=$(curl -sf "https://${WEB_URL}/api/health" 2>/dev/null || echo 'DOWN')
  if [[ "$WEB_HEALTH" != "DOWN" ]]; then
    echo "  ✓ Web is healthy"
  else
    echo "  ✗ Web health check FAILED"
    WEB_REASON=$(describe_status_reason "$WEB_ARN")
    if [[ -n "$WEB_REASON" && "$WEB_REASON" != "None" ]]; then
      echo "    Status reason: $WEB_REASON"
    fi
  fi
else
  echo "  Skipping Web health check because service is not RUNNING"
  WEB_REASON=$(describe_status_reason "$WEB_ARN")
  if [[ -n "$WEB_REASON" && "$WEB_REASON" != "None" ]]; then
    echo "    Status reason: $WEB_REASON"
  fi
fi

echo ""
echo "=== App Runner service statuses ==="
aws apprunner list-services --region "$REGION" \
  --query 'ServiceSummaryList[*].{Name:ServiceName,Status:Status,URL:ServiceUrl}' \
  --output table
