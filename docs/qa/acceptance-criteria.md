# Runtime Acceptance Criteria (Sprint 1)

## Repository Baseline
- `pnpm install` succeeds on clean checkout.
- `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` all pass.
- `pnpm validate:skills` and `pnpm validate:memory` pass.

## Contract Coverage
- Domain contracts are exported from shared package.
- Queue payload and OMR error taxonomy are explicitly typed.
- API contract snapshot tests remain green.

## Service Boundaries
- Web conversion/arrangement routes are authenticated and persistence-backed.
- OMR service exposes health and extraction endpoint with typed error responses.
- Worker consumes conversion queue and updates status (`processing`, `completed`, `failed`, `needs_transpose_confirmation`).
- OMR provider logic remains behind `OmrProvider` interface.

## Policy Guardrails
- Public sharing remains disabled by default (`FEATURE_PUBLIC_SHARING=false`).
- Legal docs remain present with explicit release gate.
- No provider-specific business logic is embedded in web routes.

## Test Scenarios
- JSON conversion submission with `inputFileId` queues successfully.
- Multipart conversion submission with PDF upload queues successfully.
- Unauthorized conversion/arrangement access returns `401`.
- Transpose confirmation re-queues conversion.
- Mapping engine returns deterministic transpose suggestions for unplayable notes.
- Renderer outputs valid SVG with push/pull notation symbols.

## Sprint 2 Export Micro-Sprint Addendum

### Export Runtime Coverage
- `POST /api/arrangements/:id/export` requires auth and enqueues export jobs when needed.
- `GET /api/arrangements/:id/export` requires auth and returns latest export status.
- Completed exports return signed artifact URL metadata.
- Worker consumes export queue and updates status (`queued`, `processing`, `completed`, `failed`).
- Export artifacts are written to S3-compatible storage using deterministic key shape.

### Export Test Scenarios
- Unauthenticated export trigger/status access returns `401`.
- Export trigger returns queued export metadata and queue job id.
- Export status returns non-completed states without download URL.
- Export status returns signed URL when export is `completed`.
- Export pipeline marks failed status with typed export error code on render/storage failures.

## Sprint 3 Export History + Benchmark Addendum

### Export History Runtime Coverage
- `POST /api/arrangements/:id/export` accepts optional `{ force: boolean }`.
- Non-forced export trigger reuses latest `queued|processing|completed(with artifact)` export state.
- Forced export trigger always creates a new export attempt and enqueues work.
- `GET /api/arrangements/:id/exports` requires auth and returns newest-first owner-scoped export history.
- Worker status transitions synchronize both latest export projection and export history record.

### Benchmark and Workflow Coverage
- Root benchmark CLI supports strict mode and JSON output from root commands.
- Benchmark manifest executes at least five licensed entries with explicit skip reasons for non-licensed entries.
- Benchmark fixtures include parser-path coverage (`json`, `musicxml`, `delimited`) and all supported tunings.
- Docker smoke runbook exists and is executable in Docker-enabled environments (`scripts/docker-smoke.sh`).
