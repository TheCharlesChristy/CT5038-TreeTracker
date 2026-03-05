#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required for scripts/start_local_server.sh"
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "Docker Compose is required for scripts/start_local_server.sh"
    exit 1
fi

wait_for_mysql() {
    echo "Waiting for MySQL to become ready..."
    for _ in {1..60}; do
        if $COMPOSE_CMD -f docker-compose.server.yml exec -T mysql mysqladmin ping -h 127.0.0.1 -proot --silent >/dev/null 2>&1; then
            echo "MySQL is ready."
            return 0
        fi
        sleep 2
    done

    echo "MySQL did not become ready in time."
    return 1
}

run_local_server_with_expo() {
    if [ ! -d "$REPO_ROOT/server/node_modules" ]; then
        echo "Installing server dependencies..."
        (cd "$REPO_ROOT/server" && npm ci)
    fi

    if [ ! -d "$REPO_ROOT/TreeGuardiansExpo/node_modules" ]; then
        echo "Installing Expo dependencies..."
        (cd "$REPO_ROOT/TreeGuardiansExpo" && npm ci)
    fi

    # Expo writes transient state into TreeGuardiansExpo/.expo.
    # If this directory is root-owned (from previous container/tooling runs),
    # Expo fails with EACCES and exits immediately.
    if [ -d "$REPO_ROOT/TreeGuardiansExpo/.expo" ] && [ ! -w "$REPO_ROOT/TreeGuardiansExpo/.expo" ]; then
        echo "Detected non-writable TreeGuardiansExpo/.expo; recreating it for current user..."
        if ! rm -rf "$REPO_ROOT/TreeGuardiansExpo/.expo"; then
            echo "Direct removal failed; attempting ownership repair via Docker..."
            if ! docker run --rm \
                -v "$REPO_ROOT/TreeGuardiansExpo:/project" \
                alpine:3.20 \
                sh -c "chown -R $(id -u):$(id -g) /project/.expo" >/dev/null 2>&1; then
                echo "Automatic ownership repair failed."
                echo "Run: sudo chown -R $(whoami):$(id -gn) $REPO_ROOT/TreeGuardiansExpo/.expo"
                exit 1
            fi

            rm -rf "$REPO_ROOT/TreeGuardiansExpo/.expo"
        fi
    fi
    mkdir -p "$REPO_ROOT/TreeGuardiansExpo/.expo"

    echo "Starting MySQL container only..."
    $COMPOSE_CMD -f docker-compose.server.yml up -d mysql
    wait_for_mysql

    echo "Starting server on host (server will launch Expo)..."
    cd "$REPO_ROOT/server"
    START_EXPO=true \
    EXPO_PROJECT_PATH="$REPO_ROOT/TreeGuardiansExpo" \
    NODE_ENV=development \
    PORT=4000 \
    DB_HOST=127.0.0.1 \
    DB_PORT=3307 \
    DB_USER=root \
    DB_PASSWORD=root \
    DB_DATABASE=treetracker_dev \
    DB_ALLOW_CREATE_DATABASE=true \
    DB_SCHEMA_PATH="$REPO_ROOT/server/src/db/schema.sql" \
    DB_TEST_BENCH_ENABLED=true \
    npm start
}

case "${1:-}" in
    --down)
        echo "Stopping local server stack..."
        $COMPOSE_CMD -f docker-compose.server.yml down
        exit 0
        ;;
    --local)
        run_local_server_with_expo
        exit 0
        ;;
    --detached|-d)
        echo "Starting local server stack in detached mode..."
        $COMPOSE_CMD -f docker-compose.server.yml up --build -d mysql server
        ;;
    "")
        echo "Starting local server stack in foreground..."
        $COMPOSE_CMD -f docker-compose.server.yml up --build mysql server
        ;;
    *)
        echo "Usage: scripts/start_local_server.sh [--local|--detached|-d|--down]"
        exit 1
        ;;
esac

echo ""
echo "Server URL: http://localhost:4000"
echo "Health URL: http://localhost:4000/health"
echo "DB Health URL: http://localhost:4000/db/health"
echo "DB Test Bench API: http://localhost:4000/db/testbench/endpoints"
