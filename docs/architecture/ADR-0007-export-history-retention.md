# ADR-0007: Export History Retention with Latest Projection

Date: 2026-02-12
Status: Accepted

## Context
Sprint 2 stored only the latest export state per arrangement. This made status reads simple but removed auditability and prevented users from reviewing prior export attempts.

## Decision
Adopt a history+latest model:
- `exports` remains the latest projection (single latest state per arrangement).
- `exportHistory` stores append-only export attempts keyed by `exportId`.
- `POST /api/arrangements/:id/export` keeps reuse behavior for queued/processing/completed jobs.
- `POST /api/arrangements/:id/export` accepts optional `{ force: true }` to intentionally create a new export attempt.
- New `GET /api/arrangements/:id/exports` returns newest-first owner-scoped history.

## Consequences
- Existing latest-status clients remain backward-compatible.
- Auditability improves through immutable per-attempt history records.
- Worker status updates now synchronize both latest projection and history records.
- Storage and query volume increase modestly as export attempts accumulate.
