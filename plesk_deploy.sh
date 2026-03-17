#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\n[ERROR] %s\n' "$*" >&2
  exit 1
}

ROOT="$(pwd)"
SERVER_DIR="$ROOT/server"
EXPO_DIR="$ROOT/TreeGuardiansExpo"
TMP_DIR="$ROOT/tmp"

log "Starting deployment"
log "ROOT=$ROOT"

[ -d "$SERVER_DIR" ] || fail "Missing server directory: $SERVER_DIR"
[ -d "$EXPO_DIR" ] || fail "Missing Expo directory: $EXPO_DIR"

# Load whatever environment Plesk did not load for us.
# These may or may not exist; that is fine.
[ -f "$HOME/.bash_profile" ] && . "$HOME/.bash_profile" || true
[ -f "$HOME/.profile" ] && . "$HOME/.profile" || true
[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc" || true

# Ensure HOME exists; some Plesk contexts are odd about this.
export HOME="${HOME:-$(cd ~ && pwd)}"

# Initialise nodenv only if needed.
if ! command -v npm >/dev/null 2>&1; then
  if [ -d "$HOME/.nodenv" ]; then
    export NODENV_ROOT="$HOME/.nodenv"
    export PATH="$NODENV_ROOT/bin:$NODENV_ROOT/shims:$PATH"
    if command -v nodenv >/dev/null 2>&1; then
      eval "$(nodenv init - bash)"
    fi
  fi
fi

# Prefer a repo-pinned Node version. This is the safest way in Plesk.
if [ -f "$ROOT/.node-version" ] && command -v nodenv >/dev/null 2>&1; then
  NODE_VERSION="$(tr -d '[:space:]' < "$ROOT/.node-version")"
  [ -n "$NODE_VERSION" ] || fail ".node-version exists but is empty"
  log "Using nodenv version from .node-version: $NODE_VERSION"
  export NODENV_VERSION="$NODE_VERSION"
fi

# Final command resolution.
if command -v npm >/dev/null 2>&1; then
  NPM_BIN="$(command -v npm)"
else
  fail "npm is still not available. Add a valid .node-version at $ROOT and ensure that version is installed under nodenv."
fi

if command -v npx >/dev/null 2>&1; then
  NPX_BIN="$(command -v npx)"
else
  fail "npx is still not available. Ensure npm/node are installed for the selected Node version."
fi

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  fail "node is still not available."
fi

log "Resolved node: $NODE_BIN"
log "Resolved npm:  $NPM_BIN"
log "Resolved npx:  $NPX_BIN"

log "Node version: $("$NODE_BIN" -v)"
log "NPM version:  $("$NPM_BIN" -v)"

# Backend dependencies
log "Installing backend dependencies"
cd "$SERVER_DIR"
if [ -f package-lock.json ]; then
  "$NPM_BIN" ci --omit=dev
else
  "$NPM_BIN" install --omit=dev
fi

# Frontend dependencies
log "Installing frontend dependencies"
cd "$EXPO_DIR"
if [ -f package-lock.json ]; then
  "$NPM_BIN" ci
else
  "$NPM_BIN" install
fi

# Build Expo web output into dist/
log "Building Expo web app"
if "$NPM_BIN" run | grep -qE 'build(:web)?'; then
  if "$NPM_BIN" run | grep -q 'build:web'; then
    "$NPM_BIN" run build:web
  else
    "$NPM_BIN" run build
  fi
else
  "$NPX_BIN" expo export --platform web
fi

# Sanity check
[ -d "$EXPO_DIR/dist" ] || fail "Expo build did not produce $EXPO_DIR/dist"

# Restart Node app in Plesk/Passenger-style setups
log "Restarting Node application"
mkdir -p "$TMP_DIR"
touch "$TMP_DIR/restart.txt"

log "Deployment complete"