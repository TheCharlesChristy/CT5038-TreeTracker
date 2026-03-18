#!/bin/bash
set -e


ROOT="$(pwd)"
SERVER_DIR="$ROOT/server"

echo "16" > "$ROOT/.node-version"

export NODENV_ROOT="$HOME/.nodenv"
export PATH="$NODENV_ROOT/bin:$PATH"
eval "$(nodenv init -)"

echo "Node: $(node -v)"

echo "=== Backend install ==="
cd "$SERVER_DIR"
npm install --omit=dev

echo "=== Restart app ==="
mkdir -p "$ROOT/tmp"
touch "$ROOT/tmp/restart.txt"

echo "=== Done ==="