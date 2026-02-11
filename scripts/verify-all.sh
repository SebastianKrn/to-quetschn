#!/usr/bin/env bash
set -euo pipefail

pnpm validate:skills
pnpm validate:memory
pnpm lint
pnpm typecheck
pnpm test
pnpm build
