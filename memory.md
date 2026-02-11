# GriffTab Memory

Last updated: 2026-02-11

## Snapshot
- Foundation scaffold has been advanced to Sprint 1 runtime wiring.
- Auth, queue orchestration, OMR runtime, mapping engine, and renderer are implemented.
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
- OMR service returns typed failure codes and normalized score payloads.
- Mapping/renderer packages now provide deterministic v1 implementations with tests.
- Agent context has been updated to treat Sprint 1 runtime as completed and Sprint 2 hardening as active next phase.

## Open Risks
- Convex runtime deployment credentials and migration process still require production hardening.
- OMR normalization still needs expansion for broader real-world Audiveris output variants.
- Docker CLI unavailable in this execution environment, so compose config validation could not run here.
- BetterAuth currently warns on low-entropy default secret in build-time environments.

## Next Actions
1. Harden Convex production auth + deployment flow and remove fallback assumptions.
2. Expand OMR parser normalization for richer Audiveris output structures.
3. Implement production PDF export rendering pipeline.
4. Add benchmark dataset with licensed PDFs and regression harness.
5. Begin practice-mode UI runtime integration.

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
- Passed quality gates: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm validate:skills`, `pnpm validate:memory`.
- Decisions made:
- Kept `FEATURE_PUBLIC_SHARING=false` and legal guardrails unchanged.
- Kept Sprint 1 scope backend/core-focused (no practice UI implementation).
- Blockers:
- Docker CLI unavailable in this environment (`docker: command not found`), compose validation not executed.
- Next:
- Run compose validation in Docker-enabled environment.
- Continue Sprint 2 hardening and benchmark dataset integration.
