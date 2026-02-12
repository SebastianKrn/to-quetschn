#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.dev.yml"
STACK_NAME="grifftab-smoke"

cleanup() {
  docker compose -p "$STACK_NAME" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT

printf '[docker-smoke] validating compose config\n'
docker compose -p "$STACK_NAME" -f "$COMPOSE_FILE" config >/dev/null

printf '[docker-smoke] starting stack\n'
docker compose -p "$STACK_NAME" -f "$COMPOSE_FILE" up -d

printf '[docker-smoke] waiting for services\n'
sleep 8

printf '[docker-smoke] checking web health\n'
curl --fail --silent --show-error http://localhost:3000/api/health >/dev/null

printf '[docker-smoke] checking omr-service health\n'
curl --fail --silent --show-error http://localhost:4100/health >/dev/null

printf '[docker-smoke] checking worker startup logs\n'
docker compose -p "$STACK_NAME" -f "$COMPOSE_FILE" logs worker --tail=200 | grep -q 'worker started'

printf '[docker-smoke] success\n'
