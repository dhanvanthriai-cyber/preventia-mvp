#!/usr/bin/env zsh
# start-web.sh — Start Expo web dev server
# Usage: zsh start-web.sh
# Opens: http://localhost:8081

cd "$(dirname "$0")"

echo "🚀 Starting Dhanvanthri UI on http://localhost:8081"
echo "   Press Ctrl+C to stop"
echo ""

# Set non-interactive so it doesn't pause on port conflicts
export EXPO_NO_INTERACTIVE=1
export BROWSER=none   # don't auto-open browser; open manually

npx expo start --web --port 8081

