#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.plesk-local.yml"
ENV_FILE="$ROOT_DIR/.env.docker"

cd "$ROOT_DIR"

mkdir -p "$ROOT_DIR/logs"

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

cleanup() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up --build --remove-orphans "$@"
