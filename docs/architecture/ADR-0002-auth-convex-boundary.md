# ADR-0002: BetterAuth and Convex Boundary

Date: 2026-02-11
Status: Accepted

## Context
Auth/session requirements differ from domain logic and pipeline orchestration concerns.

## Decision
- BetterAuth handles identity/session lifecycle.
- Postgres stores BetterAuth persistence data.
- Convex handles domain-facing data/functions (arrangements, revisions, collaboration semantics).

## Boundary Rules
- Auth token/session checks happen before domain actions.
- Domain types in `packages/domain-types` stay framework-agnostic.
- Web routes must not embed backend provider-specific business logic.
