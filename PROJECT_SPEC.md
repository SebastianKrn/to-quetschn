# GriffTab Project Specification (Normalized)

Last updated: 2026-02-27
Status: Sprint 7 pilot-readiness implementation complete in scope; pilot validation/evidence stabilization in progress

## Implementation Status (Current)
- Foundation scaffold remains verified and intact.
- Sprint 1 runtime is implemented across auth, queue, OMR, mapping, renderer, and worker orchestration.
- Conversion and arrangement API routes are authenticated and persistence-backed.
- Export API is runtime-backed with authenticated trigger (`POST`) and status polling (`GET`).
- Export jobs are queue-driven and persisted in Convex with history+latest model:
  - latest projection per arrangement for status polling
  - append-only export history records for audit and timeline reads
- Worker renders baseline printable PDF and uploads artifacts to S3-compatible storage.
- Convex schema/functions are present for conversion/arrangement runtime persistence.
- Conversion ingestion supports both multipart PDF upload and JSON `inputFileId` submission.
- Auth/Convex hardening is implemented for secure deployments:
  - fail-closed env validation for deployment mode
  - secure BetterAuth options + restricted dev-header auth behavior
  - owner-scoped Convex data access with lazy owner backfill for legacy ownerless records
  - server/worker Convex admin auth wiring with deployment-time key requirements
- OMR normalization pipeline now supports JSON, delimited fallback, and MusicXML payload variants.
- Benchmark regression harness is implemented with licensed-manifest filtering and strict CI execution.
- Benchmark dataset now includes 12 executable licensed fixtures across JSON, MusicXML, and delimited parser paths with strict thresholds.
- Benchmark dataset is expanded to 20 executable licensed fixtures for Sprint 7 pilot gating.
- Practice mode v2 is implemented at `/practice/[arrangementId]` with authenticated load, SVG rendering, tempo control, loop range controls, deterministic loop playback, and keyboard shortcuts.
- OMR service supports hybrid provider selection via `OMR_MODE`:
  - `replay` mode for deterministic local runs using checksum manifest fixtures
  - `audiveris` mode for real extraction parity
- Web home page now provides German-first MVP conversion dashboard flow (upload, conversion status polling, transpose confirm, practice entry, export polling).
- Web pilot auth UX now includes dedicated `/login` and `/register` pages; non-dev dashboard access is session-gated.
- Dashboard now supports upload-rights acknowledgement and conversion request enforcement via `ENFORCE_UPLOAD_RIGHTS_CONFIRMATION=true`.
- Arrangement correction flow supports owner-scoped single-token updates via `PATCH /api/arrangements/:id`.
- Practice UI supports token selection from SVG and row/button/direction mutation with save feedback.
- Local MVP orchestration scripts are available for deterministic smoke validation:
  - `pnpm mvp:infra:up`
  - `pnpm mvp:apps:up`
  - `pnpm mvp:scenario`
  - `pnpm mvp:down`
- Local MVP infra now hardens MinIO bucket bootstrap (`minio/mc` entrypoint fix), preventing `mc: sh is not a recognized command` failures.
- Local `development + CONVEX_DEPLOYMENT=local-dev` runs now share fallback domain state between web and worker via `LOCAL_DOMAIN_STORE_PATH` for deterministic conversion/export polling without live Convex.
- Storage clients now auto-create missing buckets in local runtimes and conversion upload returns explicit `503` messaging when object storage writes fail.
- Playwright MVP smoke is implemented with scenario artifact output `.artifacts/mvp-scenario-summary.json`.
- MVP scenario script supports explicit mode/auth switches:
  - `pnpm mvp:scenario --mode replay|audiveris`
  - `pnpm mvp:scenario --auth dev-header|session`
- Pilot docker workflow and commands are implemented:
  - `pnpm pilot:up`
  - `pnpm pilot:smoke`
  - `pnpm pilot:down`
  - `pnpm pilot:scenario:audiveris`
  - `pnpm pilot:evidence`
- OMR health route now exposes additive Audiveris capability fields:
  - `audiverisAvailable`
  - `audiverisVersion`
- Latest pilot evidence run is not yet release-ready:
  - session-auth pilot smoke failed at login step
  - OMR health reported `audiverisAvailable=false` in the same run
  - audiveris batch scenario summary is failing
- Single-session branch workflow is now the active protocol (dual-session worktree playbook retired).
- Docker smoke runbook evidence is documented for blocked hosts and requires successful execution in a Docker-enabled environment for release proof.
- OMR errors are typed and normalized using taxonomy:
  - `OMR_TIMEOUT`
  - `OMR_UNAVAILABLE`
  - `OMR_PARSE_FAILED`
  - `OMR_INPUT_INVALID`

## Product Goal
Build a browser-based workflow that converts standard notation PDFs into playable Griffschrift for Steirische Harmonika, then supports practice, correction, and export.

## MVP Boundary (Locked)
Included:
- PDF ingestion + OMR pipeline boundary
- Note-to-Griffschrift mapping engine contracts
- Multi-tuning support: `GCFB`, `ADGC`, `BEADG`, `CFBB`
- Griffschrift SVG renderer foundation
- Practice mode architecture (auto-scroll + tempo controls)
- Editor architecture for grip, row, bellows direction corrections
- PDF export runtime (queued baseline printable layout)

Excluded in this foundation stage:
- Public community publishing (blocked by legal gate)
- Audio-to-Griffschrift
- MIDI playback
- Full multi-voice automation

## Technical Decisions
- Monorepo: `pnpm` + Turborepo
- Runtime: Node 22, Java 21
- Web app: Next.js 14+, TypeScript, Tailwind
- OMR: Pluggable provider interface, Audiveris default adapter
- Auth/session: BetterAuth
- Domain backend: Convex
- BetterAuth storage: PostgreSQL
- Queue: Redis + BullMQ
- Object storage: S3-compatible
- Deployment: Dokploy on VPS via Docker Compose
- Observability: Sentry + structured logs

## Core Domain Policies
- Unplayable notes: suggest transposition and require explicit user confirmation
- Bellows optimization: heuristic scoring (deterministic/explainable)
- Renderer base: custom SVG renderer (canvas fallback later)
- Sharing policy: private by default; public sharing disabled behind legal feature flag

## Primary Contracts
- `ConversionJob`
- `OmrProvider.extractScore(input): Promise<OmrScore>`
- `MappingEngine.mapScoreToGriffschrift(score, tuning, options): MappingResult`
- `TransposeSuggestion[]` (ranked by playability score)
- `Arrangement` canonical model as single source for renderer/editor/export
- `ConversionQueuePayload` (worker contract)
- `ExportJob` (latest export runtime state)
- `ExportHistory` (append-only export attempt records)
- `ExportQueuePayload` (worker export contract)
- `OmrError` with typed error code taxonomy

## API Surface
- `POST /api/conversions` (multipart PDF or JSON `inputFileId`)
- `POST /api/conversions` supports additive `rightsConfirmed` request field and pilot-mode enforcement.
- `GET /api/conversions/:id`
- `POST /api/conversions/:id/confirm-transpose`
- `GET /api/arrangements/:id`
- `PATCH /api/arrangements/:id`
- `POST /api/arrangements/:id/export`
- `GET /api/arrangements/:id/export`
- `GET /api/arrangements/:id/exports`
- `GET/POST/PATCH/PUT/DELETE /api/auth/[...all]` (BetterAuth handler)
- `GET /practice/:arrangementId` (authenticated practice runtime page)

## Open Tracks (Known)
- Legal and licensing workflow for copyrighted songs
- Final reference dataset curation (still synthetic-heavy despite broader fixtures)
- Named music expert reviewer assignment
- Pilot gate stabilization remains open:
  - fix session-auth smoke path and rerun `pnpm pilot:smoke`
  - fix Audiveris runtime availability and rerun `pnpm pilot:scenario:audiveris`
  - regenerate passing evidence bundle via `pnpm pilot:evidence`
- Practice mode audio/MIDI follow-up remains out of current sprint scope
