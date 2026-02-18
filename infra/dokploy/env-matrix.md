# Environment Matrix

| Variable | Dev | Staging | Prod | Notes |
|---|---|---|---|---|
| NODE_ENV | development | staging | production | Runtime mode |
| DATABASE_URL | local postgres | managed/internal | managed/internal | BetterAuth storage |
| BETTER_AUTH_SECRET | dev secret | strong secret | strong secret | Must be >=32 chars in staging/prod |
| BETTER_AUTH_TRUSTED_ORIGINS | localhost URL | staging URL(s) | prod URL(s) | Comma-separated trusted origins |
| CONVEX_DEPLOYMENT | local-dev | staging | production | Domain backend env |
| CONVEX_ADMIN_KEY | local key | required | required | Required for server-side Convex calls in staging/prod |
| REDIS_URL | local redis | internal redis | internal redis | Queue backend |
| S3_ENDPOINT | minio local | s3-compatible | s3-compatible | Object storage |
| OMR_SERVICE_URL | local | internal service | internal service | OMR API |
| OMR_MODE | replay or audiveris | audiveris | audiveris | Replay mode is for deterministic local runs |
| OMR_REPLAY_MANIFEST_PATH | local replay manifest | optional | optional | Required when `OMR_MODE=replay` |
| FEATURE_PUBLIC_SHARING | false | false | false | Locked until legal approval |
| SENTRY_DSN | optional | required | required | Error observability |
