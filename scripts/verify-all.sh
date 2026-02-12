#!/usr/bin/env bash
set -euo pipefail

pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm validate:skills
pnpm validate:memory
