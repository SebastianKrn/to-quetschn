# ADR-0003: OMR Provider Interface

Date: 2026-02-11
Status: Accepted

## Context
OMR quality and vendor/tool options can change over time.

## Decision
Adopt provider abstraction:
- `OmrProvider` defines extraction contract.
- `AudiverisOmrProvider` is initial adapter.
- Web/worker code depends on `OmrProvider`, not provider internals.

## Consequences
- Swappable providers (future JS/WASM alternatives)
- Cleaner testing via fake providers
- Slightly more boilerplate now, lower lock-in later
