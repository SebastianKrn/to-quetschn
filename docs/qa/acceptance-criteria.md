# Foundation Acceptance Criteria

## Repository Baseline
- `pnpm install` succeeds on clean checkout
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass

## Contract Coverage
- Domain contracts are exported from shared package
- Queue topics and storage interface are explicitly typed
- API contract snapshots exist and pass

## Service Boundaries
- Web API routes compile and return deterministic stub responses
- OMR service exposes health endpoint and extraction stub
- Worker starts and registers queue processors

## Policy Guardrails
- Public sharing flag defaults to `false`
- Legal docs exist with explicit release gate
- Agent workflow files point to shared context priorities
