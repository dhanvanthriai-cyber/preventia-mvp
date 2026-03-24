#!/usr/bin/env bash
# fix-daily-ssl.sh — Import Amazon CA certs into the running preventia-app
# container's JVM trust store WITHOUT a full rebuild.
#
# Run this once from your Mac:
#   bash scripts/app/fix-daily-ssl.sh
#
# The fix survives container restarts (as long as the same container is reused).
# For a permanent fix, run rebuild-and-restart.sh which bakes the certs into the image.

set -euo pipefail

CONTAINER="preventia-app"
STOREPASS="changeit"

echo "=== Daily.co SSL Fix (live container patch) ==="
echo ""

# Check container is running
if ! podman ps --format "{{.Names}}" | grep -q "^${CONTAINER}$"; then
  echo "❌ Container '${CONTAINER}' is not running."
  echo "   Start it first: bash scripts/app/start-app.sh"
  exit 1
fi

echo "▶ Finding JVM cacerts inside container..."
JAVA_HOME=$(podman exec "$CONTAINER" sh -c 'dirname $(dirname $(readlink -f $(which java)))')
CACERTS="$JAVA_HOME/lib/security/cacerts"
echo "  JAVA_HOME : $JAVA_HOME"
echo "  cacerts   : $CACERTS"
echo ""

# Copy the bundled PEM files into the container
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "▶ Copying Amazon CA certs into container..."
podman cp "$REPO_ROOT/eng/src/main/resources/certs/amazon-rsa-2048-m03.pem" \
          "${CONTAINER}:/tmp/amazon-rsa-2048-m03.pem"
podman cp "$REPO_ROOT/eng/src/main/resources/certs/amazon-root-ca-1.pem" \
          "${CONTAINER}:/tmp/amazon-root-ca-1.pem"
echo "  ✅ Certs copied"
echo ""

echo "▶ Importing Amazon RSA 2048 M03 (intermediate)..."
podman exec -u root "$CONTAINER" keytool -importcert -noprompt \
  -keystore "$CACERTS" \
  -storepass "$STOREPASS" \
  -alias amazon-rsa-2048-m03 \
  -file /tmp/amazon-rsa-2048-m03.pem 2>&1 | grep -v "^Warning" || true
echo "  ✅ Done"

echo "▶ Importing Amazon Root CA 1..."
podman exec -u root "$CONTAINER" keytool -importcert -noprompt \
  -keystore "$CACERTS" \
  -storepass "$STOREPASS" \
  -alias amazon-root-ca-1 \
  -file /tmp/amazon-root-ca-1.pem 2>&1 | grep -v "^Warning" || true
echo "  ✅ Done"
echo ""

echo "▶ Cleaning up temp files..."
podman exec -u root "$CONTAINER" rm -f /tmp/amazon-rsa-2048-m03.pem /tmp/amazon-root-ca-1.pem
echo ""

echo "▶ Restarting Spring Boot inside container (sends SIGTERM → process auto-restarts)..."
# The container uses ENTRYPOINT ["sh", "-c", "java ... -jar app.jar"]
# Killing the JVM process causes the container to exit, then --restart=unless-stopped
# brings it back up automatically with the updated cacerts.
podman exec "$CONTAINER" sh -c 'kill -15 $(pgrep -f "app.jar") 2>/dev/null || true'
echo "  Waiting for container to restart..."
sleep 5

# Wait for health
for i in $(seq 1 20); do
  if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "  ✅ Backend is UP"
    break
  fi
  echo "  attempt $i/20 — waiting..."
  sleep 3
done

echo ""
echo "=== Done! Test by booking an appointment. ==="
echo "If you still see PKIX errors, run: bash scripts/app/rebuild-and-restart.sh"
