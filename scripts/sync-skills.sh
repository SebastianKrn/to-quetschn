#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT_DIR/.agents/skills"
DEST="$ROOT_DIR/.claude/skills"

mkdir -p "$DEST"

find "$DEST" -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} +

for skill_dir in "$SRC"/*; do
  if [[ -d "$skill_dir" ]]; then
    cp -R "$skill_dir" "$DEST/"
  fi
done

echo "Skills synced from .agents/skills to .claude/skills"
