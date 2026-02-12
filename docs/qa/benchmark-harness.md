# Benchmark Harness

## Purpose
Run deterministic OMR normalization + mapping regressions from a manifest while respecting licensing gates.

## Manifest
Use `benchmarks/manifest.json` (template: `docs/qa/benchmark-manifest.template.json`).

Entry fields:
- `id`, `title`
- `sourcePdf` (reference source path)
- `normalizedInput` (captured OMR output to normalize; required for `licensed`)
- `expectedJson` (expected token/measure fixture)
- `tuning` (`GCFB`, `ADGC`, `BEADG`, `CFBB`)
- `licenseStatus` (`licensed`, `pending`, `blocked`)
- optional `thresholds` for token/measure/transpose checks

## Commands
- Advisory (default):
```bash
pnpm benchmark
```

- Strict failure mode:
```bash
pnpm benchmark -- --strict
```

- JSON summary output:
```bash
pnpm benchmark -- --json .artifacts/benchmark-summary.json
```

## Licensing Guardrails
- Only `licenseStatus=licensed` entries are executed.
- `pending` and `blocked` entries are skipped with explicit reason in the summary.
- Do not commit copyrighted source files without explicit license approval.

## CI Behavior
CI runs benchmark in advisory mode (non-blocking) and uploads the summary artifact.
Strict mode can be enabled later once the licensed dataset and thresholds are finalized.
