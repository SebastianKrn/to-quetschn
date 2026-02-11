# Griffschrift Notation Reference (MVP)

## Core Symbols
- Knopfzahl: `1-11` (button index by row)
- Reihe: `1-4`
- Balgrichtung:
  - `push` (`Druck`, traditionally shown as circle)
  - `pull` (`Zug`, traditionally shown as filled circle)

## Canonical Token Model
Each rendered/editable unit references:
- pitch (source reference)
- row
- button
- direction (`push|pull`)
- measure index
- beat offset
- duration

## Policy Defaults
- Prefer deterministic mapping with explicit score explanation.
- If note is unplayable, emit transposition suggestions and require user confirmation.
