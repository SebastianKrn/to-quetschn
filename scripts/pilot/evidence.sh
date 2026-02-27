#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="$ROOT_DIR/.artifacts"
EVIDENCE_DIR="$ROOT_DIR/.artifacts/pilot/evidence"

mkdir -p "$EVIDENCE_DIR"

copy_if_exists() {
  local source_path="$1"
  local target_name="$2"
  if [ -f "$source_path" ]; then
    cp "$source_path" "$EVIDENCE_DIR/$target_name"
    return 0
  fi
  return 1
}

copy_if_exists "$SOURCE_DIR/benchmark-summary.json" "benchmark-summary.json" || true
copy_if_exists "$SOURCE_DIR/mvp-scenario-summary.json" "replay-scenario-summary.json" || true
copy_if_exists "$SOURCE_DIR/pilot/audiveris-summary.json" "audiveris-scenario-summary.json" || true
copy_if_exists "$SOURCE_DIR/pilot/pilot-scenario-summary.json" "pilot-docker-scenario-summary.json" || true
copy_if_exists "$SOURCE_DIR/pilot/pilot-smoke.log" "pilot-smoke.log" || true

if [ -d "$SOURCE_DIR/mvp" ]; then
  mkdir -p "$EVIDENCE_DIR/mvp-logs"
  cp "$SOURCE_DIR"/mvp/*.log "$EVIDENCE_DIR/mvp-logs/" 2>/dev/null || true
fi

EVIDENCE_DIR="$EVIDENCE_DIR" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const evidenceDir = process.env.EVIDENCE_DIR;

function listFilesRecursive(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      output.push(...listFilesRecursive(fullPath));
      continue;
    }
    output.push(path.relative(rootDir, fullPath));
  }
  return output.sort();
}

const manifest = {
  timestamp: new Date().toISOString(),
  files: listFilesRecursive(evidenceDir)
};

fs.writeFileSync(
  path.join(evidenceDir, "evidence-manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8"
);
NODE

echo "[pilot] evidence bundle ready at $EVIDENCE_DIR"
