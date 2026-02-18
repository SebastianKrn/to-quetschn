# ADR-0008: Hybrid OMR Mode for Local Deterministic Runtime

Date: 2026-02-18
Status: Accepted

## Context
Local MVP validation requires deterministic conversion flows even when Java/Audiveris is unavailable in the execution host. Production and staging still require real Audiveris execution semantics.

## Decision
- Add an explicit OMR runtime mode flag: `OMR_MODE` with values:
  - `audiveris`: use `AudiverisOmrProvider` (real provider execution)
  - `replay`: use `ReplayOmrProvider` (fixture replay via checksum)
- Keep the `OmrProvider` interface unchanged and preserve provider selection inside `apps/omr-service`.
- Add replay fixture manifest config: `OMR_REPLAY_MANIFEST_PATH`.
- Replay provider resolves normalized OMR payloads by SHA-256 checksum of uploaded PDF bytes.

## Consequences
- Local deterministic smoke tests can run without requiring Java/Audiveris binaries.
- Typed OMR error taxonomy remains unchanged (`OMR_TIMEOUT`, `OMR_UNAVAILABLE`, `OMR_PARSE_FAILED`, `OMR_INPUT_INVALID`).
- Production/staging parity remains available by setting `OMR_MODE=audiveris`.
- Replay mode requires a maintained checked-in manifest and normalized fixture assets.
