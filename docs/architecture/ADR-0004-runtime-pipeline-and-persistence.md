# ADR-0004: Runtime Pipeline and Persistence Ownership

Date: 2026-02-11
Status: Accepted

## Context
Sprint 1 requires moving from deterministic stubs to an operational conversion runtime while preserving the service boundary decisions from ADR-0001..0003.

## Decision
- `apps/web` owns authenticated API ingress, conversion submission, queue production, and storage upload.
- `apps/worker` owns asynchronous conversion orchestration and status progression.
- `apps/omr-service` owns OMR provider invocation and typed OMR error mapping.
- Convex is the domain persistence boundary for conversion and arrangement records.
- BetterAuth is the authentication/session boundary for protected API routes.

## Pipeline
1. Authenticated request to `POST /api/conversions` (JSON `inputFileId` or multipart PDF).
2. Web stores uploaded PDFs in S3-compatible storage and enqueues a conversion payload.
3. Worker consumes queue jobs, calls OMR service, maps score to Griffschrift, and persists outcomes.
4. Worker marks conversion as `completed`, `failed`, or `needs_transpose_confirmation`.
5. Authenticated read APIs return persisted conversion/arrangement state.

## Consequences
- Runtime is now end-to-end executable without hard-wiring provider-specific logic into web routes.
- OMR failures are deterministic and typed (`OMR_TIMEOUT`, `OMR_UNAVAILABLE`, `OMR_PARSE_FAILED`, `OMR_INPUT_INVALID`).
- Public sharing remains disabled (`FEATURE_PUBLIC_SHARING=false`) and unaffected by Sprint 1.
