# AGENTS.md - Codex Workflow

Read in this order before coding:
1. `PROJECT_SPEC.md`
2. `PROJECT_PLAN.md`
3. `memory.md`
4. `docs/` relevant to your task

## Quality Gates (Must pass in order)
1. Implement
2. Test (`pnpm test`)
3. Lint (`pnpm lint`)
4. Typecheck (`pnpm typecheck`)
5. Build (`pnpm build`)
6. Commit

## Session Start Checklist
1. `git status -sb`
2. `pnpm install`
3. `pnpm validate:skills`
4. Confirm `memory.md` is current (`pnpm validate:memory`)

## Branching
- Feature: `codex/feat/<topic>`
- Fix: `codex/fix/<topic>`

## Coding Rules
- Keep implementation contract-first.
- Do not bypass legal guardrails for public sharing.
- Keep all user-visible product defaults German-first where applicable.
- Preserve pluggable OMR interface; do not hard-wire provider logic into web routes.

## Skills
Use project skills from `.agents/skills/*` when task trigger matches skill description.

## Current Phase
- Foundation bootstrap is complete as of 2026-02-11.
- Prioritize Sprint 1 runtime implementation (auth/domain wiring, OMR execution, mapping engine, renderer layout).
