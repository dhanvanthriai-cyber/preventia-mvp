#!/usr/bin/env zsh
# =============================================================
# fix-docker-context.sh
# Configures Docker CLI to use the running Podman socket so
# that `docker compose up` works on this machine (which uses
# Podman Desktop instead of Docker Desktop).
#
# Usage:  zsh fix-docker-context.sh
# =============================================================

set -e

echo "==> Finding Podman socket..."

# 1. Try the symlink Podman Desktop maintains
SYMLINK="$HOME/.local/share/containers/podman/machine/podman.sock"
if [[ -S "$SYMLINK" ]]; then
  PODMAN_SOCK="$SYMLINK"
fi

# 2. Try resolving the symlink target directly (handles macOS temp paths)
if [[ -z "$PODMAN_SOCK" ]] && [[ -L "$SYMLINK" ]]; then
  RESOLVED=$(readlink "$SYMLINK" 2>/dev/null || true)
  if [[ -S "$RESOLVED" ]]; then
    PODMAN_SOCK="$RESOLVED"
  fi
fi

# 3. Search common temp locations used by Podman machine on macOS
if [[ -z "$PODMAN_SOCK" ]]; then
  FOUND=$(find /var/folders -name "podman-machine-default-api.sock" 2>/dev/null | head -1)
  if [[ -S "$FOUND" ]]; then
    PODMAN_SOCK="$FOUND"
  fi
fi

# 4. Try XDG_RUNTIME_DIR
if [[ -z "$PODMAN_SOCK" ]] && [[ -n "$XDG_RUNTIME_DIR" ]]; then
  if [[ -S "$XDG_RUNTIME_DIR/podman/podman.sock" ]]; then
    PODMAN_SOCK="$XDG_RUNTIME_DIR/podman/podman.sock"
  fi
fi

if [[ -z "$PODMAN_SOCK" ]]; then
  echo ""
  echo "ERROR: Could not find a live Podman socket."
  echo "Make sure Podman Machine is running:"
  echo "  podman machine start"
  echo ""
  echo "Then re-run this script."
  exit 1
fi

echo "==> Using Podman socket: $PODMAN_SOCK"

# ── Configure Docker context ──────────────────────────────────
echo "==> Creating/updating Docker context 'podman'..."
docker context rm podman 2>/dev/null || true
docker context create podman \
  --docker "host=unix://${PODMAN_SOCK}" \
  --description "Podman Desktop socket"

echo "==> Switching active Docker context to 'podman'..."
docker context use podman

# ── Persist DOCKER_HOST in ~/.zshrc so new shells work too ───
ZSHRC="$HOME/.zshrc"
MARKER="# >>> podman docker-host >>>"
if ! grep -q "$MARKER" "$ZSHRC" 2>/dev/null; then
  echo "" >> "$ZSHRC"
  echo "$MARKER" >> "$ZSHRC"
  echo "export DOCKER_HOST=\"unix://${PODMAN_SOCK}\"" >> "$ZSHRC"
  echo "# <<< podman docker-host <<<" >> "$ZSHRC"
  echo "==> Added DOCKER_HOST to $ZSHRC (will apply to new shells)"
else
  # Update the existing line in case the socket path changed
  sed -i '' "s|export DOCKER_HOST=.*|export DOCKER_HOST=\"unix://${PODMAN_SOCK}\"|" "$ZSHRC"
  echo "==> Updated DOCKER_HOST in $ZSHRC"
fi

# ── Apply immediately ─────────────────────────────────────────
export DOCKER_HOST="unix://${PODMAN_SOCK}"

echo ""
echo "✅  Done! Testing connection..."
docker ps && echo "✅  Docker CLI → Podman is working." || echo "⚠️  Connection test failed — check that Podman machine is running."
echo ""
echo "Next steps:"
echo "  source ~/.zshrc          # apply DOCKER_HOST to this shell"
echo "  cd eng && docker compose up -d"

