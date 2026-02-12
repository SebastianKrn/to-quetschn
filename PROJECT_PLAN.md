# GriffTab Execution Plan (Phase 1+2 Foundation)

Last updated: 2026-02-12

## Objective
Establish a production-ready foundation where coding agents can implement features quickly and safely with minimal ambiguity.

## Workstreams

### 1. Monorepo Foundation
- Initialize apps/packages layout
- Standardize lint/typecheck/test/build tasks with Turborepo
- Add CI pipelines for quality gates
Status: Completed

### 2. Domain Contracts
- Define canonical domain types for conversion, mapping, rendering, and export
- Freeze queue and storage interfaces
- Add contract tests and snapshots
Status: Completed (expanded in Sprint 1 + Sprint 2 export contracts)

### 3. Service Boundaries
- OMR service stub with Audiveris adapter contract
- Worker service for conversion/export queue processing
- Web API stubs aligned to contract definitions
Status: Upgraded to runtime implementation (Sprint 1 conversion + Sprint 2 export)

### 4. Deployment Baseline
- Docker Compose stack for Dokploy (`web`, `omr-service`, `worker`, `postgres`, `redis`, `minio`)
- Environment templates for `dev`, `staging`, `prod`
- Infra docs for secret and environment mapping
Status: Completed (runtime wiring ready; docker validation pending in environments with Docker CLI)

### 5. Agent Workflow Optimization
- Create and mirror 4 custom skills in `.agents/skills` and `.claude/skills`
- Add sync and validation scripts to prevent drift
- Add structured `memory.md` discipline checks
Status: Completed

### 6. Governance and Guardrails
- Proprietary internal license marker
- Legal policy drafts with explicit launch gate
- Public sharing flag defaulted to `false`
Status: Completed (unchanged in Sprint 1)

## Sprint 1 Runtime Progress (Implemented)
1. BetterAuth route + session gate integrated into protected API routes.
2. Convex schema/functions added for conversion and arrangement persistence.
3. OMR provider/service now emit typed deterministic errors with normalization path.
4. Mapping engine v1 implemented with tuning-driven heuristics and transpose suggestions.
5. SVG renderer layout v1 implemented with measure/token rendering.
6. Worker queue orchestration implemented for processing/completion/failure/transpose-confirmation flows.
7. API route stubs replaced by runtime handlers (health route remains public).
8. Quality gates passed for runtime slice: test, lint, typecheck, build, skills validation, memory validation.

## Sprint 2 Hardening + Practice Progress (Implemented)
1. Convex/Auth hardening completed:
- secure deployment-aware env validation
- fail-closed Convex key expectations in secure deployments
- restricted dev header auth to `development|test`
- owner scoping with lazy owner backfill
2. OMR normalization expansion completed:
- parser pipeline supports JSON, delimited fallback, and MusicXML variants
- provider now inspects Audiveris export artifacts before stdout fallback
- OMR service emits richer structured diagnostics with parser-attempt context
3. Benchmark regression harness completed:
- added benchmark workspace package + CLI/tests
- added manifest contract, starter licensed fixture set, and docs
- wired advisory benchmark step into CI with strict-mode option
4. Practice runtime MVP completed:
- authenticated `/practice/[arrangementId]` page
- client practice player with tempo control + play/pause auto-scroll
- German-first UI labels; responsive layout baseline

## Next Sprint Focus
1. Expand benchmark dataset with additional licensed fixtures and tune thresholds from observed regressions.
2. Evaluate export history retention model (beyond latest-only status per arrangement).
3. Run Docker compose validation in Docker-enabled environment and capture deployment smoke notes.
4. Plan practice-mode v2 scope (looping, shortcuts, optional MIDI/audio) behind explicit feature boundaries.
5. Continue legal/licensing workflow and reviewer assignment for broader dataset readiness.

## Sprint 2 Micro-Sprint Progress (Implemented)
1. Added export contracts (`ExportJob`, `ExportQueuePayload`) and export queue topics.
2. Added Convex export persistence/functions with latest export state per arrangement.
3. Added `@grifftab/renderer-pdf` for baseline printable PDF generation.
4. Added worker export pipeline with status transitions and S3 artifact upload.
5. Replaced export placeholder API with authenticated enqueue + status polling route behavior.
6. Added ADR-0005 documenting export ownership and artifact pipeline.
7. Passed quality gates for export slice: test, lint, typecheck, build.

## Acceptance For Sprint 1 Runtime Slice
- `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` pass.
- `pnpm validate:skills` and `pnpm validate:memory` pass.
- Conversion API accepts multipart and JSON ingestion modes.
- Worker pipeline updates conversion states deterministically.
- Legal/public-sharing guardrail remains unchanged (`FEATURE_PUBLIC_SHARING=false`).

## Acceptance For Sprint 2 Hardening + Practice Slice
- `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` pass.
- `pnpm validate:skills` and `pnpm validate:memory` pass.
- Auth/Convex routes enforce owner-scoped access semantics.
- OMR provider normalization supports JSON + delimited + MusicXML variants.
- Benchmark harness executes licensed entries and skips pending entries with explicit reason.
- Practice runtime page loads authenticated arrangements and applies deterministic tempo-based auto-scroll behavior.
