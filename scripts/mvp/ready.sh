#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BENCHMARK_SUMMARY="${ROOT_DIR}/.artifacts/benchmark-summary.json"
SCENARIO_SUMMARY="${ROOT_DIR}/.artifacts/mvp-scenario-summary.json"

log() {
  printf '[mvp:ready] %s\n' "$*"
}

fail() {
  printf '[mvp:ready][error] %s\n' "$*" >&2
}

cd "$ROOT_DIR"

log "Running verification gates"
pnpm verify

log "Running strict benchmark"
pnpm benchmark --strict --json "$BENCHMARK_SUMMARY"

log "Running replay MVP scenario"
pnpm mvp:scenario --mode replay --auth dev-header --summary "$SCENARIO_SUMMARY"

if [ ! -f "$SCENARIO_SUMMARY" ]; then
  fail "Scenario summary not found: $SCENARIO_SUMMARY"
  exit 1
fi

SCENARIO_SUMMARY="$SCENARIO_SUMMARY" node <<'NODE'
const fs = require("node:fs");

const summaryPath = process.env.SCENARIO_SUMMARY;
const raw = fs.readFileSync(summaryPath, "utf8");
const summary = JSON.parse(raw);

if (summary.result !== "passed") {
  console.error(`[mvp:ready][error] Scenario result is '${summary.result}', expected 'passed'.`);
  process.exit(1);
}
NODE

log "All MVP readiness checks passed"
log "Benchmark summary: $BENCHMARK_SUMMARY"
log "Scenario summary: $SCENARIO_SUMMARY"
log "Service logs: ${ROOT_DIR}/.artifacts/mvp/*.log"
