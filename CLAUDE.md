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
- Sprint 1-4 slices are completed (runtime foundation, export history, benchmark expansion to 8 fixtures, practice v2 loop/shortcuts).
- Sprint 5 implemented so far as of 2026-02-18:
  - single-session workflow cleanup (parallel worktree protocol retired)
  - hybrid OMR mode (`OMR_MODE=replay|audiveris`) with replay provider + manifest
  - German-first MVP dashboard flow (upload, conversion polling, transpose confirm, practice, export polling)
  - owner-scoped token correction flow (`PATCH /api/arrangements/:id`) with practice editor controls
- Prioritize next:
  - local realistic scenario automation (`mvp:*` scripts + Playwright smoke artifact)
  - benchmark hardening to 12 licensed fixtures + strict CI blocking gate
  - Docker-enabled compose/deployment smoke validation evidence capture
  - practice-mode MIDI/audio follow-up after MVP local GA bar

## Single-Session Branch Protocol
- Use one Claude Code session in one workspace only (`/Users/skern/Work/projects-01/to-quetschn`).
- For multi-part work, use sequential feature branches and merge in order:
  - `git fetch origin`
  - `git switch main`
  - `git pull --ff-only`
  - `git switch -c claude/feat/<slice>`
- Keep context/docs ownership in the final branch of the sprint:
  - `memory.md`
  - `PROJECT_SPEC.md`
  - `PROJECT_PLAN.md`

## Branch Hygiene
- After a feature branch is merged into `main`, delete it locally:
  - `git branch -d claude/feat/<slice>`
- Prune stale remotes during sprint close:
  - `git fetch --prune`
