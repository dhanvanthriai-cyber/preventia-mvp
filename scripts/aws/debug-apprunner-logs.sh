#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/aws-profile.sh"

REGION="ap-south-1"
SERVICE_NAME="${1:-preventia-api}"
EVENT_LIMIT="${2:-120}"

service_field() {
  local service_name="$1"
  local field="$2"
  aws apprunner list-services --region "$REGION" \
    --query "ServiceSummaryList[?ServiceName=='${service_name}'].${field}" \
    --output text 2>/dev/null || true
}

print_log_group() {
  local service_name="$1"
  local service_id="$2"
  local group_kind="$3"
  local limit="$4"
  local log_group="/aws/apprunner/${service_name}/${service_id}/${group_kind}"
  local display_name

  case "$group_kind" in
    service) display_name="Service" ;;
    application) display_name="Application" ;;
    *) display_name="$group_kind" ;;
  esac

  echo ""
  echo "=== ${display_name} logs ==="

  local group_exists
  group_exists=$(aws logs describe-log-groups \
    --log-group-name-prefix "$log_group" \
    --region "$REGION" \
    --query "length(logGroups[?logGroupName=='${log_group}'])" \
    --output text 2>/dev/null || echo "0")

  if [[ "$group_exists" == "0" || "$group_exists" == "None" ]]; then
    echo "  No ${group_kind} log group found at ${log_group}"
    if [[ "$group_kind" == "application" ]]; then
      echo "  This usually means the container died before application log forwarding initialized."
    fi
    return 0
  fi

  local stream_name
  stream_name=$(aws logs describe-log-streams \
    --log-group-name "$log_group" \
    --region "$REGION" \
    --order-by LastEventTime \
    --descending \
    --query 'logStreams[0].logStreamName' \
    --output text 2>/dev/null || true)

  if [[ -z "$stream_name" || "$stream_name" == "None" ]]; then
    echo "  Log group exists but has no streams yet."
    return 0
  fi

  echo "  Stream: ${stream_name}"
  aws logs get-log-events \
    --log-group-name "$log_group" \
    --log-stream-name "$stream_name" \
    --limit "$limit" \
    --region "$REGION"
}

SERVICE_ID="$(service_field "$SERVICE_NAME" "ServiceId")"
SERVICE_ARN="$(service_field "$SERVICE_NAME" "ServiceArn")"
SERVICE_STATUS="$(service_field "$SERVICE_NAME" "Status")"
SERVICE_URL="$(service_field "$SERVICE_NAME" "ServiceUrl")"

if [[ -z "$SERVICE_ID" || "$SERVICE_ID" == "None" ]]; then
  echo "ERROR: App Runner service '${SERVICE_NAME}' was not found in ${REGION}."
  exit 1
fi

echo "=== App Runner debug ==="
echo "  Service: ${SERVICE_NAME}"
echo "  Region:  ${REGION}"
echo "  ID:      ${SERVICE_ID}"
echo "  ARN:     ${SERVICE_ARN}"
echo "  Status:  ${SERVICE_STATUS}"
echo "  URL:     https://${SERVICE_URL}"
echo ""
echo "=== Service describe ==="
aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --region "$REGION" \
  --query 'Service.{Status:Status,StatusReason:StatusReason,ServiceUrl:ServiceUrl,CreatedAt:CreatedAt,UpdatedAt:UpdatedAt}' \
  --output yaml

echo ""
echo "=== Recent operations ==="
aws apprunner list-operations \
  --service-arn "$SERVICE_ARN" \
  --region "$REGION" \
  --query 'OperationSummaryList[].{Id:Id,Type:Type,Status:Status,StartedAt:StartedAt,EndedAt:EndedAt}' \
  --output table

print_log_group "$SERVICE_NAME" "$SERVICE_ID" "service" "$EVENT_LIMIT"
print_log_group "$SERVICE_NAME" "$SERVICE_ID" "application" "$EVENT_LIMIT"
