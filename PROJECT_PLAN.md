# GriffTab Execution Plan (Phase 1+2+3 Foundation)

Last updated: 2026-03-05

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
Status: Completed (runtime wiring ready; pilot compose/test workflow available)

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

## Sprint 5 Progress (Implemented)
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

## Sprint 6 Progress (Implemented)
1. Local MVP orchestration workflow implemented:
- added root commands `mvp:infra:up`, `mvp:apps:up`, `mvp:scenario`, `mvp:down`
- added `scripts/mvp/*` host-app + Docker-infra workflow with replay mode default
- added fail-fast Docker checks and deterministic `.artifacts/mvp` log output
2. MVP realistic smoke automation implemented:
- added Playwright config and smoke test at `apps/web/e2e/*`
- smoke covers convert -> practice token edit -> export flow
- run outputs `.artifacts/mvp-scenario-summary.json` with step-level telemetry
3. Benchmark gate hardened to MVP target:
- expanded benchmark manifest from 8 to 12 licensed fixtures (`sample-licensed-009..012`)
- preserved parser spread (`json`, `musicxml`, `delimited`) and tuning spread (`GCFB`, `ADGC`, `BEADG`, `CFBB`)
4. CI gate hardened:
- switched benchmark step to strict blocking (`pnpm benchmark --strict --json .artifacts/benchmark-summary.json`)
- added advisory MVP scenario step + artifact upload
5. QA docs and runbooks updated:
- added `docs/qa/mvp-local-smoke.md`
- updated acceptance criteria and benchmark harness docs for Sprint 6 behavior

## Sprint 6 QA/Resilience Hardening (2026-02-27)
1. Local MVP infra fix completed:
- fixed `scripts/mvp/infra-up.sh` MinIO bootstrap invocation by setting explicit `/bin/sh` entrypoint for `minio/mc`.
2. Local runtime resilience completed:
- web/worker S3 clients now auto-recover missing buckets in `development|test` by probing/creating bucket before write and retrying on missing-bucket errors.
- conversion upload route now fails with deterministic `503` response when object storage write fails.
3. Shared local fallback state completed:
- web local domain fallback now persists to shared file state (`LOCAL_DOMAIN_STORE_PATH`) in local-dev mode.
- worker Convex client now falls back to the same local file state for conversion/export mutations/queries when Convex is unavailable in local-dev mode.
4. Local MVP script hardening completed:
- `mvp:apps:up` now exports/reset `LOCAL_DOMAIN_STORE_PATH` state.
- `mvp:down` now removes local fallback state artifact.
5. Verification evidence:
- `pnpm mvp:scenario` passes end-to-end in this environment after fixes.
- quality gates pass (`pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`).

## Sprint 7 Pilot Readiness Progress (In Progress)
1. Pilot docker runtime packaging implemented:
- added service Dockerfiles:
  - `apps/web/Dockerfile`
  - `apps/worker/Dockerfile`
  - `apps/omr-service/Dockerfile` (Node + Java 21 + Audiveris package install)
- added pilot compose stack:
  - `docker-compose.pilot.yml`
- added pilot orchestration commands/scripts:
  - `pnpm pilot:up`
  - `pnpm pilot:down`
  - `pnpm pilot:smoke`
2. Pilot auth and legal acknowledgement implemented:
- added `/login` and `/register` pages for BetterAuth email/password flow
- dashboard now hides dev-user controls outside `development|test`
- conversion ingestion now supports additive `rightsConfirmed` and pilot enforcement:
  - `ENFORCE_UPLOAD_RIGHTS_CONFIRMATION=true` blocks unconfirmed uploads
- conversion runtime metadata now persists:
  - `rightsConfirmedAt`
  - `rightsConfirmationSource`
3. OMR diagnostics hardening implemented:
- `/health` now returns additive Audiveris capability fields:
  - `audiverisAvailable`
  - `audiverisVersion`
4. Scenario and evidence tooling expanded:
- `pnpm mvp:scenario` now supports:
  - `--mode replay|audiveris`
  - `--auth dev-header|session`
  - `--fixture <pdf>`
  - `--summary <path>`
- added audiveris batch scenario command:
  - `pnpm pilot:scenario:audiveris`
- added evidence bundling:
  - `pnpm pilot:evidence`
5. Benchmark/replay expansion implemented:
- benchmark manifest expanded from 12 to 20 licensed fixtures (`sample-licensed-013..020`)
- replay manifest expanded for Sprint 7 fixture set
- added fixture helper command:
  - `pnpm fixtures:register --pdf <path> --normalized <path> --id <id> --license licensed`
6. CI/workflow updates implemented:
- replay scenario on main CI is now required (non-advisory)
- added dedicated audiveris scenario workflow (`.github/workflows/audiveris-scenario.yml`)
- compose validation workflow now includes pilot compose config validation
7. Architecture/docs updates implemented:
- added ADR-0009 (`docs/architecture/ADR-0009-pilot-local-docker-runtime.md`)
- added pilot QA runbook (`docs/qa/pilot-local-docker.md`)
- updated QA acceptance and benchmark docs for Sprint 7 criteria
8. Current validation outcome (latest run):
- `pilot:smoke` failed in session-auth login step.
- OMR health in pilot smoke reported `audiverisAvailable=false`.
- `pilot:scenario:audiveris` summary currently reports `passed=0 failed=3`.

## Sprint 8 Local MVP GA Progress (Implemented)
1. Local MVP replay gate was codified as one command:
- added `pnpm mvp:ready` (runs `verify` + strict benchmark + replay scenario).
- command fails if `.artifacts/mvp-scenario-summary.json` does not report `result=passed`.
2. Release preflight command was added for compose validation:
- added `pnpm release:compose:check`.
- validates `docker-compose.yml`, `docker-compose.dev.yml`, and `docker-compose.pilot.yml`.
3. QA/docs handoff was updated for local MVP-first execution:
- `docs/qa/mvp-local-smoke.md` now promotes `pnpm mvp:ready` as primary gate.
- README now includes direct-main push flow with `origin` fallback via `gh`.
- pilot/audiveris track remains explicit but non-blocking for replay MVP GA.
4. Branch workflow aligned to single-session protocol:
- local `main` was fast-forwarded to Sprint 7 baseline before Sprint 8 branch creation.
- Sprint 8 changes live on `codex/fix/sprint8-mvp-local-ga`.

## Next Sprint Focus
1. Fix pilot session-auth smoke path and re-run `pnpm pilot:smoke` until green.
2. Fix Audiveris runtime/container availability and re-run `pnpm pilot:scenario:audiveris` until green.
3. Re-run full pilot gate sequence and archive passing evidence artifacts (`benchmark`, replay scenario, audiveris scenarios, pilot smoke, pilot evidence bundle).
4. Continue legal/licensing workflow and reviewer assignment for broader repertoire readiness.
5. Scope practice-mode audio/MIDI follow-up beyond MVP replay GA.

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
