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
