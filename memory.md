# GriffTab Memory

Last updated: 2026-02-11

## Snapshot
- Repository initialized with monorepo scaffolding and contract-first boundaries.
- Community sharing is blocked by default pending legal completion.
- Foundation verification is green (`pnpm verify` completed successfully).

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
- Foundation code and docs are in place.
- API endpoints are stubs wired to shared contracts.
- Skill pack exists for architecture, OMR ops, mapping, and quality/release.
- CI workflows for quality gates and compose validation are configured.

## Open Risks
- Legal handling for copyrighted arrangement sharing not started.
- Benchmark dataset only partially ready.
- Music expert reviewer not yet assigned.

## Next Actions
1. Wire BetterAuth adapter and Convex function layer to real stores.
2. Integrate real Audiveris invocation path and parsing pipeline.
3. Implement mapping heuristics and renderer layout engine.
4. Add end-to-end tests with reference PDFs.

## Session Log Template
### YYYY-MM-DD
- Completed:
- Decisions made:
- Blockers:
- Next:

### 2026-02-11
- Completed:
- Initialized repository and full monorepo scaffold (`apps/`, `packages/`, `docs/`, `infra/`, `.github/`).
- Added shared contracts (`ConversionJob`, `OmrProvider`, `MappingEngine`, queue topics, storage interface) and API stubs.
- Added mirrored Codex/Claude skill pack (4 skills) with sync/validation scripts.
- Added env templates, docker compose files, ADRs, legal/QA baseline docs.
- Ran and passed: `pnpm install` and `pnpm verify` (lint + typecheck + test + build + validations).
- Decisions made:
- Kept community sharing disabled by default pending legal completion.
- Kept implementation at interface/stub level for foundation-only scope.
- Blockers:
- No blocker for foundation completion.
- Next:
- Start Sprint 1 implementation on auth/domain/OMR/mapping runtime integration.
