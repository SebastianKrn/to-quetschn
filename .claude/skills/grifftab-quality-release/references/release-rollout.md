# Release and Rollout

1. Validate staging env variables.
2. Deploy compose stack in staging.
3. Run health and queue smoke tests.
4. Promote to production only after checks are green.
5. Record release summary and known risks in `memory.md`.
