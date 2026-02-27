#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

ensure_artifacts_dir

MODE="${MVP_SCENARIO_MODE:-replay}"
SUMMARY_PATH="${MVP_SCENARIO_SUMMARY_PATH:-$ROOT_DIR/.artifacts/mvp-scenario-summary.json}"
FIXTURE_PATH="${MVP_SCENARIO_FIXTURE:-$ROOT_DIR/benchmarks/pdfs/sample-licensed-001.pdf}"
DEV_USER_ID="${MVP_DEV_USER_ID:-dev-user}"
AUTH_MODE="${MVP_SCENARIO_AUTH_MODE:-dev-header}"

while [ $# -gt 0 ]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --fixture)
      FIXTURE_PATH="${2:-}"
      shift 2
      ;;
    --summary)
      SUMMARY_PATH="${2:-}"
      shift 2
      ;;
    --auth)
      AUTH_MODE="${2:-}"
      shift 2
      ;;
    *)
      error "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ "$MODE" != "replay" ] && [ "$MODE" != "audiveris" ]; then
  error "--mode must be replay or audiveris"
  exit 1
fi

if [ "$AUTH_MODE" != "dev-header" ] && [ "$AUTH_MODE" != "session" ]; then
  error "--auth must be dev-header or session"
  exit 1
fi

if [ ! -f "$FIXTURE_PATH" ]; then
  error "Fixture not found: $FIXTURE_PATH"
  exit 1
fi

if [ "$MODE" = "audiveris" ] && ! command -v "${AUDIVERIS_BIN:-audiveris}" >/dev/null 2>&1; then
  error "AUDIVERIS_BIN is not available in PATH for audiveris mode"
  exit 1
fi

cleanup() {
  "$ROOT_DIR/scripts/mvp/down.sh" >/dev/null 2>&1 || true
}

trap cleanup EXIT

log "Resetting previous MVP runtime"
"$ROOT_DIR/scripts/mvp/down.sh" >/dev/null 2>&1 || true

"$ROOT_DIR/scripts/mvp/infra-up.sh"
OMR_MODE_OVERRIDE="$MODE" "$ROOT_DIR/scripts/mvp/apps-up.sh" --daemon

log "Running MVP Playwright smoke (mode=$MODE)"
set +e
MVP_SCENARIO_SUMMARY_PATH="$SUMMARY_PATH" \
MVP_SCENARIO_FIXTURE="$FIXTURE_PATH" \
MVP_DEV_USER_ID="$DEV_USER_ID" \
MVP_SCENARIO_AUTH_MODE="$AUTH_MODE" \
pnpm --filter @grifftab/web test:e2e:mvp
run_status=$?
set -e

if [ ! -f "$SUMMARY_PATH" ]; then
  log "Scenario summary was not produced by test; writing fallback summary"
  RUN_STATUS="$run_status" SUMMARY_PATH="$SUMMARY_PATH" FIXTURE_PATH="$FIXTURE_PATH" DEV_USER_ID="$DEV_USER_ID" MODE="$MODE" AUTH_MODE="$AUTH_MODE" \
    node <<'NODE'
const fs = require("node:fs");
const status = Number(process.env.RUN_STATUS || "1");
const summary = {
  timestamp: new Date().toISOString(),
  mode: process.env.MODE,
  authMode: process.env.AUTH_MODE,
  fixture: process.env.FIXTURE_PATH,
  devUserId: process.env.DEV_USER_ID,
  conversionId: null,
  arrangementId: null,
  exportId: null,
  steps: [
    {
      name: "playwright-smoke",
      status: status === 0 ? "passed" : "failed",
      durationMs: 0,
      error: status === 0 ? undefined : "Playwright smoke exited before writing summary"
    }
  ],
  result: status === 0 ? "passed" : "failed"
};
fs.writeFileSync(process.env.SUMMARY_PATH, JSON.stringify(summary, null, 2));
NODE
fi

if [ "$run_status" -ne 0 ]; then
  error "MVP scenario failed. See $SUMMARY_PATH and logs in $ARTIFACT_DIR"
  exit "$run_status"
fi

log "MVP scenario succeeded"
log "Summary: $SUMMARY_PATH"
