# CLAUDE.md - Claude Code Workflow

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
- Feature: `claude/feat/<topic>`
- Fix: `claude/fix/<topic>`

## Coding Rules
- Maintain interface boundaries exactly as defined in `packages/domain-types`.
- Keep publishing disabled unless legal gate is explicitly lifted.
- Prefer incremental, test-backed changes.

## Skills
Use project skills from `.claude/skills/*` when task trigger matches skill description.

## Current Phase
- Sprint 1 runtime slice is completed as of 2026-02-11 (auth + Convex + queue + OMR + mapping + renderer + runtime API handlers).
- Sprint 2 export micro-sprint is completed as of 2026-02-11 (queued PDF renderer + worker export pipeline + export status API + artifact storage).
- Prioritize Sprint 2 hardening:
  - Convex production deployment/auth hardening
  - OMR normalization expansion
  - benchmark dataset and regression harness
  - practice-mode runtime integration
