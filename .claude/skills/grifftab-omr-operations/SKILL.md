---
name: grifftab-omr-operations
description: Operate and improve GriffTab OMR ingestion and processing workflow with the Audiveris-default provider boundary. Use for PDF ingestion changes, OMR provider adapters, extraction errors/timeouts, retry behavior, and OMR-related service troubleshooting.
---

# GriffTab OMR Operations

Use this skill when touching OMR pipeline behavior.

## Workflow
1. Confirm whether the task affects provider contract, service API, or worker retry logic.
2. Keep provider interaction behind `OmrProvider` interface.
3. Encode timeout/error behavior deterministically.
4. Update troubleshooting docs when failure modes change.

## Failure Handling Policy
- Timeouts and command failures must map to typed error responses.
- Keep logs structured with correlation IDs where available.
- Retries belong to queue/worker, not synchronous API handlers.

## Resources
- `references/audiveris-runbook.md`
- `references/error-taxonomy.md`
