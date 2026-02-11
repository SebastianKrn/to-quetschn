# GriffTab

Agent-optimized monorepo bootstrap for GriffTab (Standard notation -> Griffschrift converter and practice tool).

## Stack (Foundation)
- Monorepo: pnpm workspaces + Turborepo
- Web: Next.js 14 App Router + TypeScript + Tailwind CSS
- OMR boundary: pluggable provider (`Audiveris` default adapter)
- Domain backend: Convex (domain logic) + BetterAuth (auth/session)
- BetterAuth persistence: PostgreSQL (Dokploy stack)
- Jobs: BullMQ + Redis
- Storage: S3-compatible (MinIO in local compose)
- Observability: Sentry + structured JSON logs

## Runtime Status (2026-02-11)
- Sprint 1 runtime slice is complete (auth, conversion queue, OMR, mapping, SVG rendering, persisted API routes).
- Sprint 2 micro-sprint export slice is complete (queued PDF export pipeline with status polling and signed artifact download URL).
- Public sharing remains disabled by default (`FEATURE_PUBLIC_SHARING=false`).

## Repository Priorities For Agents
1. `PROJECT_SPEC.md`
2. `PROJECT_PLAN.md`
3. `memory.md`
4. `AGENTS.md` (Codex workflow)
5. `CLAUDE.md` (Claude Code workflow)

## Commands
```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

## Ready-for-Agents Checklist
- [ ] Environment variables populated from `.env.*.example`
- [x] `pnpm install` succeeds
- [x] `pnpm verify` succeeds
- [x] Skills mirrored and validated (`pnpm sync:skills && pnpm validate:skills`)
- [x] `memory.md` includes latest status update (`pnpm validate:memory`)
- [ ] Docker stack starts locally (`docker compose -f docker-compose.dev.yml up -d`)

## Notes
- Public sharing of arrangements is feature-flagged off by default until legal track is complete.
- Current next priorities: Convex/auth production hardening, OMR normalization expansion, benchmark dataset/regression harness, and practice-mode runtime.
