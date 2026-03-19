#!/usr/bin/env bash
# =============================================================================
# 05-setup-apprunner.sh — Create App Runner services for API + Web
#
# App Runner reads image from ECR and secrets from Secrets Manager.
# Run once after ECR images are pushed (deploy.sh does the push).
# Safe to re-run — updates existing services if they exist.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/aws-profile.sh"

REGION="ap-south-1"
ACCOUNT="246599827879"
ECR_BASE="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

API_SERVICE="preventia-api"
WEB_SERVICE="preventia-web"

ENV_FILE="${SCRIPT_DIR}/.env.aws"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
APPLE_CLIENT_ID="${APPLE_CLIENT_ID:-}"
APPLE_REDIRECT_URI="${APPLE_REDIRECT_URI:-}"

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

wait_for_service_terminal_state() {
  local service_name="$1"
  local desired_status="${2:-RUNNING}"

  echo "  Waiting for ${service_name} to reach ${desired_status}…"
  for i in $(seq 1 45); do
    local status
    local service_arn
    status=$(get_service_field "$service_name" "Status")
    service_arn=$(get_service_field "$service_name" "ServiceArn")

    if [[ "$status" == "$desired_status" ]]; then
      echo "  ✓ ${service_name} is ${desired_status}"
      return 0
    fi

    if [[ "$status" == "CREATE_FAILED" || "$status" == "DELETE_FAILED" ]]; then
      echo "  ✗ ${service_name} entered ${status}"
      local status_reason
      status_reason=$(describe_status_reason "$service_arn")
      if [[ -n "$status_reason" && "$status_reason" != "None" ]]; then
        echo "    Status reason: ${status_reason}"
      fi
      if [[ -n "$service_arn" && "$service_arn" != "None" ]]; then
        echo "    Service ARN: ${service_arn}"
        echo "    Inspect operations: aws apprunner list-operations --service-arn ${service_arn} --region ${REGION}"
      fi
      return 1
    fi

    echo "    [$i/45] Status: ${status:-unknown} — waiting 10s…"
    sleep 10
  done

  echo "  ⚠ Timed out waiting for ${service_name}"
  return 1
}

# --- Fetch secrets from Secrets Manager ---
fetch_secret_value() {
  aws secretsmanager get-secret-value \
    --secret-id "$1" --region "$REGION" \
    --query SecretString --output text
}

echo "=== Fetching secrets from Secrets Manager ==="
DB_SECRET=$(fetch_secret_value "preventia/prod/db")
REDIS_SECRET=$(fetch_secret_value "preventia/prod/redis")
JWT_SECRET_VAL=$(fetch_secret_value "preventia/prod/jwt")
DAILY_SECRET=$(fetch_secret_value "preventia/prod/daily")
STREAM_SECRET=$(fetch_secret_value "preventia/prod/stream")
AWS_APP_SECRET=$(fetch_secret_value "preventia/prod/aws-app")
RAZORPAY_SECRET=$(fetch_secret_value "preventia/prod/razorpay")

# Parse JSON values (using python3 which is available on macOS)
DB_URL=$(echo "$DB_SECRET"      | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['url'])")
DB_USER=$(echo "$DB_SECRET"     | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['username'])")
DB_PASS=$(echo "$DB_SECRET"     | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['password'])")
REDIS_HOST=$(echo "$REDIS_SECRET" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['host'])")
JWT_SECRET=$(echo "$JWT_SECRET_VAL" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['secret'])")
DAILY_API_KEY=$(echo "$DAILY_SECRET" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['apiKey'])")
DAILY_WEBHOOK=$(echo "$DAILY_SECRET" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['webhookSecret'])")
STREAM_KEY=$(echo "$STREAM_SECRET" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['apiKey'])")
STREAM_SEC=$(echo "$STREAM_SECRET" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['apiSecret'])")
S3_BUCKET=$(echo "$AWS_APP_SECRET" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['s3Bucket'])")
AWS_KEY=$(echo "$AWS_APP_SECRET" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['accessKeyId'])")
AWS_SEC=$(echo "$AWS_APP_SECRET" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['secretAccessKey'])")
RAZORPAY_KEY=$(echo "$RAZORPAY_SECRET" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['apiKey'])")
RAZORPAY_SEC=$(echo "$RAZORPAY_SECRET" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['apiSecret'])")

JWT_SECRET_BYTES=$(printf '%s' "$JWT_SECRET" | wc -c | tr -d ' ')
if [[ "$JWT_SECRET_BYTES" -lt 32 ]]; then
  echo "  ERROR: preventia/prod/jwt is too short for HS256 (${JWT_SECRET_BYTES} bytes)."
  echo "  Update JWT_SECRET in .env.aws, rerun ./04-setup-secrets.sh, then rerun this script."
  exit 1
fi

if [[ -z "$DB_USER" || "$DB_USER" == "None" ]]; then
  echo "  ERROR: preventia/prod/db is missing username."
  exit 1
fi

# --- Create IAM role for App Runner to pull from ECR ---
echo ""
echo "=== Setting up App Runner IAM role ==="
ROLE_NAME="AppRunnerECRAccessRole-Preventia"
ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}"

if ! aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document '{
      "Version":"2012-10-17",
      "Statement":[{
        "Effect":"Allow",
        "Principal":{"Service":"build.apprunner.amazonaws.com"},
        "Action":"sts:AssumeRole"
      }]
    }' > /dev/null
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
  echo "  ✓ Created IAM role $ROLE_NAME"
else
  echo "  ✓ IAM role $ROLE_NAME already exists"
fi

# --- Write App Runner config for API service ---
echo ""
echo "=== Creating App Runner — API service ==="

API_TAG="latest"
API_IMAGE="${ECR_BASE}/preventia/api:${API_TAG}"

# VPC connector — allows App Runner to reach RDS + ElastiCache inside the VPC
VPC_CONNECTOR_ARN=$(aws apprunner list-vpc-connectors \
  --region "$REGION" --no-cli-pager \
  --query "VpcConnectors[?VpcConnectorName=='preventia-vpc-connector' && Status=='ACTIVE'].VpcConnectorArn" \
  --output text 2>/dev/null)

if [[ -z "$VPC_CONNECTOR_ARN" || "$VPC_CONNECTOR_ARN" == "None" ]]; then
  echo "  ERROR: VPC connector 'preventia-vpc-connector' not found or not ACTIVE."
  echo "  Run: aws apprunner create-vpc-connector ... (see README)"
  exit 1
fi
echo "  VPC Connector: $VPC_CONNECTOR_ARN"

cat > /tmp/api-apprunner.json << EOF
{
  "ServiceName": "${API_SERVICE}",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "${API_IMAGE}",
        "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "JAVA_OPTS":                       "-Xms256m -Xmx384m",
          "SPRING_DATASOURCE_URL":           "${DB_URL}",
          "SPRING_DATASOURCE_USERNAME":      "${DB_USER}",
          "SPRING_DATASOURCE_PASSWORD":      "${DB_PASS}",
          "SPRING_DATA_REDIS_HOST":          "${REDIS_HOST}",
          "SPRING_DATA_REDIS_PORT":          "6379",
          "JWT_SECRET":                      "${JWT_SECRET}",
          "JWT_EXPIRY_SECONDS":              "86400",
          "SPRING_FLYWAY_ENABLED":           "true",
          "DAILY_API_KEY":                   "${DAILY_API_KEY}",
          "DAILY_WEBHOOK_SECRET":            "${DAILY_WEBHOOK}",
          "STREAM_API_KEY":                  "${STREAM_KEY}",
          "STREAM_API_SECRET":               "${STREAM_SEC}",
          "AWS_ACCESS_KEY_ID":               "${AWS_KEY}",
          "AWS_SECRET_ACCESS_KEY":           "${AWS_SEC}",
          "AWS_REGION":                      "ap-south-1",
          "S3_BUCKET_NAME":                  "${S3_BUCKET}",
          "RAZORPAY_API_KEY":                "${RAZORPAY_KEY}",
          "RAZORPAY_API_SECRET":             "${RAZORPAY_SEC}",
          "GOOGLE_CLIENT_ID":                "${GOOGLE_CLIENT_ID}",
          "APPLE_CLIENT_ID":                 "${APPLE_CLIENT_ID}",
          "APP_CORS_ALLOWED_ORIGIN_PATTERNS":"http://localhost:3000,http://127.0.0.1:3000,http://localhost:19006,http://127.0.0.1:19006,http://localhost:8081,http://127.0.0.1:8081,http://localhost:8080,https://*.ap-south-1.awsapprunner.com",
          "LOGGING_LEVEL_ROOT":              "INFO"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AuthenticationConfiguration": {
      "AccessRoleArn": "${ROLE_ARN}"
    },
    "AutoDeploymentsEnabled": true
  },
  "InstanceConfiguration": {
    "Cpu": "0.5 vCPU",
    "Memory": "1 GB"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/actuator/health/liveness",
    "Interval": 20,
    "Timeout": 10,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 10
  },
  "NetworkConfiguration": {
    "EgressConfiguration": {
      "EgressType": "VPC",
      "VpcConnectorArn": "${VPC_CONNECTOR_ARN}"
    }
  },
  "Tags": [
    {"Key": "project", "Value": "preventia"},
    {"Key": "component", "Value": "api"}
  ]
}
EOF

if get_service_field "${API_SERVICE}" "ServiceArn" | grep -q arn; then
  SERVICE_ARN=$(get_service_field "${API_SERVICE}" "ServiceArn")
  API_STATUS=$(get_service_field "${API_SERVICE}" "Status")

  if [[ "$API_STATUS" == "CREATE_FAILED" ]]; then
    echo "  → Deleting failed API service before recreate…"
    aws apprunner delete-service \
      --service-arn "$SERVICE_ARN" \
      --region "$REGION" > /dev/null

    for i in $(seq 1 60); do
      CURRENT_ARN=$(aws apprunner list-services --region "$REGION" \
        --query "ServiceSummaryList[?ServiceName=='${API_SERVICE}'].ServiceArn" \
        --output text 2>/dev/null || true)
      if [[ -z "$CURRENT_ARN" || "$CURRENT_ARN" == "None" ]]; then
        echo "  ✓ Failed API service deleted"
        SERVICE_ARN=""
        break
      fi
      echo "    [$i/60] Waiting for delete to finish…"
      sleep 10
    done
  fi

  if [[ -n "${SERVICE_ARN:-}" && "$SERVICE_ARN" != "None" ]]; then
    echo "  → Updating existing API service…"
    aws apprunner update-service \
      --service-arn "$SERVICE_ARN" \
      --source-configuration "$(cat /tmp/api-apprunner.json | python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d['SourceConfiguration']))")" \
      --instance-configuration "$(cat /tmp/api-apprunner.json | python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d['InstanceConfiguration']))")" \
      --health-check-configuration "$(cat /tmp/api-apprunner.json | python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d['HealthCheckConfiguration']))")" \
      --network-configuration "$(cat /tmp/api-apprunner.json | python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d['NetworkConfiguration']))")" \
      --region "$REGION" > /dev/null
    echo "  ✓ API service updated"
  else
    echo "  → Creating new API service…"
    API_ARN=$(aws apprunner create-service \
      --cli-input-json "$(cat /tmp/api-apprunner.json)" \
      --region "$REGION" \
      --query 'Service.ServiceArn' --output text)
    echo "  ✓ API service created: $API_ARN"
  fi
else
  echo "  → Creating new API service…"
  API_ARN=$(aws apprunner create-service \
    --cli-input-json "$(cat /tmp/api-apprunner.json)" \
    --region "$REGION" \
    --query 'Service.ServiceArn' --output text)
  echo "  ✓ API service created: $API_ARN"
fi

wait_for_service_terminal_state "$API_SERVICE" "RUNNING"

# Get the API URL for the Web service env
API_URL=$(get_service_field "${API_SERVICE}" "ServiceUrl")
echo "  API URL: https://${API_URL}"

# --- Create App Runner config for Web service ---
echo ""
echo "=== Creating App Runner — Web (Next.js) service ==="

WEB_TAG="latest"
WEB_IMAGE="${ECR_BASE}/preventia/web:${WEB_TAG}"

cat > /tmp/web-apprunner.json << EOF
{
  "ServiceName": "${WEB_SERVICE}",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "${WEB_IMAGE}",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV":                        "production",
          "NEXT_PUBLIC_API_BASE_URL":        "https://${API_URL}",
          "STREAM_API_KEY":                  "${STREAM_KEY}",
          "GOOGLE_CLIENT_ID":                "${GOOGLE_CLIENT_ID}",
          "APPLE_CLIENT_ID":                 "${APPLE_CLIENT_ID}",
          "APPLE_REDIRECT_URI":              "${APPLE_REDIRECT_URI}"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AuthenticationConfiguration": {
      "AccessRoleArn": "${ROLE_ARN}"
    },
    "AutoDeploymentsEnabled": true
  },
  "InstanceConfiguration": {
    "Cpu": "0.5 vCPU",
    "Memory": "1 GB"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/api/health",
    "Interval": 15,
    "Timeout": 10,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  },
  "Tags": [
    {"Key": "project", "Value": "preventia"},
    {"Key": "component", "Value": "web"}
  ]
}
EOF

if get_service_field "${WEB_SERVICE}" "ServiceArn" | grep -q arn; then
  WEB_ARN=$(get_service_field "${WEB_SERVICE}" "ServiceArn")
  WEB_STATUS=$(get_service_field "${WEB_SERVICE}" "Status")

  if [[ "$WEB_STATUS" == "CREATE_FAILED" ]]; then
    echo "  → Deleting failed Web service before recreate…"
    aws apprunner delete-service \
      --service-arn "$WEB_ARN" \
      --region "$REGION" > /dev/null

    for i in $(seq 1 60); do
      CURRENT_ARN=$(aws apprunner list-services --region "$REGION" \
        --query "ServiceSummaryList[?ServiceName=='${WEB_SERVICE}'].ServiceArn" \
        --output text 2>/dev/null || true)
      if [[ -z "$CURRENT_ARN" || "$CURRENT_ARN" == "None" ]]; then
        echo "  ✓ Failed Web service deleted"
        WEB_ARN=""
        break
      fi
      echo "    [$i/60] Waiting for delete to finish…"
      sleep 10
    done
  fi

  if [[ -n "${WEB_ARN:-}" && "$WEB_ARN" != "None" ]]; then
    echo "  → Updating existing Web service…"
    aws apprunner update-service \
      --service-arn "$WEB_ARN" \
      --source-configuration "$(cat /tmp/web-apprunner.json | python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d['SourceConfiguration']))")" \
      --instance-configuration "$(cat /tmp/web-apprunner.json | python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d['InstanceConfiguration']))")" \
      --health-check-configuration "$(cat /tmp/web-apprunner.json | python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d['HealthCheckConfiguration']))")" \
      --region "$REGION" > /dev/null
    echo "  ✓ Web service updated"
  else
    echo "  → Creating new Web service…"
    WEB_ARN=$(aws apprunner create-service \
      --cli-input-json "$(cat /tmp/web-apprunner.json)" \
      --region "$REGION" \
      --query 'Service.ServiceArn' --output text)
    echo "  ✓ Web service created: $WEB_ARN"
  fi
else
  echo "  → Creating new Web service…"
  WEB_ARN=$(aws apprunner create-service \
    --cli-input-json "$(cat /tmp/web-apprunner.json)" \
    --region "$REGION" \
    --query 'Service.ServiceArn' --output text)
  echo "  ✓ Web service created: $WEB_ARN"
fi

wait_for_service_terminal_state "$WEB_SERVICE" "RUNNING"

WEB_URL=$(get_service_field "${WEB_SERVICE}" "ServiceUrl")

echo ""
echo "================================================="
echo "✓ App Runner services deployed!"
echo ""
echo "  API:  https://${API_URL}"
echo "  WEB:  https://${WEB_URL}"
echo ""
echo "  Services are configured and waited to terminal state."
echo "  Check: aws apprunner list-services --region ${REGION}"
echo "================================================="
