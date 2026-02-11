---
name: grifftab-architecture-bootstrap
description: Maintain and evolve GriffTab monorepo architecture, service boundaries, workspace conventions, ADR updates, and environment/deployment topology. Use when tasks involve scaffolding changes, moving responsibilities between apps/packages, updating architectural decisions, or aligning repo structure with the locked foundation decisions.
---

# GriffTab Architecture Bootstrap

Use this skill to keep architecture changes consistent with locked repository decisions.

## Workflow
1. Read `PROJECT_SPEC.md`, then relevant ADRs under `docs/architecture/`.
2. Confirm the change preserves boundaries:
- Web app owns HTTP contracts and UI integration.
- OMR service owns provider invocation boundary.
- Worker owns queue processing.
- Shared packages own contracts and reusable logic.
3. If architecture assumptions change, update/add ADR before code edits.
4. Keep deployment and env docs synced (`infra/dokploy/*`, `.env.*.example`).

## Rules
- Do not hard-wire provider-specific logic into web routes.
- Keep queue/storage contracts in shared packages.
- Preserve `FEATURE_PUBLIC_SHARING=false` default.

## Resources
- `references/boundaries.md`
- `references/env-and-deploy.md`
