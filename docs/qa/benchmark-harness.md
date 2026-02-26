# Benchmark Harness

## Purpose
Run deterministic OMR normalization + mapping regressions from a manifest while respecting licensing gates.

## Manifest
Use `benchmarks/manifest.json` (template: `docs/qa/benchmark-manifest.template.json`).

Sprint 6 baseline:
- 12 executable `licenseStatus=licensed` entries
- strict thresholds retained for all licensed fixtures unless explicitly documented per-entry

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
pnpm benchmark --strict
```

- JSON summary output:
```bash
pnpm benchmark --json .artifacts/benchmark-summary.json
```

- Sprint 4 strict evidence artifact:
```bash
pnpm benchmark --strict --json .artifacts/benchmark-summary-sprint4.json
```

## Threshold Policy
- Default thresholds are strict (`tokenMatchRatioMin=1`, `requireMeasureCount=true`, `requireTransposeSuggestions=true`).
- Per-entry threshold overrides are allowed only with a written rationale in the entry `notes`.
- Synthetic licensed fixtures should keep strict defaults unless parser/mapping variability is intentionally under study.
- Sprint 4 tuning decision: fixtures `sample-licensed-006..008` were evaluated in strict mode and retained strict defaults with rationale documented in each entry `notes`.

## Licensing Guardrails
- Only `licenseStatus=licensed` entries are executed.
- `pending` and `blocked` entries are skipped with explicit reason in the summary.
- Do not commit copyrighted source files without explicit license approval.

## CI Behavior
CI runs benchmark in strict blocking mode and uploads the summary artifact:
```bash
pnpm benchmark --strict --json .artifacts/benchmark-summary.json
```
