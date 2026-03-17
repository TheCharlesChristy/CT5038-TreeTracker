#!/bin/bash

set -e  # Exit on error

echo "=== Starting deployment ==="

ROOT="$PWD"
SERVER_DIR="$ROOT/server"
EXPO_DIR="$ROOT/TreeGuardiansExpo"

# Ensure correct Node version (optional, if using nvm)
# source ~/.nvm/nvm.sh
# nvm use 18

echo "=== Installing backend dependencies ==="
cd "$SERVER_DIR"
npm install --production

echo "=== Installing frontend dependencies ==="
cd "$EXPO_DIR"
npm install

echo "=== Building Expo web app ==="
# Ensure expo CLI is available
npx expo export:web

# OR if you use a script:
# npm run build

echo "=== Fixing permissions (optional but often needed in Plesk) ==="
chown -R $(whoami):psacln "$ROOT"

echo "=== Restarting Node.js app ==="
# Plesk Node restart trigger
touch "$ROOT/tmp/restart.txt"

echo "=== Deployment complete ==="