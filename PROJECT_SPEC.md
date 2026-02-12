# GriffTab Project Specification (Normalized)

Last updated: 2026-02-12
Status: Sprint 3 export history + benchmark confidence + workflow orchestration completed

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
- Benchmark regression harness is implemented with licensed-manifest filtering and advisory CI execution.
- Benchmark dataset now includes 5 executable licensed fixtures across `GCFB`, `ADGC`, `BEADG`, `CFBB` with strict thresholds.
- Practice mode runtime MVP is implemented at `/practice/[arrangementId]` with authenticated load, SVG rendering, tempo control, and auto-scroll.
- Parallel orchestration workflow is documented for dual-session worktree execution.
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
- `GET /api/conversions/:id`
- `POST /api/conversions/:id/confirm-transpose`
- `GET /api/arrangements/:id`
- `POST /api/arrangements/:id/export`
- `GET /api/arrangements/:id/export`
- `GET /api/arrangements/:id/exports`
- `GET/POST/PATCH/PUT/DELETE /api/auth/[...all]` (BetterAuth handler)
- `GET /practice/:arrangementId` (authenticated practice runtime page)

## Open Tracks (Known)
- Legal and licensing workflow for copyrighted songs
- Final reference dataset curation (still synthetic-heavy despite broader fixtures)
- Named music expert reviewer assignment
- Production compose validation must still be executed in Docker-enabled environment
- Benchmark threshold tuning on real-world licensed repertoire remains pending
- Practice mode enhancements (loop ranges, shortcuts, MIDI/audio) remain out of current sprint scope
