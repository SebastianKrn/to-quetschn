# GriffTab Project Specification (Normalized)

Last updated: 2026-02-11
Status: Foundation bootstrap

## Implementation Status (Current)
- Foundation scaffold is implemented and verified (`pnpm verify` passing).
- Architecture, legal, QA, and deployment baseline docs are present under `docs/` and `infra/`.
- API/service logic remains intentionally stubbed for MVP feature implementation in the next phase.

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

## API Surface (Stubbed)
- `POST /api/conversions`
- `GET /api/conversions/:id`
- `POST /api/conversions/:id/confirm-transpose`
- `GET /api/arrangements/:id`
- `POST /api/arrangements/:id/export`

## Open Tracks (Known)
- Legal and licensing workflow for copyrighted songs
- Final reference dataset curation (currently partial)
- Named music expert reviewer assignment
