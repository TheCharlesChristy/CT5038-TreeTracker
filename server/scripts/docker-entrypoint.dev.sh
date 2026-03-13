#!/usr/bin/env bash
set -euo pipefail

SERVER_DIR="${SERVER_DIR:-/workspace/server}"
EXPO_DIR="${EXPO_DIR:-/workspace/TreeGuardiansExpo}"
LOG_DIR="${LOG_DIR:-/workspace/logs}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/server.log}"

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

ensure_dependencies() {
  local app_dir="$1"
  local label="$2"
  local lock_file="${app_dir}/package-lock.json"
  local hash_file="${app_dir}/node_modules/.package-lock.sha256"
  local expected_hash=""
  local current_hash=""

  if [ ! -f "$lock_file" ]; then
    echo "[dev-entrypoint] Missing ${label} lock file at ${lock_file}"
    exit 1
  fi

  mkdir -p "${app_dir}/node_modules"
  expected_hash="$(sha256sum "$lock_file" | awk '{print $1}')"

  if [ -f "$hash_file" ]; then
    current_hash="$(cat "$hash_file")"
  fi

  if [ "$expected_hash" != "$current_hash" ]; then
    echo "[dev-entrypoint] Installing ${label} dependencies..."
    (cd "$app_dir" && npm ci)
    printf '%s' "$expected_hash" > "$hash_file"
    return
  fi

  echo "[dev-entrypoint] Using cached ${label} dependencies."
}

ensure_dependencies "$SERVER_DIR" "server"
ensure_dependencies "$EXPO_DIR" "expo"

cd "$SERVER_DIR"
exec npm run dev