#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.pilot.yml"
COMPOSE_PROJECT="grifftab-pilot"

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  printf '[pilot] stopping pilot stack\n'
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" down --remove-orphans
fi

printf '[pilot] teardown complete\n'
