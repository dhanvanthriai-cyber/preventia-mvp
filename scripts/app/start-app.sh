#!/usr/bin/env bash
# start-app.sh — Start the preventia-app container with all env vars from .env
# Usage: ./start-app.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env
set -a
# shellcheck disable=SC1091
source .env
set +a

DB_NAME="${DB_NAME:-preventia_db}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-preventia-postgres}"
REDIS_CONTAINER="${REDIS_CONTAINER:-preventia-redis}"

echo "=== Preventia App Launcher ==="
echo "APP_ADMIN_BOOTSTRAP_SECRET = [${APP_ADMIN_BOOTSTRAP_SECRET}]"
echo "JWT_SECRET                 = [${JWT_SECRET:0:10}...redacted]"
echo ""

# Remove any old container
podman container rm -f preventia-app 2>/dev/null || true

echo "Starting preventia-app..."
podman run -d \
  --name preventia-app \
  --network eng_default \
  --restart unless-stopped \
  -p 8080:8080 \
  -m 1024m \
  -e "JAVA_OPTS=-Xms256m -Xmx768m" \
  -e "SPRING_DATASOURCE_URL=jdbc:postgresql://preventia-postgres:5432/${DB_NAME}" \
  -e "SPRING_DATASOURCE_USERNAME=dhan_dev" \
  -e "SPRING_DATASOURCE_PASSWORD=${POSTGRES_PASSWORD}" \
  -e "SPRING_DATA_REDIS_HOST=preventia-redis" \
  -e "SPRING_DATA_REDIS_PORT=6379" \
  -e "JWT_SECRET=${JWT_SECRET}" \
  -e "JWT_EXPIRY_SECONDS=${JWT_EXPIRY_SECONDS:-86400}" \
  -e "SPRING_FLYWAY_ENABLED=true" \
  -e "DAILY_API_KEY=${DAILY_API_KEY:-STUB}" \
  -e "DAILY_WEBHOOK_SECRET=${DAILY_WEBHOOK_SECRET:-STUB}" \
  -e "AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-STUB}" \
  -e "AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-STUB}" \
  -e "AWS_REGION=${AWS_REGION:-ap-south-1}" \
  -e "S3_BUCKET_NAME=${S3_BUCKET_NAME:-preventia-mvp-prescriptions}" \
  -e "STREAM_API_KEY=${STREAM_API_KEY:-STUB_KEY}" \
  -e "STREAM_API_SECRET=${STREAM_API_SECRET:-STUB_SECRET}" \
  -e "STRIPE_API_KEY=${STRIPE_API_KEY:-STUB}" \
  -e "RAZORPAY_API_KEY=${RAZORPAY_API_KEY:-STUB}" \
  -e "RAZORPAY_API_SECRET=${RAZORPAY_API_SECRET:-STUB}" \
  -e "APP_ADMIN_BOOTSTRAP_SECRET=${APP_ADMIN_BOOTSTRAP_SECRET}" \
  -e "LOGGING_LEVEL_ROOT=${LOG_LEVEL:-INFO}" \
  localhost/eng_app:latest

echo ""
echo "Container started. Waiting for Spring Boot to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "✅ Backend is UP at http://localhost:8080"
    echo ""
    echo "=== Next: Create admin account ==="
    echo "Run this curl command:"
    echo ""
    echo "curl -s -X POST http://localhost:8080/api/v1/auth/bootstrap-admin \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -H 'X-Admin-Bootstrap-Secret: ${APP_ADMIN_BOOTSTRAP_SECRET}' \\"
    echo "  -d '{\"name\":\"Platform Admin\",\"email\":\"admin@preventia.local\",\"password\":\"Admin@1234\"}' | python3 -m json.tool"
    exit 0
  fi
  echo "  Attempt $i/30 — waiting..."
  sleep 3
done
echo "⚠️  Backend did not become healthy in 90s. Check logs: podman logs preventia-app"
