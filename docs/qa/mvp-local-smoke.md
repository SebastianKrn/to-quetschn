# MVP Local Smoke Runbook (Sprint 6)

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
- fixture: `benchmarks/pdfs/sample-licensed-001.pdf`
- dev auth header via `x-dev-user-id` (development/test only)

## Manual Flow (Host Apps + Docker Infra)
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

## One-Command Automated Smoke
```bash
pnpm mvp:scenario
```
Expected outputs:
- `.artifacts/mvp-scenario-summary.json`
- service logs in `.artifacts/mvp/*.log`

## Teardown
```bash
pnpm mvp:down
```

## Troubleshooting
- `Docker CLI not found`:
  - Install Docker Desktop/Engine and ensure `docker` is on `PATH`.
- `Docker daemon is not reachable`:
  - Start Docker daemon and retry.
- Playwright browser missing:
  - Run `pnpm --filter @grifftab/web exec playwright install chromium`.
- Conversion fails with replay fixture error:
  - Ensure `OMR_MODE=replay` and fixture is `benchmarks/pdfs/sample-licensed-001.pdf`.
- Export fails due bucket missing:
  - Re-run `pnpm mvp:infra:up` (bucket creation is part of the script).
