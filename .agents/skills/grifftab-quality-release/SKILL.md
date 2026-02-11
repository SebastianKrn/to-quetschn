---
name: grifftab-quality-release
description: Enforce GriffTab quality gates, CI/CD readiness, release checks, and incident-safe rollout practices. Use when preparing merges/releases, debugging failing pipelines, validating guardrails, or updating QA and deployment runbooks.
---

# GriffTab Quality and Release

Use this skill to keep delivery quality consistent.

## Workflow
1. Run required gates: lint, typecheck, test, build.
2. Validate mirrored skills and memory structure.
3. Confirm legal guardrails remain active unless explicitly changed.
4. For release prep, check compose config, env matrix, and health endpoints.

## Release Gate Checklist
- CI workflows pass on `main`.
- `FEATURE_PUBLIC_SHARING` remains false unless legal sign-off exists.
- Contract snapshots updated intentionally.
- `memory.md` reflects latest risks and next steps.

## Resources
- `references/qa-checklist.md`
- `references/release-rollout.md`
