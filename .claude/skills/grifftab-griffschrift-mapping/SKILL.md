---
name: grifftab-griffschrift-mapping
description: Implement and refine note-to-Griffschrift mapping logic, tuning configs, bellows heuristics, and transposition suggestions. Use when tasks involve row/button/direction mapping, tuning JSON updates, or playability scoring decisions.
---

# GriffTab Griffschrift Mapping

Use this skill for all mapping-engine and notation conversion logic.

## Workflow
1. Load the relevant tuning config from `docs/domain/tunings/*.json`.
2. Apply deterministic heuristic rules first (no ML path in MVP).
3. If note cannot be mapped, produce ranked transpose suggestions and require explicit confirmation path.
4. Keep outputs aligned with `Arrangement` and `GriffToken` contracts.

## Heuristic Priorities
1. Minimize excessive bellows direction flips.
2. Prefer ergonomic button continuity.
3. Avoid rare/extreme reaches where alternatives exist.

## German Domain Examples
- "Zugphase zu lang" -> suggest alternate button where available.
- "Ton nicht spielbar in GCFB" -> return transpose options before mapping continuation.

## Resources
- `references/heuristic-scoring.md`
- `references/tuning-governance.md`
