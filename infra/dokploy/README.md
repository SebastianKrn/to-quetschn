# Dokploy Deployment Notes

Target: VPS with Dokploy-managed Docker Compose.

## Services
- `web`
- `omr-service`
- `worker`
- `postgres`
- `redis`
- `minio`

## Deployment Steps
1. Set environment-specific secrets in Dokploy.
2. Deploy using `docker-compose.yml`.
3. Verify health endpoints (`/api/health`, `omr-service /health`).
4. Run smoke checks for queue and storage.

## Security Baseline
- Keep `FEATURE_PUBLIC_SHARING=false` until legal approval.
- Use strong secrets for Postgres, BetterAuth, and object storage.
