# GriffTab Execution Plan (Phase 1+2 Foundation)

Last updated: 2026-02-11

## Objective
Establish a production-ready foundation where coding agents can implement features quickly and safely with minimal ambiguity.

## Workstreams

### 1. Monorepo Foundation
- Initialize apps/packages layout
- Standardize lint/typecheck/test/build tasks with Turborepo
- Add CI pipelines for quality gates
Status: Completed

### 2. Domain Contracts
- Define canonical domain types for conversion, mapping, rendering, and export
- Freeze queue and storage interfaces
- Add contract tests and snapshots
Status: Completed (foundation scope)

### 3. Service Boundaries
- OMR service stub with Audiveris adapter contract
- Worker service for conversion/export queue processing
- Web API stubs aligned to contract definitions
Status: Completed (stub level)

### 4. Deployment Baseline
- Docker Compose stack for Dokploy (`web`, `omr-service`, `worker`, `postgres`, `redis`, `minio`)
- Environment templates for `dev`, `staging`, `prod`
- Infra docs for secret and environment mapping
Status: Completed (foundation docs + compose)

### 5. Agent Workflow Optimization
- Create and mirror 4 custom skills in `.agents/skills` and `.claude/skills`
- Add sync and validation scripts to prevent drift
- Add structured `memory.md` discipline checks
Status: Completed

### 6. Governance and Guardrails
- Proprietary internal license marker
- Legal policy drafts with explicit launch gate
- Public sharing flag defaulted to `false`
Status: Completed (policy baseline)

## Next Sprint Focus
1. Implement BetterAuth + Postgres persistence wiring.
2. Add Convex domain functions for arrangements and conversion jobs.
3. Implement real OMR execution and parse normalization.
4. Implement mapping heuristic v1 and renderer layout v1.
5. Add end-to-end benchmark harness with licensed reference PDFs.

## Acceptance For Foundation Completion
- `pnpm install` passes
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass
- CI workflows run same gates
- Docker Compose definitions exist for local and Dokploy paths
- Agent files and mirrored skills validated
- No production feature logic implemented beyond interface stubs
