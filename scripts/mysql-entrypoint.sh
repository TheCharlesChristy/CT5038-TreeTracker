#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="${LOG_DIR:-/workspace/logs}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/mysql.log}"

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

exec /usr/local/bin/docker-entrypoint.sh mysqld