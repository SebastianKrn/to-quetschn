# MVP Local Smoke Runbook (Sprint 8)

## Purpose
Validate the local MVP workflow end-to-end:
- PDF upload
- conversion polling
- practice mode token correction
- export polling and download link

## Prerequisites
- Node.js 22+
- pnpm 10+
- Docker Engine + Docker Compose
- Chromium for Playwright (`pnpm --filter @grifftab/web exec playwright install chromium`)

## Environment
The local smoke flow uses:
- `.env.dev.example`
- `OMR_MODE=replay` (forced by MVP scripts)
- `LOCAL_DOMAIN_STORE_PATH=.artifacts/mvp/local-domain-store.json` (set by `mvp:apps:up` for local shared fallback state)
- fixture: `benchmarks/pdfs/sample-licensed-001.pdf`
- dev auth header via `x-dev-user-id` (development/test only)

## Primary Gate (One Command)
```bash
pnpm mvp:ready
```

This command runs:
- `pnpm verify`
- `pnpm benchmark --strict --json .artifacts/benchmark-summary.json`
- `pnpm mvp:scenario --mode replay --auth dev-header --summary .artifacts/mvp-scenario-summary.json`

Expected outputs:
- `.artifacts/benchmark-summary.json`
- `.artifacts/mvp-scenario-summary.json`
- `.artifacts/mvp/*.log`

## Manual Fallback Flow (Host Apps + Docker Infra)
1. Install dependencies:
```bash
pnpm install
```
2. Start infra services (`postgres`, `redis`, `minio`):
```bash
pnpm mvp:infra:up
```
3. Start app services (`web`, `omr-service`, `worker`) and keep terminal running:
```bash
pnpm mvp:apps:up
```
4. Open [http://localhost:3000](http://localhost:3000).
5. Upload `benchmarks/pdfs/sample-licensed-001.pdf`.
6. Wait for conversion completion.
7. Open practice mode, click a token in SVG, edit row/button/direction, save.
8. Trigger export and wait for `completed` status with download URL.

## Replay Scenario Only (Without Full Ready Gate)
```bash
pnpm mvp:scenario --mode replay
```
Expected outputs:
- `.artifacts/mvp-scenario-summary.json`
- service logs in `.artifacts/mvp/*.log`

Audiveris parity mode:
```bash
pnpm mvp:scenario --mode audiveris --fixture benchmarks/pdfs/sample-licensed-001.pdf
```
Use this mode only for parity checks; it is not part of local MVP replay GA gate.

## Teardown
```bash
pnpm mvp:down
```

## Troubleshooting
- `Docker CLI not found`:
  - Install Docker Desktop/Engine and ensure `docker` is on `PATH`.
- `Docker daemon is not reachable`:
  - Start Docker daemon and retry.
- `mc: <ERROR> 'sh' is not a recognized command` during `mvp:infra:up`:
  - Update to the latest branch revision; bucket bootstrap now sets MinIO entrypoint explicitly.
- Playwright browser missing:
  - Run `pnpm --filter @grifftab/web exec playwright install chromium`.
- Conversion fails with replay fixture error:
  - Ensure `OMR_MODE=replay` and fixture is `benchmarks/pdfs/sample-licensed-001.pdf`.
- Export fails due bucket missing:
  - Re-run `pnpm mvp:infra:up` (bucket creation is part of the script).
- Conversion polling stays `queued` in local-only runs:
  - Ensure `pnpm mvp:apps:up` was started from this branch so web+worker share `LOCAL_DOMAIN_STORE_PATH`.
- Pilot/Audiveris issues:
  - Use `docs/qa/pilot-local-docker.md` for pilot-specific troubleshooting and evidence steps.
