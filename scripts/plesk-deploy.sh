#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$REPO_ROOT/server"
EXPO_DIR="$REPO_ROOT/TreeGuardiansExpo"

log() {
    echo "[plesk-deploy] $*"
}

require_dir() {
    local dir="$1"
    local label="$2"
    if [ ! -d "$dir" ]; then
        echo "[plesk-deploy] Missing $label directory: $dir" >&2
        exit 1
    fi
}

install_dependencies() {
    local dir="$1"
    local label="$2"

    require_dir "$dir" "$label"

    if [ -f "$dir/package-lock.json" ]; then
        log "Installing $label dependencies with npm ci"
        (
            cd "$dir"
            npm ci
        )
        return
    fi

    log "Installing $label dependencies with npm install"
    (
        cd "$dir"
        npm install
    )
}

run_optional_backend_checks() {
    if [ "${RUN_SERVER_TESTS:-false}" != "true" ]; then
        return
    fi

    log "Running backend tests"
    (
        cd "$SERVER_DIR"
        npm test
    )
}

build_expo_web() {
    require_dir "$EXPO_DIR" "Expo app"

    log "Exporting Expo web bundle"
    (
        cd "$EXPO_DIR"
        npm run export:web
    )
}

main() {
    log "Starting deploy preparation"
    install_dependencies "$SERVER_DIR" "server"
    install_dependencies "$EXPO_DIR" "Expo"
    run_optional_backend_checks
    build_expo_web
    log "Deploy preparation completed"
}

main "$@"
