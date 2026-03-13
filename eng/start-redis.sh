#!/usr/bin/env zsh
# =============================================================
# start-redis.sh
# Starts the Redis container via Podman directly.
# Use this only if you want Redis standalone (without full
# podman compose up). For the full stack use restart.sh.
#
# Usage:  zsh start-redis.sh
# =============================================================

set -euo pipefail

# ── 1. Verify Podman machine is running ──────────────────────
echo "==> Checking Podman machine..."
if ! podman machine list 2>/dev/null | grep -q "Running"; then
  echo "❌  Podman machine is not running."
  echo "    Run:  podman machine start"
  exit 1
fi
echo "✅  Podman machine is running"

# ── 2. Pull Redis image if missing ───────────────────────────
echo ""
echo "==> Checking Redis image..."
if ! podman image inspect redis:7-alpine >/dev/null 2>&1; then
  echo "    Pulling redis:7-alpine ..."
  podman pull redis:7-alpine
else
  echo "    redis:7-alpine already present, skipping pull."
fi

# ── 3. Start Redis container ─────────────────────────────────
echo ""
echo "==> Starting dhanvanthri-redis container..."

if podman ps -a --format '{{.Names}}' | grep -q '^dhanvanthri-redis$'; then
  STATE=$(podman inspect --format '{{.State.Status}}' dhanvanthri-redis)
  if [[ "$STATE" == "running" ]]; then
    echo "    Container already running — nothing to do."
  else
    echo "    Container exists but is stopped — starting it..."
    podman start dhanvanthri-redis
  fi
else
  podman run -d \
    --name dhanvanthri-redis \
    --restart unless-stopped \
    -p 6379:6379 \
    -v redis_data:/data \
    --memory 256m \
    --health-cmd "redis-cli ping" \
    --health-interval 10s \
    --health-timeout 3s \
    --health-retries 5 \
    --health-start-period 10s \
    redis:7-alpine
  echo "    Container started."
fi

# ── 4. Health check ──────────────────────────────────────────
echo ""
echo "==> Waiting for Redis to be ready..."
for i in {1..10}; do
  if podman exec dhanvanthri-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "✅  Redis is up and responding to PING."
    break
  fi
  echo "    Attempt $i/10 — waiting..."
  sleep 2
done

# ── 5. Summary ───────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Running containers:"
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "============================================"
echo ""
echo "Next: cd eng && podman compose up -d"
