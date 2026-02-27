#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.pilot.yml"
COMPOSE_PROJECT="grifftab-pilot"
ARTIFACT_DIR="$ROOT_DIR/.artifacts/pilot"
SMOKE_LOG="$ARTIFACT_DIR/pilot-smoke.log"
SCENARIO_SUMMARY="$ARTIFACT_DIR/pilot-scenario-summary.json"
FIXTURE_PATH="${MVP_SCENARIO_FIXTURE:-$ROOT_DIR/benchmarks/pdfs/sample-licensed-001.pdf}"

mkdir -p "$ARTIFACT_DIR"

error() {
  printf '[pilot][error] %s\n' "$*" >&2
}

validate_fixture_pdf() {
  local fixture="$1"

  if [ ! -f "$fixture" ]; then
    error "Fixture not found: $fixture"
    exit 1
  fi

  if ! head -c 4 "$fixture" | grep -q "%PDF"; then
    error "Fixture is not a valid PDF (missing %PDF header): $fixture"
    exit 1
  fi

  local size_bytes
  size_bytes="$(wc -c < "$fixture" | tr -d ' ')"
  if [ "${size_bytes:-0}" -lt 1024 ]; then
    error "Fixture appears to be a placeholder (size < 1KB): $fixture"
    error "Set MVP_SCENARIO_FIXTURE to a real local music-sheet PDF."
    exit 1
  fi
}

cleanup() {
  "$ROOT_DIR/scripts/pilot/down.sh" >/dev/null 2>&1 || true
}

trap cleanup EXIT

reset_runtime_state() {
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" exec -T redis redis-cli FLUSHALL >/dev/null
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" exec -T web sh -lc "rm -f /pilot-state/local-domain-store.json"
}

validate_fixture_pdf "$FIXTURE_PATH"

"$ROOT_DIR/scripts/pilot/up.sh"
reset_runtime_state

pnpm --filter @grifftab/web exec playwright install chromium >/dev/null

{
  echo "[pilot-smoke] web health"
  curl --fail --silent --show-error http://localhost:3000/api/health
  echo
  echo "[pilot-smoke] omr health"
  curl --fail --silent --show-error http://localhost:4100/health
  echo
  echo "[pilot-smoke] run e2e scenario"
  MVP_BASE_URL="http://127.0.0.1:3000" \
  MVP_SCENARIO_FIXTURE="$FIXTURE_PATH" \
  MVP_SCENARIO_SUMMARY_PATH="$SCENARIO_SUMMARY" \
  MVP_SCENARIO_AUTH_MODE="session" \
  MVP_SCENARIO_USER_EMAIL="pilot-tester@example.com" \
  MVP_SCENARIO_USER_PASSWORD="PilotPassw0rd!" \
  MVP_SCENARIO_USER_NAME="Pilot Tester" \
  pnpm --filter @grifftab/web test:e2e:mvp
  echo
  echo "[pilot-smoke] worker logs tail"
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" logs worker --tail=200
} | tee "$SMOKE_LOG"

printf '[pilot] smoke succeeded (%s)\n' "$SMOKE_LOG"
