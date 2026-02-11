# Environment Matrix

| Variable | Dev | Staging | Prod | Notes |
|---|---|---|---|---|
| NODE_ENV | development | staging | production | Runtime mode |
| DATABASE_URL | local postgres | managed/internal | managed/internal | BetterAuth storage |
| CONVEX_DEPLOYMENT | local-dev | staging | production | Domain backend env |
| REDIS_URL | local redis | internal redis | internal redis | Queue backend |
| S3_ENDPOINT | minio local | s3-compatible | s3-compatible | Object storage |
| OMR_SERVICE_URL | local | internal service | internal service | OMR API |
| FEATURE_PUBLIC_SHARING | false | false | false | Locked until legal approval |
| SENTRY_DSN | optional | required | required | Error observability |
