#!/usr/bin/env zsh
# =============================================================
# restart.sh  —  Full backend restart for local dev
# Uses: Podman Desktop (macOS) + podman compose
#
# Usage:
#   zsh restart.sh          # rebuild app + restart all services
#   zsh restart.sh --infra  # restart only postgres + redis (no app rebuild)
#   zsh restart.sh --logs   # tail logs after startup
# =============================================================

set -euo pipefail
SCRIPT_DIR=${0:a:h}   # absolute path to the eng/ directory
cd "$SCRIPT_DIR"

REBUILD=true
TAIL_LOGS=false
for arg in "$@"; do
  case $arg in
    --infra)  REBUILD=false ;;
    --logs)   TAIL_LOGS=true ;;
  esac
done

# ── 1. Verify Podman machine is running ──────────────────────
echo "\n🔌  Checking Podman machine..."
if ! podman machine list 2>/dev/null | grep -q "Running"; then
  echo "❌  Podman machine is not running."
  echo "    Run:  podman machine start"
  exit 1
fi
echo "    ✅  Podman machine is running"

# ── 2. Verify podman compose is available ───────────────────
if ! command -v podman-compose &>/dev/null && ! podman compose version &>/dev/null 2>&1; then
  echo "❌  podman compose not found."
  echo "    Install via:  pip3 install podman-compose"
  echo "    Or use Podman Desktop which bundles it."
  exit 1
fi

# Prefer the built-in 'podman compose' (Podman v4.7+) over podman-compose
COMPOSE_CMD="podman compose"
command -v podman-compose &>/dev/null && COMPOSE_CMD="podman-compose"
podman compose version &>/dev/null 2>&1 && COMPOSE_CMD="podman compose"

echo "    ✅  Using: $COMPOSE_CMD"

# ── 3. Stop & remove existing Preventia containers ────────
echo "\n🛑  Stopping existing containers..."
$COMPOSE_CMD down --remove-orphans 2>/dev/null || true

# Also clean up any manually-started redis container
podman rm -f preventia-redis 2>/dev/null || true

# ── 4. Start infrastructure (postgres + redis) ───────────────
echo "\n🐘  Starting postgres + redis..."
$COMPOSE_CMD up -d postgres redis

echo "    Waiting for postgres to be healthy..."
for i in {1..20}; do
  STATUS=$(podman inspect --format='{{.State.Health.Status}}' preventia-postgres 2>/dev/null || echo "missing")
  if [[ "$STATUS" == "healthy" ]]; then
    echo "    ✅  postgres healthy"
    break
  fi
  [[ $i -eq 20 ]] && echo "⚠️  postgres health check timed out" && break
  sleep 3
done

echo "    Waiting for redis to be healthy..."
for i in {1..15}; do
  if podman exec preventia-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "    ✅  redis healthy"
    break
  fi
  [[ $i -eq 15 ]] && echo "⚠️  redis health check timed out" && break
  sleep 2
done

# ── 5. Build & start Spring Boot app ─────────────────────────
if [[ "$REBUILD" == "true" ]]; then
  echo "\n🔨  Building Spring Boot app (podman compose build)..."
  $COMPOSE_CMD build app
  echo "\n🚀  Starting app..."
  $COMPOSE_CMD up -d app
else
  echo "\n⏭️   Skipping app rebuild (--infra flag set)"
fi

# ── 6. Summary ───────────────────────────────────────────────
echo "\n============================================"
echo "  Container Status:"
$COMPOSE_CMD ps
echo "============================================"
echo ""
echo "  Endpoints:"
echo "    API    →  http://localhost:8080"
echo "    Health →  http://localhost:8080/actuator/health"
echo ""
echo "  Quick smoke tests:"
echo "    curl http://localhost:8080/actuator/health"
echo "    curl -s -X POST http://localhost:8080/api/v1/auth/register \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"name\":\"Test Doctor\",\"email\":\"doc@test.com\",\"password\":\"Test1234!\",\"role\":\"DOCTOR\"}'"
echo ""

if [[ "$TAIL_LOGS" == "true" ]]; then
  echo "📋  Tailing app logs (Ctrl+C to stop)..."
  $COMPOSE_CMD logs -f app
fi

