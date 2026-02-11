# ADR-0001: Monorepo and Service Topology

Date: 2026-02-11
Status: Accepted

## Context
GriffTab requires a web UI, asynchronous job processing, and an OMR boundary that can evolve without coupling core product logic to a single OCR implementation.

## Decision
Use a pnpm + Turborepo monorepo with three applications:
- `apps/web` (Next.js app router)
- `apps/omr-service` (OMR HTTP service wrapper)
- `apps/worker` (BullMQ queue worker)

Shared contracts and domain logic live in `packages/*`.

## Consequences
- Fast shared refactoring through single source contracts
- Clear service boundaries for scaling and deployment
- Higher up-front scaffold complexity but lower long-term drift
