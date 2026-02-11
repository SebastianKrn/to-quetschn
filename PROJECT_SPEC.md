# GriffTab Project Specification (Normalized)

Last updated: 2026-02-11
Status: Sprint 1 runtime implementation in progress

## Implementation Status (Current)
- Foundation scaffold remains verified and intact.
- Sprint 1 runtime is implemented across auth, queue, OMR, mapping, renderer, and worker orchestration.
- Conversion and arrangement API routes are now authenticated and persistence-backed.
- Convex schema/functions are added for conversion/arrangement runtime persistence.

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
- PDF export architecture

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
- `OmrError` with typed error code taxonomy

## API Surface
- `POST /api/conversions` (multipart PDF or JSON `inputFileId`)
- `GET /api/conversions/:id`
- `POST /api/conversions/:id/confirm-transpose`
- `GET /api/arrangements/:id`
- `POST /api/arrangements/:id/export`
- `GET/POST/PATCH/PUT/DELETE /api/auth/[...all]` (BetterAuth handler)

## Open Tracks (Known)
- Legal and licensing workflow for copyrighted songs
- Final reference dataset curation (currently partial)
- Named music expert reviewer assignment
- Final production-hardening of Convex deployment credentials and migration workflow
