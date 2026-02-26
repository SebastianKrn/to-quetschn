#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

DAEMON_MODE="false"
if [ "${1:-}" = "--daemon" ]; then
  DAEMON_MODE="true"
elif [ -n "${1:-}" ]; then
  error "Unknown option: $1"
  exit 1
fi

ensure_artifacts_dir
load_env_file

export NODE_ENV="development"
export OMR_MODE="replay"
export OMR_REPLAY_MANIFEST_PATH="$ROOT_DIR/benchmarks/replay-manifest.json"

OMR_LOG="$ARTIFACT_DIR/omr-service.log"
WORKER_LOG="$ARTIFACT_DIR/worker.log"
WEB_LOG="$ARTIFACT_DIR/web.log"

: >"$OMR_LOG"
: >"$WORKER_LOG"
: >"$WEB_LOG"
: >"$PID_FILE"

start_service() {
  local service_name="$1"
  local log_file="$2"
  shift 2

  (
    cd "$ROOT_DIR"
    "$@"
  ) >"$log_file" 2>&1 &

  local pid=$!
  printf '%s:%s\n' "$service_name" "$pid" >>"$PID_FILE"
  log "Started $service_name (pid=$pid, log=$log_file)"
}

stop_services() {
  if [ ! -f "$PID_FILE" ]; then
    return
  fi

  while IFS=: read -r service_name pid; do
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
      log "Stopped $service_name (pid=$pid)"
    fi
  done <"$PID_FILE"
}

start_service "omr-service" "$OMR_LOG" pnpm --filter @grifftab/omr-service dev
start_service "worker" "$WORKER_LOG" pnpm --filter @grifftab/worker dev
start_service "web" "$WEB_LOG" pnpm --filter @grifftab/web dev

log "Waiting for service health checks"
wait_for_http "omr-service" "http://localhost:4100/health" 120
wait_for_http "web" "http://localhost:3000/api/health" 180
wait_for_log_pattern "worker" "$WORKER_LOG" "worker started" 120
log "Application services are ready"

if [ "$DAEMON_MODE" = "true" ]; then
  log "Daemon mode enabled; services are running in background"
  exit 0
fi

TAIL_PID=""
cleanup() {
  if [ -n "$TAIL_PID" ] && kill -0 "$TAIL_PID" >/dev/null 2>&1; then
    kill "$TAIL_PID" >/dev/null 2>&1 || true
    wait "$TAIL_PID" >/dev/null 2>&1 || true
  fi
  stop_services
}

trap cleanup EXIT INT TERM

log "Streaming logs (Ctrl+C to stop all services)"
tail -n +1 -F "$OMR_LOG" "$WORKER_LOG" "$WEB_LOG" &
TAIL_PID=$!

set +e
while IFS=: read -r service_name pid; do
  wait "$pid"
  exit_code=$?
  if [ $exit_code -ne 0 ]; then
    error "$service_name exited with status $exit_code"
    exit $exit_code
  fi
  error "$service_name exited unexpectedly"
  exit 1
done <"$PID_FILE"
set -e
