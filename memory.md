# GriffTab Memory

Last updated: 2026-04-21

## Snapshot
- Foundation scaffold has been advanced to Sprint 1 runtime wiring.
- Auth, queue orchestration, OMR runtime, mapping engine, and renderer are implemented.
- Sprint 2 micro-sprint export slice is implemented with queued PDF generation and status polling API.
- Sprint 2 hardening priorities are implemented (Convex/auth hardening, OMR normalization expansion, benchmark harness).
- Practice-mode runtime MVP is implemented with authenticated arrangement playback UI.
- Sprint 3 export history retention is implemented with latest-projection + append-only history model.
- Practice-mode v2 is implemented with loop controls, deterministic loop playback, and keyboard shortcuts.
- Benchmark harness dataset is expanded to 8 executable licensed fixtures across JSON, MusicXML, and delimited parser paths.
- Sprint 5 hybrid OMR mode is implemented (`OMR_MODE=replay|audiveris`) with replay manifest support.
- Sprint 5 MVP dashboard flow is implemented (upload -> conversion polling -> transpose confirmation -> practice -> export polling).
- Sprint 5 token correction flow is implemented with owner-scoped `PATCH /api/arrangements/:id` and practice UI editor controls.
- Sprint 6 local MVP automation is implemented with `mvp:*` commands and Playwright smoke summary output.
- Sprint 6 benchmark gate hardening is implemented (12 licensed fixtures + strict CI benchmark blocking).
- Sprint 6 QA/resilience hardening is implemented:
  - MinIO bootstrap command fix in `mvp:infra:up`
  - shared local fallback domain state (`LOCAL_DOMAIN_STORE_PATH`) for web+worker local-dev runs
  - local S3 auto-create bucket guardrails + conversion storage failure `503` response
- Sprint 7 pilot-readiness implementation is in the worktree:
  - pilot Docker packaging (`docker-compose.pilot.yml`, app Dockerfiles, pilot scripts)
  - pilot auth UX (`/login`, `/register`) + dashboard pilot/session flow
  - upload rights confirmation contract and metadata persistence
  - benchmark and replay manifests expanded to 20 licensed fixtures
  - audiveris scenario/evidence command surface added
- Sprint 8 local MVP replay GA workflow is implemented:
  - one-command local gate `pnpm mvp:ready`
  - compose preflight command `pnpm release:compose:check`
  - updated local MVP docs with direct-main push workflow guidance
- Single-session sequential branch workflow is the active protocol (parallel worktree flow retired).
- Public sharing remains blocked by default pending legal completion.
- **Portfolio posture (2026-04-21):** the repo is now public at [SebastianKrn/to-quetschn](https://github.com/SebastianKrn/to-quetschn), MIT-licensed, with a user-first README. Active development is wound down; the project is now in **occasional maintenance mode**. The weekly `Audiveris Scenario` workflow has been converted to `workflow_dispatch`-only with a fixture guard that skips cleanly when no real licensed PDFs are committed.

## Decisions (Locked)
- Monorepo: pnpm + Turborepo
- Web: Next.js 14 + TypeScript + Tailwind
- OMR: Pluggable provider, Audiveris default
- Backend split: BetterAuth for auth/session, Convex for domain logic
- BetterAuth store: Postgres
- Queue: Redis + BullMQ
- Storage: S3-compatible
- Deployment: Dokploy (Docker Compose)
- Observability: Sentry + JSON logs

## Current State
- API routes are no longer deterministic stubs; conversion + arrangement routes are runtime-backed and authenticated.
- Worker executes queue jobs and updates conversion states.
- Export flow is runtime-backed: queue-driven PDF generation, object storage artifact upload, latest status projection, and append-only history retention.
- `GET /api/arrangements/:id/export` now returns live export status and signed download URL for completed artifacts.
- `GET /api/arrangements/:id/exports` now returns owner-scoped newest-first export history.
- `POST /api/arrangements/:id/export` now accepts optional `{ force: true }` for explicit re-export attempts.
- OMR service returns typed failure codes and normalized score payloads.
- OMR parser pipeline now supports JSON, delimited fallback, and MusicXML normalization inputs.
- Mapping/renderer packages now provide deterministic v1 implementations with tests.
- Renderer SVG now emits token metadata for editor targeting (`data-token-id`).
- Arrangement API now supports owner-scoped token correction with request validation:
  - `PATCH /api/arrangements/:id`
  - `UpdateArrangementTokenRequestSchema`
  - `ApiContracts.updateArrangement`
- Practice page now includes token selection/edit/save controls (row, button, direction) and updates arrangement state after save.
- Convex/auth hardening now enforces secure deployment behavior:
  - stronger secret/config expectations in secure deployments
  - deployment-aware fail-closed Convex auth requirements
  - owner-scoped reads/writes with lazy owner backfill for legacy records
- Benchmark harness package and CI advisory integration are in place with expanded licensed fixtures and strict threshold defaults.
- Root benchmark CLI handling now supports both `pnpm benchmark --strict` and forwarded forms like `pnpm benchmark -- --strict`.
- Root MVP command surface is implemented:
  - `pnpm mvp:infra:up`
  - `pnpm mvp:apps:up`
  - `pnpm mvp:scenario`
  - `pnpm mvp:ready`
  - `pnpm mvp:down`
- Release compose preflight command is implemented:
  - `pnpm release:compose:check`
- `mvp:apps:up` now sets/resets shared local fallback state file:
  - `LOCAL_DOMAIN_STORE_PATH=.artifacts/mvp/local-domain-store.json`
- MVP local scenario Playwright smoke is implemented at `apps/web/e2e/mvp-smoke.pw.ts`.
- MVP smoke writes deterministic artifact summary to `.artifacts/mvp-scenario-summary.json`.
- Benchmark manifest now includes 20 licensed executable fixtures (`sample-licensed-001..020`).
- CI benchmark step is now strict and blocking.
- CI includes advisory MVP scenario smoke plus artifact upload.
- Practice route `/practice/[arrangementId]` is implemented with tempo slider, play/pause auto-scroll, loop range controls, and keyboard shortcuts.
- Home route now serves a German-first MVP dashboard instead of scaffold placeholder.
- OMR runtime now supports deterministic local replay mode while keeping Audiveris parity mode available.
- Project context docs are synchronized for Sprint 8 local MVP replay GA state.
- Sprint 8 local MVP replay verification is completed:
  - `pnpm mvp:ready` command surface added
  - `pnpm test`/`lint`/`typecheck`/`build` pass
  - `pnpm benchmark --strict` pass (`20 passed`, `0 failed`)
  - `pnpm validate:skills` and `pnpm validate:memory` pass

## Open Risks
- (Deferred, non-blocking in portfolio mode) Pilot session-auth smoke previously failed; retained as technical debt, not scheduled.
- (Deferred, non-blocking in portfolio mode) Audiveris pilot scenario is gated behind real licensed fixtures which are intentionally not committed; the CI workflow skips cleanly without them.
- (Deferred, non-blocking in portfolio mode) Practice runtime still lacks MIDI/audio integration.
- Public-sharing legal track is incomplete; `FEATURE_PUBLIC_SHARING=false` remains the safe default.

## Next Actions
Portfolio-mode backlog — pick up only when actively returning to the project.

1. **Visual evidence in README.** Capture 2–3 screenshots (upload → Griffschrift view → practice mode) and optionally a short GIF; embed in a new `## Demo` section just above `## Why this exists`. Requires running `pnpm mvp:infra:up && pnpm mvp:apps:up` locally.
2. **Hosted demo URL.** Deploy the Next.js app to Vercel in replay mode (no Audiveris dependency), stand up a Convex prod deployment, and link the live URL from the README + repo homepage field.
3. **Tidy the root.** Move `PROJECT_SPEC.md`, `PROJECT_PLAN.md`, `memory.md`, `AGENTS.md`, `CLAUDE.md`, and the two `docs/qa/post-implementation-handoff-*.md` files into `docs/internal/` so the root only shows `README.md`, `LICENSE`, and user-facing dirs. Update the README's "For contributors and agents" section pointers accordingly.
4. **Dependency hygiene sweep** before any future feature work: `pnpm outdated`, apply Renovate or Dependabot config, refresh the lockfile.
5. **If and when real Audiveris validation is wanted:** commit licensed PDFs to `benchmarks/pdfs/sample-licensed-00{1,2,3}.pdf` (or provide a path via `PILOT_AUDIVERIS_FIXTURES`) and manually dispatch the workflow. The install step is already hardened for the xdg-desktop-menu post-install issue.

See Sprint 7 pilot stabilization work (`pilot:smoke`, `pilot:scenario:audiveris`, `pilot:evidence`) as historical context — not on the active roadmap.

## Next Session Bootstrap
1. Sync and inspect branch state:
- `git fetch --prune`
- `git status -sb`
- `git log --oneline -n 5`
2. Run baseline validations:
- `pnpm install`
- `pnpm validate:skills`
- `pnpm validate:memory`
3. Re-run required gates in order:
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
4. Run local MVP replay gate commands:
- `pnpm release:compose:check`
- `pnpm mvp:ready`
5. Execute pilot gate commands when pilot track is active:
- `pnpm benchmark --strict --json .artifacts/benchmark-summary.json`
- `pnpm mvp:scenario --mode replay`
- `pnpm pilot:scenario:audiveris`
- `pnpm pilot:smoke`
- `pnpm pilot:evidence`
6. Before merge, keep context sync in one commit touching:
- `PROJECT_SPEC.md`
- `PROJECT_PLAN.md`
- `memory.md`

## Session Log Template
### YYYY-MM-DD
- Completed:
- Decisions made:
- Blockers:
- Next:

### 2026-04-21 (Portfolio polish sprint — project shifts to maintenance mode)
- Completed:
- Fixed the weekly failing `Audiveris Scenario` GitHub Action (5+ consecutive Monday failures). Dropped the cron trigger, added a fixture-presence guard as the first job step that skips every subsequent step when only placeholder PDFs are committed, and hardened the Audiveris `.deb` install against the `xdg-desktop-menu: No writable system menu directory found` post-install failure (`sudo mkdir -p /usr/share/desktop-directories /usr/share/applications` + fallback `dpkg --configure -a --force-all`). Fix landed via PRs #1 and #2; manual dispatch on `main` now reports green with a skip summary.
- Patched `scripts/pilot/scenario-audiveris.sh` to split placeholder detection from hard PDF validation: all-placeholders exits 0 with a clear skip message, mixed fixtures hard-fail as misconfiguration.
- Replaced `LICENSE.internal.md` (proprietary) with standard MIT `LICENSE`.
- Full `README.md` rewrite for a human audience: tagline, why Griffschrift matters, shipped features, grouped tech stack, ASCII architecture diagram, replay-mode quick start (no Docker), Docker path, pilot path, repo layout, project status, and a demoted "for contributors and agents" section pointing to the internal workflow docs.
- Flipped repo visibility to **public** via `gh repo edit SebastianKrn/to-quetschn --visibility public`.
- Set repo description and added topics: `typescript`, `nextjs`, `convex`, `monorepo`, `music-notation`, `omr`, `accordion`, `griffschrift`, `portfolio`, `pnpm`.
- Updated this `memory.md` with portfolio posture, new Open Risks framing, and a portfolio-mode Next Actions backlog.
- Decisions made:
- Project moves to **occasional maintenance mode**; active sprint cadence is retired.
- Audiveris Scenario workflow stays in the repo (manual-only) rather than being deleted — cheap when it skips, useful when real fixtures are eventually added.
- Internal agent docs (`CLAUDE.md`, `AGENTS.md`, `PROJECT_SPEC.md`, `PROJECT_PLAN.md`, `memory.md`, `GriffTab_PRD_v1.0.docx`) intentionally remain at root for now; moving them to `docs/internal/` is captured as a portfolio-mode next action.
- Blockers: none.
- Next:
- Visual evidence (screenshots/GIF) and a hosted demo URL are the two items that would raise the portfolio bar most; see `## Next Actions` for the current backlog.

### 2026-03-05
- Completed:
- Fast-forwarded local `main` to Sprint 7 baseline (`e2e621f`) and created Sprint 8 branch `codex/fix/sprint8-mvp-local-ga`.
- Added local MVP readiness command surface:
  - `pnpm mvp:ready`
  - `scripts/mvp/ready.sh`
- Added release compose validation command surface:
  - `pnpm release:compose:check`
  - `scripts/release/compose-check.sh`
- Updated docs/context for Sprint 8 MVP replay GA:
  - `README.md`
  - `docs/qa/mvp-local-smoke.md`
  - `PROJECT_SPEC.md`
  - `PROJECT_PLAN.md`
  - `memory.md`
- Ran required quality and release gates:
  - `pnpm test`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm validate:skills`
  - `pnpm validate:memory`
  - `pnpm benchmark --strict --json .artifacts/benchmark-summary.json` (`20 passed`, `0 failed`, `1 skipped`)
  - `pnpm release:compose:check`
  - `pnpm mvp:scenario --mode replay`
  - `pnpm mvp:ready`
- Merged Sprint 8 branch back to `main`, pushed to remote, and cleaned merged local branches.
- Decisions made:
- Keep Sprint 8 success criteria scoped to local MVP replay GA; pilot/audiveris remains non-blocking.
- Keep direct-main push workflow with `origin` fallback via `gh repo view/create` and private repo default.
- Blockers:
- Pilot auth/audiveris track remains unresolved and is still blocked for pilot release readiness.
- Next:
- Continue with pilot stabilization work (`pilot:smoke`, `pilot:scenario:audiveris`, `pilot:evidence`).

### 2026-02-27
- Completed:
- Implemented Sprint 7 pilot-readiness scope in workspace:
  - pilot Dockerfiles/compose/scripts
  - pilot auth routes + dashboard session flow
  - upload rights confirmation contract + metadata
  - benchmark/replay expansion to 20 licensed fixtures
  - audiveris scenario and evidence commands
- Fixed local MVP infra bootstrap failure in `scripts/mvp/infra-up.sh` (`minio/mc` entrypoint now explicit).
- Added local S3 resilience in web/worker storage clients:
  - auto head/create bucket in `development|test`
  - retry put on missing bucket
- Added conversion API storage failure handling with deterministic `503` response.
- Implemented shared local fallback domain state for `development + CONVEX_DEPLOYMENT=local-dev`:
  - web fallback store persists/loads `.artifacts/mvp/local-domain-store.json`
  - worker Convex client falls back to same state file for conversion/export update/query paths when Convex is unavailable
- Hardened MVP scripts:
  - `mvp:apps:up` sets/resets `LOCAL_DOMAIN_STORE_PATH`
  - `mvp:down` removes local state file
- Added regression coverage for conversion storage failure in `apps/web/src/app/api/conversions/route.test.ts`.
- Updated QA/docs/context files (`docs/qa/*`, `PROJECT_SPEC.md`, `PROJECT_PLAN.md`, `memory.md`).
- Verified:
  - `pnpm mvp:scenario` passed
  - `pnpm test` passed
  - `pnpm lint` passed
  - `pnpm typecheck` passed
  - `pnpm build` passed
  - `pnpm validate:skills` passed
  - `pnpm validate:memory` passed
- Decisions made:
- Keep fallback domain-state sharing scoped to local-dev mode only (`NODE_ENV=development` + `CONVEX_DEPLOYMENT=local-dev`) to avoid impacting secure environments.
- Keep conversion upload failures explicit (`503`) rather than silent retry loops, so local diagnostics remain actionable.
- Keep pilot release blocked until both session-auth smoke and Audiveris scenario are passing with evidence artifacts.
- Blockers:
- Pilot smoke auth step is failing in session mode (login response not OK).
- OMR health reported `audiverisAvailable=false` in latest pilot smoke.
- Audiveris scenario batch is failing (`passed=0 failed=3`).
- Next:
- Fix pilot auth and audiveris runtime issues, then re-run pilot gate commands and regenerate evidence bundle.

### 2026-02-26
- Completed:
- Implemented Sprint 6 local MVP command surface:
  - `pnpm mvp:infra:up`
  - `pnpm mvp:apps:up`
  - `pnpm mvp:scenario`
  - `pnpm mvp:down`
- Added MVP orchestration scripts under `scripts/mvp/*` with:
  - Docker fail-fast checks
  - host-app startup for web/omr-service/worker
  - MinIO bucket bootstrap
  - deterministic `.artifacts/mvp` log output
- Added Playwright MVP smoke coverage:
  - `apps/web/e2e/playwright.config.ts`
  - `apps/web/e2e/mvp-smoke.pw.ts`
  - scenario artifact output `.artifacts/mvp-scenario-summary.json`
- Added stable UI selectors (`data-testid`) in dashboard/practice components for e2e automation.
- Expanded benchmark dataset to 12 licensed fixtures (`sample-licensed-009..012`) and updated manifest.
- Switched CI benchmark step to strict blocking and added advisory MVP scenario + artifact upload.
- Updated QA and context docs (`README.md`, `docs/qa/*`, `PROJECT_SPEC.md`, `PROJECT_PLAN.md`, `memory.md`).
- Added explicit tomorrow test handoff guide: `docs/qa/mvp-local-test-tomorrow.md`.
- Decisions made:
- Keep host-app + Docker-infra as default local MVP run model.
- Keep replay mode forced in MVP scripts for deterministic local smoke.
- Keep Playwright scenario CI step advisory for this sprint.
- Blockers:
- Docker unavailable in this Codex host (`docker: command not found`), so positive runtime execution of `mvp:*` and Docker smoke success evidence must be run on a Docker-enabled machine.
- Next:
- Run tomorrow's local manual checklist from `docs/qa/mvp-local-test-tomorrow.md`.
- Run `pnpm mvp:scenario` and `./scripts/docker-smoke.sh` in Docker-enabled host and append evidence.
- Continue replay-manifest breadth expansion and MIDI/audio follow-up planning.

### 2026-02-18
- Completed:
- Merged Sprint 5 feature branches to `main` in sequence:
  - `codex/feat/sprint5-workflow-cleanup`
  - `codex/feat/sprint5-omr-hybrid-local-runtime`
  - `codex/feat/sprint5-mvp-core-flow-ui`
  - `codex/feat/sprint5-editor-token-correction`
- Added arrangement token correction end-to-end slice:
  - contract/type updates in `@grifftab/domain-types`
  - owner-scoped API route `PATCH /api/arrangements/:id`
  - Convex mutation + domain-store wiring
  - practice editor UI and SVG token targeting support
  - route test coverage for arrangement patch behavior
- Removed linked benchmark worktree (`git worktree remove /Users/skern/Work/projects-01/to-quetschn-bench`).
- Re-ran required quality gates successfully:
  - `pnpm test`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm validate:skills`
  - `pnpm validate:memory`
- Decisions made:
- Keep local auth path deterministic for realistic local runs via dev header flow (development/test only).
- Keep hybrid OMR approach locked: replay mode for deterministic local testing, Audiveris mode for parity validation.
- Blockers:
- Docker unavailable in this host (`docker: command not found`), so compose/smoke success evidence still requires external Docker-enabled execution.
- Sprint 5 scenario automation and strict CI benchmark hardening are still open.
- Next:
- Implement `mvp:*` scenario automation and Playwright smoke artifact generation.
- Expand benchmark manifest to 12 licensed fixtures and switch CI benchmark to strict blocking.

### 2026-02-11
- Completed:
- Implemented Sprint 1 runtime wiring across web, worker, OMR service, mapping engine, and renderer.
- Added BetterAuth route handler and session gate for protected API endpoints.
- Added Convex schema/functions for conversions and arrangements.
- Added queue payload and OMR error contracts, plus new unit/integration tests.
- Implemented Sprint 2 micro-sprint export runtime: Convex export persistence, worker PDF pipeline, and authenticated export trigger/status APIs.
- Added `@grifftab/renderer-pdf` package with baseline printable PDF renderer and tests.
- Synced project context and workflow docs for next-session continuity across spec/plan/agent docs/QA acceptance.
- Passed quality gates: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm validate:skills`, `pnpm validate:memory`.
- Decisions made:
- Kept `FEATURE_PUBLIC_SHARING=false` and legal guardrails unchanged.
- Kept Sprint 1 scope backend/core-focused (no practice UI implementation).
- Kept Sprint 2 export model latest-only per arrangement (no history table yet).
- Blockers:
- Docker CLI unavailable in this environment (`docker: command not found`), compose validation not executed.
- Next:
- Run compose validation in Docker-enabled environment.
- Continue Sprint 2 hardening (Convex/auth + OMR normalization) and benchmark dataset integration.

### 2026-02-12
- Completed:
- Implemented Sprint 2 hardening phases across auth/Convex, OMR normalization, and benchmark harness.
- Implemented practice runtime MVP route and player UI with deterministic tempo-based auto-scroll helpers/tests.
- Merged stacked sprint branches into `main` in order:
  - `codex/feat/auth-convex-hardening`
  - `codex/feat/omr-normalization-expansion`
  - `codex/feat/benchmark-regression-harness`
  - `codex/feat/practice-runtime-mvp`
- Passed required quality gates on merged `main`:
  - `pnpm test`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
- Implemented Sprint 3 export history + benchmark confidence + workflow orchestration:
  - added history+latest export persistence model and new route `GET /api/arrangements/:id/exports`
  - added force re-export support via `POST /api/arrangements/:id/export` body `{ force: true }`
  - expanded benchmark manifest to 5 licensed executable fixtures across all supported tunings
  - fixed benchmark CLI forwarding handling and CI benchmark JSON invocation
  - added `scripts/docker-smoke.sh` and Sprint 3 Docker smoke runbook
  - added parallel worktree orchestration playbook + AGENTS/CLAUDE workflow protocol updates
- Decisions made:
- Kept benchmark CI advisory/non-blocking for now with future strict-mode path.
- Kept practice scope intentionally bounded to MVP runtime behavior only.
- Adopted export history retention model as history+latest (ADR-0007).
- Blockers:
- Local policy in this environment blocks branch deletion commands (`git branch -d`), so merged feature branches could not be removed locally here.
- Docker CLI unavailable in this environment (`docker: command not found`), so Sprint 3 smoke script could not be executed here.
- Next:
- Execute `./scripts/docker-smoke.sh` in a Docker-enabled host and attach results.
- Continue threshold tuning on broader licensed repertoire.

### 2026-02-13
- Completed:
- Re-ran full verification pipeline via `pnpm verify` on `codex/feat/sprint3-export-history` and confirmed green gates.
- Finalized sprint-close context sync updates for `PROJECT_SPEC.md`, `PROJECT_PLAN.md`, and `memory.md`.
- Added explicit next-session bootstrap checklist to reduce startup ambiguity in new Codex sessions.
- Decisions made:
- Keep branch as the active handoff branch for follow-up work until Docker smoke evidence is captured.
- Blockers:
- Docker still unavailable in this environment, so smoke evidence must be collected externally.
- Next:
- Push branch and open/refresh PR for Sprint 3 closure review.
- Run Docker smoke on a Docker-enabled host and append output evidence.

### 2026-02-17
- Completed:
- Implemented Sprint 4 practice-mode v2 behavior in web runtime:
  - loop range controls with inclusive boundaries
  - deterministic looped auto-scroll playback
  - keyboard shortcuts (`Space`, `L`, `R`, `ArrowUp`, `ArrowDown`) with editable-target guardrails
- Expanded benchmark dataset from 5 to 8 licensed executable fixtures (`sample-licensed-006..008`) with strict-threshold rationale in manifest notes.
- Ran strict benchmark with Sprint 4 artifact output and confirmed pass (`8 passed`, `0 failed`, `1 skipped`).
- Updated QA docs (`benchmark-harness`, `acceptance-criteria`, `docker-smoke-sprint3`) with Sprint 4 coverage and dated docker evidence.
- Merged `codex/feat/sprint4-benchmark-docker` into `main`, rebased `codex/feat/sprint4-practice-v2` onto updated `main`, and synced context docs.
- Passed required gates on both sprint branches:
  - `pnpm test`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm validate:skills`
  - `pnpm validate:memory`
- Decisions made:
- Kept benchmark CI advisory; strict benchmark remains enforced at branch/manual gate level.
- Kept strict benchmark thresholds unchanged for Sprint 4 fixtures with documented rationale.
- Kept practice v2 limited to loop+shortcut scope; deferred MIDI/audio.
- Blockers:
- Docker CLI still unavailable in this environment, so smoke run is documented as blocked here and must be rerun in Docker-enabled host.
- Next:
- Merge `codex/feat/sprint4-practice-v2` into `main`.
- Execute `./scripts/docker-smoke.sh` in Docker-enabled host and append successful evidence.
