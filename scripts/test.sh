#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required for scripts/test.sh"
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "Docker Compose is required for scripts/test.sh"
    exit 1
fi

echo "Running backend tests in Docker (lock + unit + integration)..."

cleanup() {
    $COMPOSE_CMD -f docker-compose.server.yml down -v >/dev/null 2>&1 || true
}

trap cleanup EXIT

$COMPOSE_CMD -f docker-compose.server.yml --profile test up --build --abort-on-container-exit --exit-code-from server-test server-test
