# ADR-0005: Export Pipeline and Artifact Storage Ownership

Date: 2026-02-11
Status: Accepted

## Context
Sprint 2 requires replacing the placeholder arrangement export response with an operational PDF export flow while preserving the architecture boundaries from ADR-0001..0004.

## Decision
- `apps/web` owns authenticated export trigger and export status read APIs.
- `apps/web` enqueues export jobs and returns current/latest export state.
- `apps/worker` owns asynchronous PDF rendering and artifact upload.
- `packages/renderer-pdf` owns PDF rendering logic from `Arrangement` to printable PDF bytes.
- Convex owns latest-export persistence per arrangement (`queued`, `processing`, `completed`, `failed`) and artifact metadata.
- S3-compatible storage owns export artifact bytes addressed by key (`exports/{arrangementId}/{exportId}.pdf`).

## Pipeline
1. Authenticated `POST /api/arrangements/:id/export` requests latest export state from Convex and enqueues `export.requested` when required.
2. Worker consumes export jobs and marks export status as `processing`.
3. Worker loads arrangement data, renders PDF, uploads artifact to object storage, and marks export `completed` with `artifactKey`.
4. Worker marks export `failed` with typed export error code on pipeline failures.
5. Authenticated `GET /api/arrangements/:id/export` returns latest export status and signed download URL when status is `completed`.

## Consequences
- Export delivery is now operational and queue-driven without coupling PDF rendering into web routes.
- Export persistence follows a latest-only model per arrangement for this sprint.
- Public sharing and legal guardrails remain unchanged (`FEATURE_PUBLIC_SHARING=false`).
