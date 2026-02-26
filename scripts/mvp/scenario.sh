#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

ensure_artifacts_dir

SUMMARY_PATH="$ROOT_DIR/.artifacts/mvp-scenario-summary.json"
FIXTURE_PATH="${MVP_SCENARIO_FIXTURE:-$ROOT_DIR/benchmarks/pdfs/sample-licensed-001.pdf}"
DEV_USER_ID="${MVP_DEV_USER_ID:-dev-user}"

cleanup() {
  "$ROOT_DIR/scripts/mvp/down.sh" >/dev/null 2>&1 || true
}

trap cleanup EXIT

log "Resetting previous MVP runtime"
"$ROOT_DIR/scripts/mvp/down.sh" >/dev/null 2>&1 || true

"$ROOT_DIR/scripts/mvp/infra-up.sh"
"$ROOT_DIR/scripts/mvp/apps-up.sh" --daemon

log "Running MVP Playwright smoke"
set +e
MVP_SCENARIO_SUMMARY_PATH="$SUMMARY_PATH" \
MVP_SCENARIO_FIXTURE="$FIXTURE_PATH" \
MVP_DEV_USER_ID="$DEV_USER_ID" \
pnpm --filter @grifftab/web test:e2e:mvp
run_status=$?
set -e

if [ ! -f "$SUMMARY_PATH" ]; then
  log "Scenario summary was not produced by test; writing fallback summary"
  RUN_STATUS="$run_status" SUMMARY_PATH="$SUMMARY_PATH" FIXTURE_PATH="$FIXTURE_PATH" DEV_USER_ID="$DEV_USER_ID" \
    node <<'NODE'
const fs = require("node:fs");
const status = Number(process.env.RUN_STATUS || "1");
const summary = {
  timestamp: new Date().toISOString(),
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
