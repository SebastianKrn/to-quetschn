# GriffTab

> Convert standard music notation PDFs into **Griffschrift** tablature for the chromatic button accordion — with an integrated practice loop and PDF export.

[![CI](https://github.com/SebastianKrn/to-quetschn/actions/workflows/ci.yml/badge.svg)](https://github.com/SebastianKrn/to-quetschn/actions/workflows/ci.yml)
[![Docker Compose Validation](https://github.com/SebastianKrn/to-quetschn/actions/workflows/docker-build.yml/badge.svg)](https://github.com/SebastianKrn/to-quetschn/actions/workflows/docker-build.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Node 22](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)

---

## Why this exists

**Griffschrift** is a tablature notation for the chromatic button accordion (Knopfakkordeon) that maps notes to physical button positions and bellows direction rather than staff positions. It's widely used in German-speaking folk traditions but poorly served by existing notation software — players typically transcribe standard scores into Griffschrift by hand, one note at a time.

GriffTab automates that conversion: upload a score as PDF, get back a Griffschrift arrangement you can correct, practice against, and export as printable PDF.

## What it ships

- **PDF → MusicXML via pluggable OMR.** `Audiveris` adapter for real OCR; a deterministic *replay provider* reads pre-recorded results so CI and demos run without the JVM/Audiveris install.
- **Note → button mapping engine** with per-tuning configs (`packages/griffschrift-engine`), bellows heuristics, and transposition suggestions scored for playability.
- **Practice mode v2** with keyboard shortcuts and a tight correction loop — owners can edit individual tokens (`PATCH /api/arrangements/:id`) when the OMR gets something wrong.
- **Queued PDF export** (BullMQ + Redis) with status polling and signed artifact download URLs (S3/MinIO).
- **Session auth** via BetterAuth against PostgreSQL, with fail-closed boundary enforcement on Convex domain writes.
- **Benchmark harness** running against a 20-fixture replay manifest, wired into CI as a strict blocking gate.
- **Playwright scenario gate** that exercises the full upload → convert → transpose → practice → export flow end-to-end before every merge.

Public sharing of arrangements is feature-flagged off by default (`FEATURE_PUBLIC_SHARING=false`) until the legal/takedown track lands.

## Tech stack

**Frontend** — Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS, custom SVG renderer for Griffschrift.

**Backend** — Convex for domain state, BetterAuth for session auth, PostgreSQL for auth persistence.

**Jobs & storage** — BullMQ on Redis for the OMR/export pipelines, S3-compatible object storage (MinIO locally, AWS in prod).

**OMR & domain** — Pluggable OMR provider (`packages/omr-provider`); Audiveris as the default adapter, a replay provider for deterministic tests. Griffschrift engine, SVG renderer, and PDF renderer ship as separate packages with shared contracts in `packages/domain-types`.

**QA & tooling** — pnpm workspaces + Turborepo, Vitest unit tests, Playwright end-to-end, ESLint + TypeScript strict, Sentry + structured JSON logs, Docker Compose stacks for dev / pilot / prod, Dokploy deployment blueprint.

## Architecture at a glance

```
                         ┌─────────────────┐
              upload     │   Web (Next.js) │
   browser ──────────────▶   + API routes  │
                         └────────┬────────┘
                                  │
                     ┌────────────┼─────────────────┐
                     ▼            ▼                 ▼
              ┌──────────┐  ┌──────────┐    ┌──────────────┐
              │  Convex  │  │PostgreSQL│    │ BullMQ/Redis │
              │ (domain) │  │(BetterAuth)   │   (queues)   │
              └──────────┘  └──────────┘    └──────┬───────┘
                                                   │
                                ┌──────────────────┴────────────────┐
                                ▼                                   ▼
                     ┌─────────────────────┐              ┌──────────────────┐
                     │    OMR Service      │              │  Export Worker   │
                     │ Audiveris | Replay  │   artefact   │  SVG → PDF       │
                     │ → mapping → SVG     │────────────▶ │  → S3 / MinIO    │
                     └─────────────────────┘              └──────────────────┘
```

See [`docs/architecture/`](docs/architecture/) for 9 ADRs covering the monorepo split, the Convex/Auth boundary, the OMR provider interface, the runtime pipeline, the export pipeline, fail-closed hardening, export history retention, and the hybrid local/pilot Docker runtimes.

## Quick start — no Docker, no Audiveris

The fastest way to see the project exercise itself end-to-end is the replay gate. It needs nothing but Node 22 and pnpm 10:

```bash
pnpm install
pnpm mvp:ready
```

`mvp:ready` runs lint, typecheck, the strict 20-fixture benchmark against the replay provider, and the Playwright MVP scenario (upload → convert → transpose → practice → export) against an in-memory stack. If it's green, the pipeline is structurally sound.

The replay provider exists specifically so the CI, the benchmark, and this demo path never depend on a real Audiveris install — the pre-recorded replay manifest mirrors what Audiveris would produce for the 20 fixtures.

## Full local stack (Docker)

```bash
pnpm mvp:infra:up                  # Postgres, Redis, MinIO
pnpm mvp:apps:up                   # web, omr-service, worker
pnpm mvp:scenario --mode replay    # run the MVP scenario in replay mode
pnpm mvp:down                      # tear down
```

Point your browser at the web app and sign up to try the dashboard flow (upload, conversion polling, transpose confirm, practice, export polling). Full runbook: [`docs/qa/mvp-local-smoke.md`](docs/qa/mvp-local-smoke.md).

## Pilot stack with real Audiveris (optional)

The `pilot:*` commands run the same stack but bind the OMR service to a real Audiveris 5.9 install. They require a Java 21 runtime, the Audiveris binary, and licensed PDFs on disk.

```bash
pnpm pilot:up
pnpm pilot:smoke
pnpm pilot:down
```

Runbook: [`docs/qa/pilot-local-docker.md`](docs/qa/pilot-local-docker.md). The [`Audiveris Scenario`](.github/workflows/audiveris-scenario.yml) GitHub Action is `workflow_dispatch`-only and will cleanly skip when only placeholder fixtures are committed — real validation of the Audiveris path happens locally against your own licensed corpus.

## Repository layout

```
apps/
  web/              Next.js 14 App Router UI + API routes + Playwright E2E
  omr-service/      OMR boundary service (Audiveris or replay provider)
  worker/           BullMQ workers for conversion + export jobs
packages/
  domain-types/     Shared TypeScript contracts — the interface boundary
  omr-provider/     Pluggable OMR provider interface + adapters
  griffschrift-engine/  Note → button/bellows mapping + playability scoring
  renderer-svg/     Griffschrift SVG renderer
  renderer-pdf/     Server-side PDF renderer
  benchmark-harness/    20-fixture benchmark runner + strict CI gate
  config-eslint/    Shared ESLint config
  config-typescript/    Shared tsconfig
docs/
  architecture/     9 ADRs
  qa/               Local/pilot/Docker runbooks and acceptance criteria
benchmarks/         Fixture manifest + replay manifest (real PDFs not committed)
```

## Project status

- **Sprint 1–4** — runtime foundation, export history, benchmark expansion, practice v2 loop ✅
- **Sprint 5** — single-session workflow, hybrid OMR mode, German-first MVP dashboard, token correction ✅
- **Sprint 6** — local MVP orchestration (`mvp:*` commands) ✅
- **Sprint 7** — pilot local Docker runtime (`pilot:*` commands) ✅
- **Sprint 8** — local MVP GA workflow (`mvp:ready`, strict compose validation, 20-fixture benchmark) ✅

GriffTab is now a **portfolio project**: the local replay gate is production-ready, the architecture and quality gates are documented, and it's maintained occasionally rather than actively developed. Public sharing, a hosted demo, and Audiveris hardening with licensed corpora are the natural next steps.

## Commands

```bash
# quality gates
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm benchmark --strict --json .artifacts/benchmark-summary.json

# local MVP (replay)
pnpm mvp:ready
pnpm mvp:infra:up && pnpm mvp:apps:up
pnpm mvp:scenario --mode replay
pnpm mvp:down

# pilot (real Audiveris — requires Java 21 + licensed PDFs)
pnpm pilot:up && pnpm pilot:smoke
pnpm pilot:scenario:audiveris
pnpm pilot:down

# fixtures
pnpm fixtures:register --pdf <path> --normalized <path> --id <id> --license licensed
```

## For contributors and agents

This repo was built with a Claude Code / Codex agent in the loop. If you're jumping in to make a change — or pointing an agent at it — these files are the entry point:

- [`CLAUDE.md`](CLAUDE.md) — Claude Code workflow (read order, quality gates, branching)
- [`AGENTS.md`](AGENTS.md) — equivalent Codex workflow
- [`PROJECT_SPEC.md`](PROJECT_SPEC.md) — implementation status across sprints
- [`PROJECT_PLAN.md`](PROJECT_PLAN.md) — foundation workstreams and phase tracking
- [`memory.md`](memory.md) — living snapshot of locked decisions and current state

## License

MIT — see [`LICENSE`](LICENSE).
