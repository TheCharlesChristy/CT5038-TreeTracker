#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker/compose.local.yml"
ENV_FILE="$ROOT_DIR/.env.docker"
QUIET_MODE=0
LOG_PIDS=()

print_usage() {
  cat <<'EOF'
Usage:
  ./scripts/local_plesk_stack.sh [options] [compose up options]

Options:
  -q, --quiet   Show mostly Expo output in terminal (full logs still go to logs/*.log)
  -h, --help    Show this help
EOF
}

COMPOSE_ARGS=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    -q|--quiet)
      QUIET_MODE=1
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      COMPOSE_ARGS+=("$1")
      shift
      ;;
  esac
done

cd "$ROOT_DIR"

mkdir -p "$ROOT_DIR/logs"

ensure_log_permissions() {
  local must_fix=0

  if [ ! -w "$ROOT_DIR/logs" ]; then
    must_fix=1
  fi

  while IFS= read -r existing_log; do
    [ -w "$existing_log" ] || must_fix=1
  done < <(find "$ROOT_DIR/logs" -maxdepth 1 -type f -name '*.log' 2>/dev/null || true)

  if [ "$must_fix" -eq 0 ]; then
    return
  fi

  echo "[local_plesk_stack] fixing log ownership in $ROOT_DIR/logs"
  docker run --rm -v "$ROOT_DIR/logs:/logs" alpine:3.20 \
    sh -lc "chown -R $(id -u):$(id -g) /logs || true; chmod -R u+rwX /logs || true" >/dev/null 2>&1 || true
}

start_container_log_streams() {
  ensure_log_permissions

  local service
  while IFS= read -r service; do
    [ -n "$service" ] || continue
    local log_file="$ROOT_DIR/logs/${service}.log"
    : > "$log_file" 2>/dev/null || true
    echo "[local_plesk_stack] streaming logs for '$service' -> ${log_file#$ROOT_DIR/}"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs -f --no-color "$service" >>"$log_file" 2>&1 &
    LOG_PIDS+=("$!")
  done < <(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --services)
}

stop_container_log_streams() {
  local pid
  for pid in "${LOG_PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  wait || true
}

announce_expo_link() {
  (
    for _ in $(seq 1 180); do
      if [ -f "$ROOT_DIR/logs/expo.log" ]; then
        local link
        link="$(grep -Eo 'exp://[^[:space:]]+' "$ROOT_DIR/logs/expo.log" | head -n 1 || true)"
        if [ -n "$link" ]; then
          echo "[local_plesk_stack] expo-go link: $link"
          break
        fi
      fi
      sleep 2
    done
  ) &
  LOG_PIDS+=("$!")
}

if [ ! -e /dev/kvm ]; then
  echo "Error: /dev/kvm is not available on this host."
  echo "Android emulator service requires KVM; enable virtualization and KVM access."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ROOT_DIR/.env.docker.example" ]; then
    cp "$ROOT_DIR/.env.docker.example" "$ENV_FILE"
    echo "Created $ENV_FILE from .env.docker.example"
  else
    echo "Warning: $ENV_FILE was not found and no example file exists."
  fi
fi

if [ ! -f "$ROOT_DIR/server/.env" ] && [ -f "$ROOT_DIR/server/.env.example" ]; then
  cp "$ROOT_DIR/server/.env.example" "$ROOT_DIR/server/.env"
  echo "Created server/.env from server/.env.example"
fi

SERVER_PORT_VALUE="$(grep -E '^SERVER_PORT=' "$ENV_FILE" 2>/dev/null | tail -n 1 | cut -d'=' -f2- || true)"
EXPO_PORT_VALUE="$(grep -E '^EXPO_DEV_SERVER_PORT=' "$ENV_FILE" 2>/dev/null | tail -n 1 | cut -d'=' -f2- || true)"
EXPO_HOST_MODE_VALUE="$(grep -E '^EXPO_HOST_MODE=' "$ENV_FILE" 2>/dev/null | tail -n 1 | cut -d'=' -f2- || true)"
SERVER_PORT_VALUE="${SERVER_PORT_VALUE:-4000}"
EXPO_PORT_VALUE="${EXPO_PORT_VALUE:-8081}"
EXPO_HOST_MODE_VALUE="${EXPO_HOST_MODE_VALUE:-tunnel}"

echo "[local_plesk_stack] web:  http://localhost:${SERVER_PORT_VALUE}/"
echo "[local_plesk_stack] expo: http://localhost:${EXPO_PORT_VALUE}/"
echo "[local_plesk_stack] vnc:  http://localhost:6080/vnc.html"
echo "[local_plesk_stack] expo host mode: ${EXPO_HOST_MODE_VALUE}"
echo "[local_plesk_stack] logs: $ROOT_DIR/logs"

cleanup() {
  stop_container_log_streams
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

start_container_log_streams
announce_expo_link

if [ "$QUIET_MODE" -eq 1 ]; then
  # Build first in quiet mode to avoid dumping layer logs to terminal.
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build --quiet "${COMPOSE_ARGS[@]}"

  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up --no-build --remove-orphans --abort-on-container-failure \
    --no-attach mysql --no-attach server --no-attach expo-web-build --no-attach android-emulator "${COMPOSE_ARGS[@]}"
else
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up --build --remove-orphans --abort-on-container-failure \
    --no-attach mysql --no-attach server --no-attach expo-web-build "${COMPOSE_ARGS[@]}"
fi
