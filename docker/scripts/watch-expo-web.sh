#!/usr/bin/env bash
set -euo pipefail

EXPO_DIR="${EXPO_DIR:-/workspace/TreeGuardiansExpo}"
LOG_DIR="${LOG_DIR:-/workspace/logs}"
LOG_FILE="${LOG_DIR}/expo-web-build.log"
DEBOUNCE_SECONDS="${WEB_BUILD_DEBOUNCE_SECONDS:-2}"

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" | tee -a "$LOG_FILE"
}

compute_hash() {
  find "$EXPO_DIR" \
    -path "$EXPO_DIR/node_modules" -prune -o \
    -path "$EXPO_DIR/.expo" -prune -o \
    -path "$EXPO_DIR/dist" -prune -o \
    -path "$EXPO_DIR/android" -prune -o \
    -path "$EXPO_DIR/ios" -prune -o \
    -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.json' -o -name '*.css' \) \
    -print0 | sort -z | xargs -0 sha1sum | sha1sum | awk '{print $1}'
}

run_build() {
  log "Installing Expo dependencies (if needed)..."
  npm --prefix "$EXPO_DIR" install >>"$LOG_FILE" 2>&1

  log "Exporting Expo web bundle to dist/..."
  npm --prefix "$EXPO_DIR" run export:web >>"$LOG_FILE" 2>&1

  log "Expo web export completed."
}

if [ ! -d "$EXPO_DIR" ]; then
  log "Expo directory not found at $EXPO_DIR"
  exit 1
fi

last_hash=""
while true; do
  current_hash="$(compute_hash || true)"

  if [ -z "$current_hash" ]; then
    log "No source files found for Expo web export watch; retrying..."
    sleep "$DEBOUNCE_SECONDS"
    continue
  fi

  if [ "$current_hash" != "$last_hash" ]; then
    run_build || log "Expo web export failed; will retry on next change."
    last_hash="$current_hash"
  fi

  sleep "$DEBOUNCE_SECONDS"
done
