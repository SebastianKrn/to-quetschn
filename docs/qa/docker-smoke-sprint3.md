# Sprint 3 Docker Smoke Validation

## Purpose
Validate local compose deployment readiness for `web`, `omr-service`, `worker`, `postgres`, `redis`, and `minio`.

## Runbook
1. Ensure Docker Engine and Docker Compose are installed.
2. Run:
```bash
./scripts/docker-smoke.sh
```
3. If successful, archive command output in CI artifact or release notes.

## Manual Equivalent
```bash
docker compose -f docker-compose.dev.yml config >/dev/null
docker compose -f docker-compose.dev.yml up -d
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:4100/health
docker compose -f docker-compose.dev.yml logs worker --tail=200
docker compose -f docker-compose.dev.yml down --remove-orphans
```

## Current Environment Status
- Last attempted in this Codex environment: February 12, 2026.
- Result: blocked (`docker: command not found`).
- Required follow-up: execute the runbook in a Docker-enabled host/session and attach output evidence.
