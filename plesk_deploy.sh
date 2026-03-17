#!/bin/bash
set -e

# Initialize nodenv
export NODENV_ROOT="$HOME/.nodenv"
export PATH="$NODENV_ROOT/bin:$NODENV_ROOT/shims:$PATH"
eval "$(nodenv init -)"

# Explicitly select Node version
nodenv shell 18

ROOT="$(pwd)"
SERVER_DIR="$ROOT/server"
EXPO_DIR="$ROOT/TreeGuardiansExpo"

echo "=== Installing backend ==="
cd "$SERVER_DIR"
npm ci --production

echo "=== Installing frontend ==="
cd "$EXPO_DIR"
npm ci

echo "=== Building Expo ==="
npx expo export:web

echo "=== Restarting app ==="
mkdir -p "$ROOT/tmp"
touch "$ROOT/tmp/restart.txt"

echo "=== Done ==="