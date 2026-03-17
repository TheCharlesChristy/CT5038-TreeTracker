#!/bin/bash
set -e

ROOT="$(pwd)"
SERVER_DIR="$ROOT/server"
EXPO_DIR="$ROOT/TreeGuardiansExpo"

# Init nodenv (minimal, safe)
export NODENV_ROOT="$HOME/.nodenv"
export PATH="$NODENV_ROOT/bin:$PATH"
eval "$(nodenv init -)"

echo "Using node: $(node -v)"
echo "Using npm: $(npm -v)"

echo "=== Backend install ==="
cd "$SERVER_DIR"
npm ci --omit=dev

echo "=== Frontend install ==="
cd "$EXPO_DIR"
npm ci

echo "=== Build Expo ==="
npx expo export --platform web

echo "=== Restart app ==="
mkdir -p "$ROOT/tmp"
touch "$ROOT/tmp/restart.txt"

echo "=== Done ==="