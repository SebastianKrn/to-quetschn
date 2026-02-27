#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_docker
ensure_artifacts_dir
load_env_file

log "Starting MVP infra services (postgres, redis, minio)"
docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" up -d postgres redis minio

log "Waiting for MinIO health"
wait_for_http "minio" "http://localhost:9000/minio/health/live" 90

S3_BUCKET_NAME="${S3_BUCKET:-grifftab-files-dev}"
S3_ACCESS_KEY="${S3_ACCESS_KEY_ID:-minioadmin}"
S3_SECRET_KEY="${S3_SECRET_ACCESS_KEY:-minioadmin}"

log "Ensuring MinIO bucket exists: $S3_BUCKET_NAME"
docker run --rm \
  --network "${COMPOSE_PROJECT}_default" \
  --entrypoint /bin/sh \
  minio/mc \
  -ec "mc alias set local http://minio:9000 '${S3_ACCESS_KEY}' '${S3_SECRET_KEY}' >/dev/null && mc mb --ignore-existing local/${S3_BUCKET_NAME} >/dev/null"

log "Infra is ready"
