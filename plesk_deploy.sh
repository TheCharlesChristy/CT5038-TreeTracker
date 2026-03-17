#!/bin/bash
set -e

ROOT="$(pwd)"
SERVER_DIR="$ROOT/server"
EXPO_DIR="$ROOT/TreeGuardiansExpo"

# Initialise nodenv (needed in Plesk)
export NODENV_ROOT="$HOME/.nodenv"
export PATH="$NODENV_ROOT/bin:$PATH"
eval "$(nodenv init -)"

echo "Node: $(node -v)"
echo "NPM: $(npm -v)"

echo "=== Backend install ==="
cd "$SERVER_DIR"
npm install --omit=dev

echo "=== Frontend install ==="
cd "$EXPO_DIR"
npm install

echo "=== Build Expo ==="
npx expo export --platform web

echo "=== Restart app ==="
mkdir -p "$ROOT/tmp"
touch "$ROOT/tmp/restart.txt"

echo "=== Done ==="