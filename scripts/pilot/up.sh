#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.pilot.yml"
COMPOSE_PROJECT="grifftab-pilot"
S3_BUCKET_NAME="${S3_BUCKET:-grifftab-files-pilot}"
S3_ACCESS_KEY="${S3_ACCESS_KEY_ID:-minioadmin}"
S3_SECRET_KEY="${S3_SECRET_ACCESS_KEY:-minioadmin}"

log() {
  printf '[pilot] %s\n' "$*"
}

error() {
  printf '[pilot][error] %s\n' "$*" >&2
}

cleanup_stack() {
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
}

start_stack() {
  local max_attempts=5
  local attempt=1

  cleanup_stack

  while [ "$attempt" -le "$max_attempts" ]; do
    if docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" up -d --build; then
      return 0
    fi

    cleanup_stack

    if [ "$attempt" -lt "$max_attempts" ]; then
      log "docker compose up attempt ${attempt}/${max_attempts} failed; retrying after cleanup delay"
      sleep $((attempt * 2))
    fi
    attempt=$((attempt + 1))
  done

  error "Failed to start pilot stack after ${max_attempts} attempts."
  exit 1
}

wait_for_http() {
  local service_name="$1"
  local url="$2"
  local timeout_seconds="$3"
  local started_at
  started_at="$(date +%s)"

  until curl --fail --silent --show-error "$url" >/dev/null 2>&1; do
    local now
    now="$(date +%s)"
    if [ $((now - started_at)) -ge "$timeout_seconds" ]; then
      error "Timed out waiting for $service_name at $url"
      exit 1
    fi
    sleep 1
  done
}

if ! command -v docker >/dev/null 2>&1; then
  error "Docker CLI not found. Install Docker to run pilot commands."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  error "Docker daemon is not reachable. Start Docker and retry."
  exit 1
fi

log "Validating pilot compose file"
docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" config >/dev/null

log "Starting pilot stack"
start_stack

log "Waiting for service health"
wait_for_http "web" "http://localhost:3000/api/health" 240
wait_for_http "omr-service" "http://localhost:4100/health" 180
wait_for_http "minio" "http://localhost:9000/minio/health/live" 180

log "Ensuring MinIO bucket exists: $S3_BUCKET_NAME"
docker run --rm \
  --network "${COMPOSE_PROJECT}_default" \
  --entrypoint /bin/sh \
  minio/mc \
  -ec "mc alias set local http://minio:9000 '${S3_ACCESS_KEY}' '${S3_SECRET_KEY}' >/dev/null && mc mb --ignore-existing local/${S3_BUCKET_NAME} >/dev/null"

log "Pilot stack is ready"
