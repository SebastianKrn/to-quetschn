# MVP Local Test Instructions (Tomorrow)

Date prepared: 2026-02-26
Branch: `codex/feat/sprint6-mvp-local-scenario`

## Goal
Run the GriffTab MVP locally and validate the full flow:
- convert
- practice token edit
- export

## Preconditions
- Docker Desktop/Engine is running
- Node 22+ and pnpm 10+ are installed
- You are in the repo root (`/Users/skern/Work/projects-01/to-quetschn`)

## 1. Setup
```bash
pnpm install
pnpm --filter @grifftab/web exec playwright install chromium
```

## 2. Start local MVP runtime
```bash
pnpm mvp:infra:up
pnpm mvp:apps:up
```

Keep the `mvp:apps:up` terminal running.

## 3. Manual MVP verification in browser
1. Open [http://localhost:3000](http://localhost:3000)
2. Use fixture: `benchmarks/pdfs/sample-licensed-001.pdf`
3. Click `Konvertierung starten`
4. Wait for conversion to become `completed`
   - If transpose confirmation appears, confirm it and wait again
5. Click `Praxis öffnen`
6. In practice view:
   - click a token in SVG
   - modify row/button/direction
   - click `Token speichern`
   - verify `Token wurde gespeichert.` message
7. Trigger export and verify status becomes `completed`
8. Verify download link appears (`PDF herunterladen`)

## 4. Automated smoke (optional)
```bash
pnpm mvp:scenario
```

Expected artifact:
- `.artifacts/mvp-scenario-summary.json`

Log files:
- `.artifacts/mvp/omr-service.log`
- `.artifacts/mvp/worker.log`
- `.artifacts/mvp/web.log`

## 5. Teardown
```bash
pnpm mvp:down
```

## 6. Quick troubleshoot
- Docker missing/unavailable:
  - Start Docker Desktop/Engine and retry `pnpm mvp:infra:up`
- MinIO bootstrap error (`mc: 'sh' is not a recognized command`):
  - Pull latest branch changes and rerun `pnpm mvp:infra:up`
- Browser missing for e2e:
  - run `pnpm --filter @grifftab/web exec playwright install chromium`
- Replay fixture mismatch:
  - use `benchmarks/pdfs/sample-licensed-001.pdf` for deterministic smoke
- Conversion status stuck on `queued`:
  - restart via `pnpm mvp:down && pnpm mvp:apps:up` to refresh shared local domain state

## 7. Quality checks before next commit
```bash
pnpm benchmark --strict --json .artifacts/benchmark-summary.json
pnpm verify
pnpm validate:skills
pnpm validate:memory
```
