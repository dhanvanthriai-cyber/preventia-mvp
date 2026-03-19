#!/usr/bin/env bash
# rebuild-and-restart.sh — Rebuild Spring Boot image and restart the app container
# Run this directly in your own terminal:
#   cd /Users/satishjonnala/Documents/Preventia/preventia-mvp/eng
#   bash rebuild-and-restart.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load env vars
set -a
source .env
set +a

DB_NAME="${DB_NAME:-preventia_db}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-preventia-postgres}"

echo "================================================"
echo " Preventia — Rebuild & Restart"
echo "================================================"
echo ""

# ── Step 1: Build ────────────────────────────────────
echo "▶ Step 1/5: Building new image (this takes ~3-5 min)..."
podman build \
  --build-arg CACHE_BUST="$(date +%s)" \
  -t localhost/eng_app:latest \
  -f Dockerfile \
  .
echo "✅ Image built: localhost/eng_app:latest"
echo ""

# ── Step 2: Stop old container ───────────────────────
echo "▶ Step 2/5: Stopping old container..."
podman container stop preventia-app 2>/dev/null || true
podman container rm   preventia-app 2>/dev/null || true
echo "✅ Old container removed"
echo ""

# ── Step 3: Fix Flyway V11 checksum in DB ────────────
# We registered V11 manually with checksum=-1 as a placeholder.
# The real file checksum is -1867127128. Update it so Flyway validates cleanly.
echo "▶ Step 3/5: Patching Flyway V11 checksum in database..."
podman exec "${POSTGRES_CONTAINER}" psql -U dhan_dev -d "${DB_NAME}" -c \
  "UPDATE flyway_schema_history
   SET checksum = -1867127128
   WHERE version = '11' AND checksum != -1867127128;
   SELECT version, description, checksum FROM flyway_schema_history WHERE version='11';"
echo "✅ Flyway V11 checksum corrected"
echo ""

# ── Step 4: Start new container ──────────────────────
echo "▶ Step 4/5: Starting new container..."
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
echo "✅ Container started"
echo ""

# ── Step 5: Health check + admin login test ───────────
echo "▶ Step 5/5: Waiting for Spring Boot to be ready (up to 90s)..."
HEALTHY=false
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "✅ Backend is UP"
    HEALTHY=true
    break
  fi
  echo "   attempt $i/30 — waiting 3s..."
  sleep 3
done

if [ "$HEALTHY" = false ]; then
  echo "⚠️  Backend did not start in 90s"
  echo "Run: podman logs preventia-app | tail -40"
  exit 1
fi
echo ""

echo "▶ Testing admin login..."
RESULT=$(curl -s -w "\nHTTP:%{http_code}" \
  -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@preventia.local","password":"Admin@1234"}')

STATUS=$(echo "$RESULT" | grep "^HTTP:" | cut -d: -f2)
BODY=$(echo "$RESULT" | grep -v "^HTTP:")

if [ "$STATUS" = "200" ]; then
  echo "✅ Admin login SUCCESS (HTTP 200)"
  echo "$BODY" | python3 -c "
import sys, json, base64
d = json.load(sys.stdin)
print('  Role:', d.get('role','?'))
tok = d.get('accessToken','')
if tok:
    b64 = tok.split('.')[1]
    b64 += '=' * (4 - len(b64) % 4)
    p = json.loads(base64.b64decode(b64))
    print('  JWT sub:', p.get('sub','?'), '| role:', p.get('role','?'))
" 2>/dev/null || true
  echo ""
  echo "================================================"
  echo " Admin account ready!"
  echo "   URL:      http://localhost:3000/login?role=ADMIN"
  echo "   Email:    admin@preventia.local"
  echo "   Password: Admin@1234"
  echo "================================================"
else
  echo "❌ Login FAILED (HTTP $STATUS): $BODY"
  echo "Run: podman logs preventia-app 2>&1 | grep -E 'ERROR|ADMIN|enum' | tail -10"
fi
