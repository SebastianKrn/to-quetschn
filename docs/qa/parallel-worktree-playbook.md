# Parallel Worktree Playbook

## Goal
Run two Codex sessions in parallel while keeping branch ownership, merge order, and quality gates deterministic.

## Branch and Worktree Setup
```bash
cd /Users/skern/Work/projects-01/to-quetschn
git fetch origin
git switch main
git pull --ff-only
git switch -c codex/feat/sprint3-export-history
git worktree add /Users/skern/Work/projects-01/to-quetschn-bench -b codex/feat/sprint3-benchmark-docker origin/main
```

## Session Ownership
- Session A (`/Users/skern/Work/projects-01/to-quetschn`): export model/API, ADRs, and final context docs (`memory.md`, `PROJECT_SPEC.md`, `PROJECT_PLAN.md`).
- Session B (`/Users/skern/Work/projects-01/to-quetschn-bench`): benchmark fixtures/thresholds, benchmark command fixes, docker smoke artifacts/docs.
- Session B must not edit `memory.md`, `PROJECT_SPEC.md`, `PROJECT_PLAN.md`.

## Required Gates Per Branch
```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm validate:skills
pnpm validate:memory
```

## Sync Cadence
- Minimum two checkpoints per day.
- Session B publishes progress and blockers in `docs/qa/docker-smoke-sprint3.md`.
- Session A integrates Session B only after Session B reports green gates.

## Merge Order
1. Merge `codex/feat/sprint3-benchmark-docker` first.
2. Rebase `codex/feat/sprint3-export-history` onto updated `main`.
3. Merge `codex/feat/sprint3-export-history`.
4. Run full gates on `main` and finish with one context-sync docs commit.

## Conflict Policy
- If both sessions need the same file, Session A is final owner.
- Session B should stop and hand off overlapping changes instead of force-resolving conflicts.
