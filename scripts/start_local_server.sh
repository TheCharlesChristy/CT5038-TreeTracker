#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
ENV_FILE="$REPO_ROOT/server/.env"
ENV_TEMPLATE="$REPO_ROOT/server/.env.example"

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required for scripts/start_local_server.sh"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "Missing $ENV_FILE"
    echo "Copy $ENV_TEMPLATE to $ENV_FILE and adjust the values for your environment."
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
else
    echo "Docker Compose is required for scripts/start_local_server.sh"
    exit 1
fi

COMPOSE_FILE="docker-compose.server.yml"
STACK_RUNNING=false
LOG_DIR="$REPO_ROOT/logs"

require_kvm() {
    if [ ! -e /dev/kvm ]; then
        echo "Hardware acceleration requires /dev/kvm on the host, but it was not found."
        echo "Enable virtualization/KVM on this machine before running scripts/start_local_server.sh."
        exit 1
    fi

    if [ ! -r /dev/kvm ] || [ ! -w /dev/kvm ]; then
        echo "Hardware acceleration requires read/write access to /dev/kvm."
        echo "Ensure your Docker setup can access /dev/kvm, then run the script again."
        exit 1
    fi
}

print_access_urls() {
    echo ""
    echo "Local development stack"
    echo "  App root:           http://localhost:4000/"
    echo "  API health:         http://localhost:4000/health"
    echo "  DB health:          http://localhost:4000/db/health"
    echo "  Expo dev server:    http://localhost:8081/"
    echo "  Android noVNC:      http://localhost:6080/vnc.html"
    echo "  Android VNC socket: localhost:5900"
    echo "  Runtime logs:       $LOG_DIR"
    echo ""
    echo "Press Ctrl+C to stop the entire stack."
    echo ""
}

cleanup() {
    if [ "$STACK_RUNNING" = true ]; then
        echo ""
        echo "Stopping local development stack..."
        "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
    fi
}

trap cleanup EXIT INT TERM

require_kvm

mkdir -p "$LOG_DIR"
: > "$LOG_DIR/mysql.log"
: > "$LOG_DIR/server.log"
: > "$LOG_DIR/android-emulator.log"
: > "$LOG_DIR/server-test.log"

print_access_urls

if [ -n "${DB_TEST_BENCH_TOKEN:-}" ]; then
    export DB_TEST_BENCH_ENABLED=true
    echo "DB test bench enabled for this run."
else
    export DB_TEST_BENCH_ENABLED=false
fi

STACK_RUNNING=true
"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" up --build --remove-orphans
