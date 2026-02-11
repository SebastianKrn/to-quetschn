# GriffTab Execution Plan (Phase 1+2 Foundation)

Last updated: 2026-02-11

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

## Next Sprint Focus
1. Harden Convex production deployment/auth and migration workflow.
2. Expand OMR normalization for real Audiveris output artifacts beyond baseline adapters.
3. Add benchmark dataset harness with licensed reference PDFs.
4. Start practice-mode runtime (auto-scroll + tempo UI) using persisted arrangements.
5. Decide whether to keep latest-only export persistence or add export history model.
6. Run Docker compose validation in environment with Docker CLI and capture deployment smoke notes.

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
