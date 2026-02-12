# ADR-0006: Auth and Convex Fail-Closed Hardening

Date: 2026-02-12
Status: Accepted

## Context
Sprint 2 hardening requires removing permissive runtime fallbacks and introducing owner scoping for domain records while preserving existing records created before owner fields were introduced.

## Decision
- Staging/production runtimes are fail-closed for auth and Convex credentials:
  - `BETTER_AUTH_SECRET` must be strong and non-placeholder.
  - `CONVEX_ADMIN_KEY` is required for server-side Convex clients.
- Development header-based auth (`x-dev-user-id`) is allowed only in `development` and `test`.
- Web domain reads/writes are owner-scoped by `user.id` from BetterAuth session.
- Convex records (`conversions`, `arrangements`, `exports`) add optional `ownerUserId`.
- Legacy ownerless records are lazy-backfilled on first successful owner-scoped access.
- Convex in-memory fallback is restricted to test and explicit local-dev runtime; staging/production do not silently fall back.

## Consequences
- Unauthorized cross-user reads now return not-found semantics from owner-scoped APIs.
- Worker remains a trusted internal actor and uses admin-authenticated Convex calls.
- Existing ownerless data remains accessible without destructive migration, then converges to owned state over time.
- Local development keeps pragmatic fallback behavior when `CONVEX_DEPLOYMENT=local-dev`.
