#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.dev.example"
ARTIFACT_DIR="$ROOT_DIR/.artifacts/mvp"
PID_FILE="$ARTIFACT_DIR/apps.pids"
COMPOSE_FILE="$ROOT_DIR/docker-compose.dev.yml"
COMPOSE_PROJECT="grifftab-mvp"

log() {
  printf '[mvp] %s\n' "$*"
}

error() {
  printf '[mvp][error] %s\n' "$*" >&2
}

ensure_artifacts_dir() {
  mkdir -p "$ARTIFACT_DIR"
}

load_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    error "Missing env file: $ENV_FILE"
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    error "Docker CLI not found. Install Docker to run MVP infra commands."
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    error "Docker daemon is not reachable. Start Docker Desktop/Engine and retry."
    exit 1
  fi
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
      return 1
    fi
    sleep 1
  done
}

wait_for_log_pattern() {
  local service_name="$1"
  local log_file="$2"
  local pattern="$3"
  local timeout_seconds="$4"
  local started_at
  started_at="$(date +%s)"

  until [ -f "$log_file" ] && grep -q "$pattern" "$log_file"; do
    local now
    now="$(date +%s)"
    if [ $((now - started_at)) -ge "$timeout_seconds" ]; then
      error "Timed out waiting for $service_name log pattern '$pattern'"
      return 1
    fi
    sleep 1
  done
}
