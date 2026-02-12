# GriffTab Memory

Last updated: 2026-02-12

## Snapshot
- Foundation scaffold has been advanced to Sprint 1 runtime wiring.
- Auth, queue orchestration, OMR runtime, mapping engine, and renderer are implemented.
- Sprint 2 micro-sprint export slice is implemented with queued PDF generation and status polling API.
- Sprint 2 hardening priorities are implemented (Convex/auth hardening, OMR normalization expansion, benchmark harness).
- Practice-mode runtime MVP is implemented with authenticated arrangement playback UI.
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
- Export flow is runtime-backed: queue-driven PDF generation, object storage artifact upload, and latest export status persistence.
- `GET /api/arrangements/:id/export` now returns live export status and signed download URL for completed artifacts.
- OMR service returns typed failure codes and normalized score payloads.
- OMR parser pipeline now supports JSON, delimited fallback, and MusicXML normalization inputs.
- Mapping/renderer packages now provide deterministic v1 implementations with tests.
- Convex/auth hardening now enforces secure deployment behavior:
  - stronger secret/config expectations in secure deployments
  - deployment-aware fail-closed Convex auth requirements
  - owner-scoped reads/writes with lazy owner backfill for legacy records
- Benchmark harness package and CI advisory integration are in place with starter licensed fixtures.
- Practice route `/practice/[arrangementId]` is implemented with tempo slider, play/pause auto-scroll, and mobile-safe layout.
- Project context docs are synchronized to include hardening + practice completion (`PROJECT_SPEC.md`, `PROJECT_PLAN.md`, `memory.md`).

## Open Risks
- Export persistence is intentionally latest-only per arrangement (no historical export audit trail yet).
- Docker CLI unavailable in this execution environment, so compose config validation could not run here.
- Benchmark dataset coverage is still small; regression confidence depends on growing licensed fixtures.
- Practice runtime remains MVP-only (no loop editor, shortcuts, or MIDI/audio integration).

## Next Actions
1. Expand benchmark dataset with more licensed fixtures and calibrate thresholds from real runs.
2. Decide whether to add export-history retention beyond latest-only model.
3. Run Docker compose validation in Docker-enabled environment and record smoke results.
4. Plan practice-mode v2 enhancements behind explicit scope gates.
5. Continue legal/licensing workflow and reviewer assignment.

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
- Decisions made:
- Kept benchmark CI advisory/non-blocking for now with future strict-mode path.
- Kept practice scope intentionally bounded to MVP runtime behavior only.
- Blockers:
- Local policy in this environment blocks branch deletion commands (`git branch -d`), so merged feature branches could not be removed locally here.
- Next:
- Clean up merged local branches in an environment where branch-deletion policy permits `git branch -d`.
- Continue benchmark dataset expansion and Docker-enabled deployment validation.
