# GriffTab Execution Plan (Phase 1+2+3 Foundation)

Last updated: 2026-02-18

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

## Sprint 3 Progress (Implemented)
1. Export history retention implemented with history+latest model:
- latest projection preserved for `GET /api/arrangements/:id/export`
- append-only export history records added for auditability
- force re-export trigger supported via `POST /api/arrangements/:id/export` body `{ force: true }`
- new history route `GET /api/arrangements/:id/exports`
2. Benchmark confidence expanded:
- manifest expanded to 5 executable licensed fixtures
- tuning coverage now includes `GCFB`, `ADGC`, `BEADG`, `CFBB`
- parser coverage includes JSON, MusicXML, and delimited fallback paths
- strict thresholds documented and enforced per fixture
3. Benchmark workflow hardening completed:
- root benchmark CLI now handles forwarded separator args (`--`)
- CI benchmark step now writes JSON artifact with working root command form
4. Orchestration workflow hardening completed:
- added dual-session worktree playbook
- aligned verify script ordering with declared sprint gate order
- updated agent workflow docs with ownership and merge protocol
- retired dual-session worktree protocol in Sprint 5; single-session sequential branching is now the active workflow
5. Docker smoke runbook delivered for Docker-enabled execution:
- added executable `scripts/docker-smoke.sh`
- captured blocked evidence in this environment (`docker: command not found`)

## Sprint 4 Progress (Implemented)
1. Practice mode v2 runtime shipped:
- added loop range controls (`startMeasure`, `endMeasure`) with inclusive bounds
- implemented deterministic loop playback that jumps back to loop start while active
- added keyboard shortcuts (`Space`, `L`, `R`, `ArrowUp`, `ArrowDown`) with form-field/contenteditable guardrails
- expanded practice helper tests for loop normalization, scroll bounds, shortcut stepping, and reset behavior
2. Benchmark confidence expanded:
- manifest expanded from 5 to 8 executable licensed fixtures (`sample-licensed-006..008`)
- maintained strict threshold defaults and documented Sprint 4 tuning rationale in manifest entry notes
- verified strict benchmark run with artifact output (`.artifacts/benchmark-summary-sprint4.json`)
3. Benchmark/docs hardening completed:
- updated benchmark harness QA doc with Sprint 4 strict artifact command and threshold decision notes
- updated runtime acceptance criteria with Sprint 4 practice + benchmark + docker expectations
4. Docker smoke evidence updated:
- executed `./scripts/docker-smoke.sh` in this environment on 2026-02-17
- recorded blocked output (`docker: command not found`) in `docs/qa/docker-smoke-sprint3.md`

## Sprint 5 Progress (Implemented So Far)
1. Workflow cleanup completed:
- retired parallel worktree protocol and aligned docs to single-session sequential branching
- added explicit branch hygiene guidance and `.artifacts/` ignore policy
2. Hybrid OMR runtime completed:
- added replay provider in `@grifftab/omr-provider`
- added OMR mode selection in OMR service via `OMR_MODE=replay|audiveris`
- added ADR-0008 and replay manifest baseline
3. MVP core flow dashboard completed:
- replaced scaffold home page with German-first dashboard (upload, status polling, transpose confirm, practice, export)
- added conversion route tests for polling/multipart behavior
4. Token correction editor slice completed:
- added owner-scoped `PATCH /api/arrangements/:id` contract + route + Convex mutation
- added domain contract `UpdateArrangementTokenRequestSchema` and `ApiContracts.updateArrangement`
- wired practice UI token selection/edit/save flow and renderer token metadata
- added arrangement patch API tests and updated route test stubs

## Next Sprint Focus
1. Deliver local realistic scenario automation:
- add `pnpm mvp:infra:up`, `pnpm mvp:apps:up`, `pnpm mvp:scenario`, `pnpm mvp:down`
- add Playwright smoke for convert -> practice -> token edit -> export, writing `.artifacts/mvp-scenario-summary.json`
2. Harden benchmark gate to MVP bar:
- expand manifest from 8 to 12 licensed fixtures with tuning/parser spread
- switch CI benchmark step to strict blocking (`pnpm benchmark --strict --json .artifacts/benchmark-summary.json`)
3. Execute Docker smoke runbook successfully in a Docker-enabled host and archive passing output evidence.
4. Continue legal/licensing workflow and reviewer assignment for broader dataset readiness.
5. Scope practice-mode audio/MIDI follow-up beyond v2 loop+shortcut capabilities after MVP local GA criteria are met.

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
