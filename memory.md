# GriffTab Memory

Last updated: 2026-02-18

## Snapshot
- Foundation scaffold has been advanced to Sprint 1 runtime wiring.
- Auth, queue orchestration, OMR runtime, mapping engine, and renderer are implemented.
- Sprint 2 micro-sprint export slice is implemented with queued PDF generation and status polling API.
- Sprint 2 hardening priorities are implemented (Convex/auth hardening, OMR normalization expansion, benchmark harness).
- Practice-mode runtime MVP is implemented with authenticated arrangement playback UI.
- Sprint 3 export history retention is implemented with latest-projection + append-only history model.
- Practice-mode v2 is implemented with loop controls, deterministic loop playback, and keyboard shortcuts.
- Benchmark harness dataset is expanded to 8 executable licensed fixtures across JSON, MusicXML, and delimited parser paths.
- Single-session sequential branch workflow is the active protocol (parallel worktree flow retired).
- Public sharing remains blocked by default pending legal completion.

## Decisions (Locked)
- Monorepo: pnpm + Turborepo
- Web: Next.js 14 + TypeScript + Tailwind
- OMR: Pluggable provider, Audiveris default
- Backend split: BetterAuth for auth/session, Convex for domain logic
- BetterAuth store: Postgres
- Queue: Redis + BullMQ
- Storage: S3-compatible
- Deployment: Dokploy (Docker Compose)
- Observability: Sentry + JSON logs

## Current State
- API routes are no longer deterministic stubs; conversion + arrangement routes are runtime-backed and authenticated.
- Worker executes queue jobs and updates conversion states.
- Export flow is runtime-backed: queue-driven PDF generation, object storage artifact upload, latest status projection, and append-only history retention.
- `GET /api/arrangements/:id/export` now returns live export status and signed download URL for completed artifacts.
- `GET /api/arrangements/:id/exports` now returns owner-scoped newest-first export history.
- `POST /api/arrangements/:id/export` now accepts optional `{ force: true }` for explicit re-export attempts.
- OMR service returns typed failure codes and normalized score payloads.
- OMR parser pipeline now supports JSON, delimited fallback, and MusicXML normalization inputs.
- Mapping/renderer packages now provide deterministic v1 implementations with tests.
- Convex/auth hardening now enforces secure deployment behavior:
  - stronger secret/config expectations in secure deployments
  - deployment-aware fail-closed Convex auth requirements
  - owner-scoped reads/writes with lazy owner backfill for legacy records
- Benchmark harness package and CI advisory integration are in place with expanded licensed fixtures and strict threshold defaults.
- Root benchmark CLI handling now supports both `pnpm benchmark --strict` and forwarded forms like `pnpm benchmark -- --strict`.
- Practice route `/practice/[arrangementId]` is implemented with tempo slider, play/pause auto-scroll, loop range controls, and keyboard shortcuts.
- Project context docs are synchronized to include hardening + practice completion (`PROJECT_SPEC.md`, `PROJECT_PLAN.md`, `memory.md`).

## Open Risks
- Docker CLI unavailable in this execution environment, so compose config validation could not run here.
- Benchmark dataset remains synthetic-heavy; thresholds still need calibration against broader licensed repertoire.
- Practice runtime still lacks MIDI/audio integration follow-up beyond v2 loop+shortcut scope.

## Next Actions
1. Run Docker compose smoke validation successfully in a Docker-enabled environment and archive passing evidence.
2. Calibrate benchmark thresholds using broader real licensed fixtures beyond the current synthetic-heavy set.
3. Scope next practice increment for MIDI/audio follow-up.
4. Continue legal/licensing workflow and reviewer assignment.

## Next Session Bootstrap
1. Start from updated `main` after Sprint 4 merges and verify clean state:
- `git status -sb`
- `git log --oneline -n 3`
2. Run baseline checks:
- `pnpm install`
- `pnpm validate:skills`
- `pnpm validate:memory`
- `pnpm verify`
3. Run Docker smoke in Docker-enabled host and append results to:
- `docs/qa/docker-smoke-sprint3.md`
4. Before merge, keep final context sync in one commit touching:
- `PROJECT_SPEC.md`
- `PROJECT_PLAN.md`
- `memory.md`

## Session Log Template
### YYYY-MM-DD
- Completed:
- Decisions made:
- Blockers:
- Next:

### 2026-02-11
- Completed:
- Implemented Sprint 1 runtime wiring across web, worker, OMR service, mapping engine, and renderer.
- Added BetterAuth route handler and session gate for protected API endpoints.
- Added Convex schema/functions for conversions and arrangements.
- Added queue payload and OMR error contracts, plus new unit/integration tests.
- Implemented Sprint 2 micro-sprint export runtime: Convex export persistence, worker PDF pipeline, and authenticated export trigger/status APIs.
- Added `@grifftab/renderer-pdf` package with baseline printable PDF renderer and tests.
- Synced project context and workflow docs for next-session continuity across spec/plan/agent docs/QA acceptance.
- Passed quality gates: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm validate:skills`, `pnpm validate:memory`.
- Decisions made:
- Kept `FEATURE_PUBLIC_SHARING=false` and legal guardrails unchanged.
- Kept Sprint 1 scope backend/core-focused (no practice UI implementation).
- Kept Sprint 2 export model latest-only per arrangement (no history table yet).
- Blockers:
- Docker CLI unavailable in this environment (`docker: command not found`), compose validation not executed.
- Next:
- Run compose validation in Docker-enabled environment.
- Continue Sprint 2 hardening (Convex/auth + OMR normalization) and benchmark dataset integration.

### 2026-02-12
- Completed:
- Implemented Sprint 2 hardening phases across auth/Convex, OMR normalization, and benchmark harness.
- Implemented practice runtime MVP route and player UI with deterministic tempo-based auto-scroll helpers/tests.
- Merged stacked sprint branches into `main` in order:
  - `codex/feat/auth-convex-hardening`
  - `codex/feat/omr-normalization-expansion`
  - `codex/feat/benchmark-regression-harness`
  - `codex/feat/practice-runtime-mvp`
- Passed required quality gates on merged `main`:
  - `pnpm test`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
- Implemented Sprint 3 export history + benchmark confidence + workflow orchestration:
  - added history+latest export persistence model and new route `GET /api/arrangements/:id/exports`
  - added force re-export support via `POST /api/arrangements/:id/export` body `{ force: true }`
  - expanded benchmark manifest to 5 licensed executable fixtures across all supported tunings
  - fixed benchmark CLI forwarding handling and CI benchmark JSON invocation
  - added `scripts/docker-smoke.sh` and Sprint 3 Docker smoke runbook
  - added parallel worktree orchestration playbook + AGENTS/CLAUDE workflow protocol updates
- Decisions made:
- Kept benchmark CI advisory/non-blocking for now with future strict-mode path.
- Kept practice scope intentionally bounded to MVP runtime behavior only.
- Adopted export history retention model as history+latest (ADR-0007).
- Blockers:
- Local policy in this environment blocks branch deletion commands (`git branch -d`), so merged feature branches could not be removed locally here.
- Docker CLI unavailable in this environment (`docker: command not found`), so Sprint 3 smoke script could not be executed here.
- Next:
- Execute `./scripts/docker-smoke.sh` in a Docker-enabled host and attach results.
- Continue threshold tuning on broader licensed repertoire.

### 2026-02-13
- Completed:
- Re-ran full verification pipeline via `pnpm verify` on `codex/feat/sprint3-export-history` and confirmed green gates.
- Finalized sprint-close context sync updates for `PROJECT_SPEC.md`, `PROJECT_PLAN.md`, and `memory.md`.
- Added explicit next-session bootstrap checklist to reduce startup ambiguity in new Codex sessions.
- Decisions made:
- Keep branch as the active handoff branch for follow-up work until Docker smoke evidence is captured.
- Blockers:
- Docker still unavailable in this environment, so smoke evidence must be collected externally.
- Next:
- Push branch and open/refresh PR for Sprint 3 closure review.
- Run Docker smoke on a Docker-enabled host and append output evidence.

### 2026-02-17
- Completed:
- Implemented Sprint 4 practice-mode v2 behavior in web runtime:
  - loop range controls with inclusive boundaries
  - deterministic looped auto-scroll playback
  - keyboard shortcuts (`Space`, `L`, `R`, `ArrowUp`, `ArrowDown`) with editable-target guardrails
- Expanded benchmark dataset from 5 to 8 licensed executable fixtures (`sample-licensed-006..008`) with strict-threshold rationale in manifest notes.
- Ran strict benchmark with Sprint 4 artifact output and confirmed pass (`8 passed`, `0 failed`, `1 skipped`).
- Updated QA docs (`benchmark-harness`, `acceptance-criteria`, `docker-smoke-sprint3`) with Sprint 4 coverage and dated docker evidence.
- Merged `codex/feat/sprint4-benchmark-docker` into `main`, rebased `codex/feat/sprint4-practice-v2` onto updated `main`, and synced context docs.
- Passed required gates on both sprint branches:
  - `pnpm test`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm validate:skills`
  - `pnpm validate:memory`
- Decisions made:
- Kept benchmark CI advisory; strict benchmark remains enforced at branch/manual gate level.
- Kept strict benchmark thresholds unchanged for Sprint 4 fixtures with documented rationale.
- Kept practice v2 limited to loop+shortcut scope; deferred MIDI/audio.
- Blockers:
- Docker CLI still unavailable in this environment, so smoke run is documented as blocked here and must be rerun in Docker-enabled host.
- Next:
- Merge `codex/feat/sprint4-practice-v2` into `main`.
- Execute `./scripts/docker-smoke.sh` in Docker-enabled host and append successful evidence.
