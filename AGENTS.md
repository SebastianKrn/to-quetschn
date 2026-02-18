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
- Sprint 1 runtime slice is completed as of 2026-02-11 (auth + Convex + queue + OMR + mapping + renderer + runtime API handlers).
- Sprint 2 export micro-sprint is completed as of 2026-02-11 (queued PDF renderer + worker export pipeline + export status API + artifact storage).
- Sprint 2 hardening + practice runtime MVP are completed as of 2026-02-12:
  - Convex/Auth hardening with owner-scoped data access
  - OMR normalization expansion (JSON + delimited + MusicXML paths)
  - benchmark harness with advisory CI integration
  - practice-mode runtime MVP route/UI
- Prioritize next:
  - benchmark dataset expansion and threshold tuning
  - export history model decision (latest-only vs historical retention)
  - Docker-enabled compose/deployment smoke validation
  - practice-mode v2 scoping (looping/shortcuts/MIDI-audio follow-up)

## Single-Session Branch Protocol
- Use one Codex session in one workspace only (`/Users/skern/Work/projects-01/to-quetschn`).
- For multi-part work, use sequential feature branches and merge in order:
  - `git fetch origin`
  - `git switch main`
  - `git pull --ff-only`
  - `git switch -c codex/feat/<slice>`
- Keep context/docs ownership in the final branch of the sprint:
  - `memory.md`
  - `PROJECT_SPEC.md`
  - `PROJECT_PLAN.md`

## Branch Hygiene
- After a feature branch is merged into `main`, delete it locally:
  - `git branch -d codex/feat/<slice>`
- Prune stale remotes during sprint close:
  - `git fetch --prune`
