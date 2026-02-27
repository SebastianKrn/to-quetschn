#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.pilot.yml"
COMPOSE_PROJECT="grifftab-pilot"
ARTIFACT_DIR="$ROOT_DIR/.artifacts/pilot/audiveris-summaries"
SUMMARY_FILE="$ROOT_DIR/.artifacts/pilot/audiveris-summary.json"
FIXTURES=(
  "$ROOT_DIR/benchmarks/pdfs/sample-licensed-001.pdf"
  "$ROOT_DIR/benchmarks/pdfs/sample-licensed-002.pdf"
  "$ROOT_DIR/benchmarks/pdfs/sample-licensed-003.pdf"
)

mkdir -p "$ARTIFACT_DIR"
overall_status=0

error() {
  printf '[pilot][error] %s\n' "$*" >&2
}

validate_fixture_pdf() {
  local fixture="$1"

  if [ ! -f "$fixture" ]; then
    error "Fixture not found: $fixture"
    return 1
  fi

  if ! head -c 4 "$fixture" | grep -q "%PDF"; then
    error "Fixture is not a valid PDF (missing %PDF header): $fixture"
    return 1
  fi

  local size_bytes
  size_bytes="$(wc -c < "$fixture" | tr -d ' ')"
  if [ "${size_bytes:-0}" -lt 1024 ]; then
    error "Fixture appears to be a placeholder (size < 1KB): $fixture"
    return 1
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

if [ -n "${PILOT_AUDIVERIS_FIXTURES:-}" ]; then
  IFS=',' read -r -a FIXTURES <<< "${PILOT_AUDIVERIS_FIXTURES}"
fi

if [ "${#FIXTURES[@]}" -lt 3 ]; then
  error "At least 3 audiveris fixtures are required. Provide comma-separated absolute paths via PILOT_AUDIVERIS_FIXTURES."
  exit 1
fi

for fixture in "${FIXTURES[@]}"; do
  validate_fixture_pdf "$fixture"
done

"$ROOT_DIR/scripts/pilot/up.sh"
reset_runtime_state

pnpm --filter @grifftab/web exec playwright install chromium >/dev/null

health_payload="$(curl --fail --silent --show-error http://localhost:4100/health)"
if ! HEALTH_PAYLOAD="$health_payload" node <<'NODE'
const payload = JSON.parse(process.env.HEALTH_PAYLOAD ?? "{}");
if (payload.mode !== "audiveris" || payload.audiverisAvailable !== true) {
  process.exit(1);
}
NODE
then
  error "OMR health does not report audiveris availability."
  exit 1
fi

for fixture in "${FIXTURES[@]}"; do
  fixture_name="$(basename "$fixture" .pdf)"
  summary_path="$ARTIFACT_DIR/${fixture_name}.json"
  echo "[pilot] audiveris scenario for $fixture_name"
  set +e
  MVP_BASE_URL="http://127.0.0.1:3000" \
    MVP_SCENARIO_FIXTURE="$fixture" \
    MVP_SCENARIO_SUMMARY_PATH="$summary_path" \
    MVP_SCENARIO_AUTH_MODE="session" \
    MVP_SCENARIO_USER_EMAIL="pilot-${fixture_name}@example.com" \
    MVP_SCENARIO_USER_PASSWORD="PilotPassw0rd!" \
    MVP_SCENARIO_USER_NAME="Pilot Tester" \
    MVP_SCENARIO_TEST_TIMEOUT_MS="900000" \
    MVP_SCENARIO_CONVERSION_TIMEOUT_MS="600000" \
    MVP_SCENARIO_EXPORT_TIMEOUT_MS="180000" \
    pnpm --filter @grifftab/web test:e2e:mvp
  status=$?
  set -e
  if [ $status -ne 0 ]; then
    overall_status=$status
  fi
done

SUMMARY_FILE="$SUMMARY_FILE" ARTIFACT_DIR="$ARTIFACT_DIR" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const dir = process.env.ARTIFACT_DIR;
const files = fs
  .readdirSync(dir)
  .filter((file) => file.endsWith(".json"))
  .sort();

const runs = files.map((file) => {
  const fullPath = path.join(dir, file);
  const body = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  return {
    file,
    result: body.result ?? "failed",
    conversionId: body.conversionId ?? null,
    arrangementId: body.arrangementId ?? null,
    exportId: body.exportId ?? null
  };
});

const summary = {
  timestamp: new Date().toISOString(),
  mode: "audiveris",
  totalRuns: runs.length,
  passed: runs.filter((run) => run.result === "passed").length,
  failed: runs.filter((run) => run.result !== "passed").length,
  runs
};

fs.mkdirSync(path.dirname(process.env.SUMMARY_FILE), { recursive: true });
fs.writeFileSync(process.env.SUMMARY_FILE, JSON.stringify(summary, null, 2));
NODE

echo "[pilot] audiveris summary: $SUMMARY_FILE"
exit $overall_status
