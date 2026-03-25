#!/usr/bin/env bash
# fix-daily-ssl.sh — Import Daily.co-related CA certs into the running
# preventia-app container's JVM trust store WITHOUT a full rebuild.
#
# Run this once from your Mac:
#   bash scripts/app/fix-daily-ssl.sh
#
# The fix survives container restarts (as long as the same container is reused).
# For a permanent fix, run rebuild-and-restart.sh which bakes the certs into the image.
#
# Why this script exists:
# - Some networks intercept outbound TLS (for example Cisco Secure Access).
# - In those cases, api.daily.co does NOT present the normal Daily/Amazon chain.
# - Importing only Amazon certs will still fail with PKIX inside the container.
#
# This script imports BOTH:
#   1. The repo's bundled fallback certs for the direct Daily/Amazon chain
#   2. The live CA chain currently presented for api.daily.co on this machine

set -euo pipefail

CONTAINER="preventia-app"
STOREPASS="changeit"
TLS_HOST="${TLS_HOST:-api.daily.co}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

copy_into_container() {
  local src="$1"
  local dest="$2"
  podman exec -i "$CONTAINER" sh -lc "cat > '$dest'" < "$src"
}

import_cert() {
  local src="$1"
  local alias_name="$2"
  local dest="/tmp/${alias_name}.pem"

  copy_into_container "$src" "$dest"
  podman exec -u root "$CONTAINER" keytool -importcert -noprompt \
    -keystore "$CACERTS" \
    -storepass "$STOREPASS" \
    -alias "$alias_name" \
    -file "$dest" 2>&1 | grep -v "^Warning" || true
}

echo "▶ Importing bundled Daily/Amazon fallback certs..."
import_cert "$REPO_ROOT/eng/src/main/resources/certs/amazon-rsa-2048-m03.pem" "amazon-rsa-2048-m03"
import_cert "$REPO_ROOT/eng/src/main/resources/certs/amazon-root-ca-1.pem" "amazon-root-ca-1"
echo "  ✅ Bundled fallback certs imported"
echo ""

echo "▶ Fetching live certificate chain for ${TLS_HOST}..."
openssl s_client -showcerts -servername "$TLS_HOST" -connect "${TLS_HOST}:443" </dev/null \
  > "$TMP_DIR/openssl.out" 2> "$TMP_DIR/openssl.err"

awk -v outdir="$TMP_DIR" '
  /-----BEGIN CERTIFICATE-----/ {
    file = sprintf("%s/chain-%02d.pem", outdir, ++count)
  }
  file != "" {
    print >> file
  }
  /-----END CERTIFICATE-----/ {
    close(file)
    file = ""
  }
' "$TMP_DIR/openssl.out"

CHAIN_FILES=("$TMP_DIR"/chain-*.pem)
if [[ ! -e "${CHAIN_FILES[0]}" ]]; then
  echo "❌ Could not extract any certificates from openssl output."
  echo "OpenSSL stderr:"
  sed -n '1,120p' "$TMP_DIR/openssl.err"
  exit 1
fi

echo "  Extracted ${#CHAIN_FILES[@]} certificate(s) from the live chain"
echo ""

if (( ${#CHAIN_FILES[@]} > 1 )); then
  echo "▶ Importing live CA certificates presented for ${TLS_HOST}..."
  for pem in "${CHAIN_FILES[@]:1}"; do
    subject="$(openssl x509 -in "$pem" -noout -subject | sed 's/^subject=//')"
    fingerprint="$(openssl x509 -in "$pem" -noout -fingerprint -sha256 | sed 's/.*=//' | tr -d ':')"
    short_fp="${fingerprint:0:12}"
    alias_name="daily-live-${short_fp}"
    echo "  • $subject"
    import_cert "$pem" "$alias_name"
  done
  echo "  ✅ Live CA chain imported"
  echo ""
else
  echo "▶ Live chain contained only the leaf certificate; no extra CA certs to import."
  echo ""
fi

echo "▶ Cleaning up temp files..."
podman exec -u root "$CONTAINER" sh -lc 'rm -f /tmp/amazon-rsa-2048-m03.pem /tmp/amazon-root-ca-1.pem /tmp/daily-live-*.pem'
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
