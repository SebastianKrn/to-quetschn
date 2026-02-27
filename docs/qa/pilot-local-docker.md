# Pilot Local Docker Runbook (Sprint 7)

## Purpose
Run the private MVP pilot locally with:
- BetterAuth session login/registration
- upload rights acknowledgement
- conversion -> practice token edit -> export flow
- Audiveris-backed OMR mode

## Prerequisites
- Docker Engine + Docker Compose
- Node.js 22+
- pnpm 10+
- Chromium for Playwright smoke

## Startup
```bash
pnpm install
pnpm pilot:up
```

## Pilot Smoke (Automated)
```bash
# point to a real local sheet-music PDF (placeholder benchmark PDFs are not valid for audiveris)
MVP_SCENARIO_FIXTURE=/absolute/path/to/song-1.pdf \
pnpm pilot:smoke
```

Expected outputs:
- `.artifacts/pilot/pilot-smoke.log`
- `.artifacts/pilot/pilot-scenario-summary.json`

## Manual Pilot Flow
1. Open `http://localhost:3000/register`
2. Create account (name, email, password)
3. Upload a PDF (`benchmarks/pdfs/sample-licensed-001.pdf` recommended)
4. Confirm rights checkbox
5. Start conversion and wait for `completed`
6. Open practice and save one token edit
7. Start export and wait for `completed`
8. Verify `PDF herunterladen` link is available

## Audiveris Scenario Batch
```bash
PILOT_AUDIVERIS_FIXTURES=/absolute/path/to/song-1.pdf,/absolute/path/to/song-2.pdf,/absolute/path/to/song-3.pdf \
pnpm pilot:scenario:audiveris
```

Expected outputs:
- `.artifacts/pilot/audiveris-summaries/*.json`
- `.artifacts/pilot/audiveris-summary.json`

Fixture requirements:
- At least 3 PDFs for `pilot:scenario:audiveris`.
- Each file must be a real PDF (`%PDF` header, >1KB). Placeholder fixtures are rejected.

## Evidence Bundle
```bash
pnpm pilot:evidence
```

Bundle location:
- `.artifacts/pilot/evidence/`

## Teardown
```bash
pnpm pilot:down
```

## Known Error Codes
- `OMR_TIMEOUT`
- `OMR_UNAVAILABLE`
- `OMR_PARSE_FAILED`
- `OMR_INPUT_INVALID`

## Tester Feedback Handoff
Request testers to attach:
- `.artifacts/pilot/evidence/evidence-manifest.json`
- `.artifacts/pilot/evidence/pilot-smoke.log`
- `.artifacts/pilot/evidence/pilot-docker-scenario-summary.json`
- any relevant `.artifacts/pilot/evidence/mvp-logs/*.log`
