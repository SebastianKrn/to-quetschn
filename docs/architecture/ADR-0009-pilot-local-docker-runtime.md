# ADR-0009: Pilot Local Docker Runtime with Session Auth and Rights Confirmation

Date: 2026-02-27
Status: Accepted

## Context
Sprint 7 targets private pilot handoff for external testers using local Docker and real Audiveris extraction. The existing local MVP flow relied on development-mode dev-header authentication and replay-first OMR, which is not sufficient for pilot realism.

## Decision
- Introduce a dedicated pilot compose stack (`docker-compose.pilot.yml`) with buildable service images (`web`, `omr-service`, `worker`) and required infra (`postgres`, `redis`, `minio`).
- Keep provider wiring behind `OmrProvider`; pilot uses `OMR_MODE=audiveris` while preserving replay mode for deterministic CI/local smoke.
- Add pilot auth UX pages (`/login`, `/register`) and gate dashboard access to authenticated sessions in non-dev modes.
- Add upload-rights acknowledgement enforcement (`ENFORCE_UPLOAD_RIGHTS_CONFIRMATION`) for conversion submission in pilot mode.
- Persist conversion rights metadata (`rightsConfirmedAt`, `rightsConfirmationSource`) in domain contracts and Convex persistence.
- Add OMR health capability fields (`audiverisAvailable`, `audiverisVersion`) as additive diagnostics.
- Permit local domain fallback for pilot local-dev deployments when `PILOT_MODE=true` and `CONVEX_DEPLOYMENT=local-dev`, while preserving secure runtime constraints.

## Consequences
- Test users can run a private pilot workflow locally with session auth and rights acknowledgement while keeping public sharing disabled.
- OMR service diagnostics now expose Audiveris availability without changing extraction contracts.
- Replay and audiveris scenarios are both first-class QA paths with separate automation commands/workflows.
- Conversion contract remains backward-compatible with additive request/response metadata fields.
