import fs from "node:fs";
import path from "node:path";
import {
  MappingOptionsSchema,
  type GriffDirection,
  type GriffToken,
  type MappingEngine,
  type MappingResult,
  type OmrNote,
  type OmrScore,
  type Tuning,
  type TransposeSuggestion
} from "@grifftab/domain-types";

interface TuningConfig {
  tuning: Tuning;
  rows: number;
  buttonsPerRow: number[];
  mapping: {
    push: Record<string, string[]>;
    pull: Record<string, string[]>;
  };
}

interface Candidate {
  row: number;
  button: number;
  direction: GriffDirection;
}

const tuningCache = new Map<Tuning, TuningConfig>();

const NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#"
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stableArrangementId(input: { title: string; tuning: Tuning; notes: number }): string {
  const raw = `${input.title}:${input.tuning}:${input.notes}`;
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = (hash * 31 + raw.charCodeAt(index)) >>> 0;
  }

  return `arrangement-${hash.toString(16)}`;
}

function parsePitch(pitch: string): { semitone: number; octave: number } {
  const match = pitch.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid pitch: ${pitch}`);
  }

  const [, letterRaw = "", accidentalRaw = "", octaveRaw = ""] = match;
  const letter = letterRaw.toUpperCase();
  const accidental = accidentalRaw;
  const octave = Number(octaveRaw);
  const base = accidental === "b" ? FLAT_TO_SHARP[`${letter}b`] ?? `${letter}${accidental}` : `${letter}${accidental}`;
  const semitone = NOTE_ORDER.indexOf(base);

  if (semitone < 0) {
    throw new Error(`Unsupported pitch: ${pitch}`);
  }

  return { semitone, octave };
}

function toMidi(pitch: string): number {
  const { semitone, octave } = parsePitch(pitch);
  return (octave + 1) * 12 + semitone;
}

function fromMidi(midi: number): string {
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_ORDER[semitone]}${octave}`;
}

function transposePitch(pitch: string, semitones: number): string {
  return fromMidi(toMidi(pitch) + semitones);
}

function loadTuningConfig(tuning: Tuning): TuningConfig {
  const cached = tuningCache.get(tuning);
  if (cached) {
    return cached;
  }

  const candidates = [
    path.resolve(process.cwd(), "docs", "domain", "tunings", `${tuning}.json`),
    path.resolve(process.cwd(), "..", "..", "docs", "domain", "tunings", `${tuning}.json`),
    path.resolve(process.cwd(), "..", "..", "..", "docs", "domain", "tunings", `${tuning}.json`)
  ];

  const configPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!configPath) {
    throw new Error(`Missing tuning config for ${tuning}`);
  }

  const configRaw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(configRaw) as TuningConfig;

  tuningCache.set(tuning, parsed);
  return parsed;
}

function buildCandidates(config: TuningConfig): Map<string, Candidate[]> {
  const out = new Map<string, Candidate[]>();

  const add = (pitch: string, candidate: Candidate) => {
    const existing = out.get(pitch) ?? [];
    existing.push(candidate);
    out.set(pitch, existing);
  };

  const directions: GriffDirection[] = ["push", "pull"];
  for (const direction of directions) {
    const rows = config.mapping[direction];
    for (const [rowKey, notes] of Object.entries(rows)) {
      const row = Number(rowKey.replace("row", ""));
      notes.forEach((pitch, index) => {
        add(pitch, {
          row,
          button: index + 1,
          direction
        });
      });
    }
  }

  return out;
}

function scoreCandidate(input: {
  candidate: Candidate;
  previous: GriffToken | null;
  streak: number;
  maxConsecutiveDirection: number;
}): number {
  const { candidate, previous } = input;
  if (!previous) {
    return 1;
  }

  let score = 1;
  const directionFlip = previous.direction !== candidate.direction;
  if (directionFlip) {
    score -= 0.16;
  }

  const buttonJump = Math.abs(previous.button - candidate.button);
  score -= Math.min(buttonJump * 0.04, 0.45);

  const rowJump = Math.abs(previous.row - candidate.row);
  score -= Math.min(rowJump * 0.06, 0.18);

  if (previous.direction === candidate.direction) {
    score += 0.05;
  }

  if (previous.row === candidate.row) {
    score += 0.03;
  }

  if (!directionFlip && input.streak >= input.maxConsecutiveDirection) {
    score -= 0.35;
  }

  return clamp(score, 0, 1);
}

function chooseCandidate(input: {
  candidates: Candidate[];
  previous: GriffToken | null;
  streak: number;
  maxConsecutiveDirection: number;
}): Candidate {
  const ranked = input.candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidate({
        candidate,
        previous: input.previous,
        streak: input.streak,
        maxConsecutiveDirection: input.maxConsecutiveDirection
      })
    }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top) {
    throw new Error("No mapping candidates available");
  }

  return top.candidate;
}

function sortedNotes(score: OmrScore): OmrNote[] {
  return [...score.notes].sort((left, right) => {
    if (left.measure !== right.measure) {
      return left.measure - right.measure;
    }

    return left.beat - right.beat;
  });
}

function estimatePlayability(input: {
  notes: OmrNote[];
  candidatesByPitch: Map<string, Candidate[]>;
  semitones: number;
}): { ratio: number; bellowsChanges: number } {
  let playable = 0;
  let bellowsChanges = 0;
  let previousDirection: GriffDirection | null = null;

  for (const note of input.notes) {
    const transposed = transposePitch(note.pitch, input.semitones);
    const candidates = input.candidatesByPitch.get(transposed) ?? [];
    if (candidates.length === 0) {
      continue;
    }

    playable += 1;
    const firstCandidate = candidates[0];
    if (!firstCandidate) {
      continue;
    }

    const direction = firstCandidate.direction;
    if (previousDirection && previousDirection !== direction) {
      bellowsChanges += 1;
    }

    previousDirection = direction;
  }

  const ratio = input.notes.length === 0 ? 1 : playable / input.notes.length;
  return { ratio, bellowsChanges };
}

function buildTransposeSuggestions(input: {
  notes: OmrNote[];
  candidatesByPitch: Map<string, Candidate[]>;
}): TransposeSuggestion[] {
  const semitoneCandidates = [-3, -2, -1, 1, 2, 3, 4];

  return semitoneCandidates
    .map((semitones) => {
      const estimate = estimatePlayability({
        notes: input.notes,
        candidatesByPitch: input.candidatesByPitch,
        semitones
      });

      const firstPitch = input.notes[0] ? transposePitch(input.notes[0].pitch, semitones) : "N/A";
      const score = clamp(estimate.ratio - estimate.bellowsChanges * 0.02, 0, 1);

      return {
        semitones,
        targetKey: firstPitch,
        playabilityScore: Number(score.toFixed(3)),
        estimatedBellowsChanges: estimate.bellowsChanges,
        reason: `Transponierung ${semitones > 0 ? "+" : ""}${semitones} optimiert Spielbarkeit und Balgwechsel.`
      } satisfies TransposeSuggestion;
    })
    .sort((a, b) => b.playabilityScore - a.playabilityScore)
    .slice(0, 3);
}

export class HeuristicMappingEngine implements MappingEngine {
  async mapScoreToGriffschrift(
    score: OmrScore,
    tuning: Tuning,
    options = MappingOptionsSchema.parse({})
  ): Promise<MappingResult> {
    const config = loadTuningConfig(tuning);
    const candidatesByPitch = buildCandidates(config);
    const notes = sortedNotes(score);

    const warnings: string[] = [];
    const unplayable: OmrNote[] = [];
    const tokensByMeasure = new Map<number, GriffToken[]>();

    let previous: GriffToken | null = null;
    let directionStreak = 0;

    notes.forEach((note, index) => {
      const candidates = candidatesByPitch.get(note.pitch) ?? [];
      if (candidates.length === 0) {
        unplayable.push(note);
        return;
      }

      const selected = chooseCandidate({
        candidates,
        previous,
        streak: directionStreak,
        maxConsecutiveDirection: options.maxConsecutiveDirection
      });

      if (previous?.direction === selected.direction) {
        directionStreak += 1;
      } else {
        directionStreak = 1;
      }

      const token: GriffToken = {
        id: `m${note.measure}-b${note.beat}-${index}`,
        pitch: note.pitch,
        row: selected.row,
        button: selected.button,
        direction: selected.direction,
        measure: note.measure,
        beat: note.beat,
        duration: note.duration
      };

      const byMeasure = tokensByMeasure.get(note.measure) ?? [];
      byMeasure.push(token);
      tokensByMeasure.set(note.measure, byMeasure);
      previous = token;
    });

    if (unplayable.length > 0) {
      warnings.push(
        `${unplayable.length} Ton(e) sind in ${tuning} nicht direkt spielbar. Transpositionsbestätigung erforderlich.`
      );
    }

    const transposeSuggestions =
      unplayable.length > 0
        ? buildTransposeSuggestions({
            notes: unplayable,
            candidatesByPitch
          })
        : [];

    const measures = [...tokensByMeasure.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([index, tokens]) => ({ index, tokens }));

    return {
      arrangement: {
        id: stableArrangementId({
          title: score.title,
          tuning,
          notes: score.notes.length
        }),
        title: score.title,
        tuning,
        tempoBpm: score.tempoBpm,
        measures,
        metadata: {
          strategy: "heuristic-v1",
          optimizeBellows: String(options.optimizeBellows),
          explanation: "Bewertung nach Balgwechsel, Knopfsprüngen und Reihenkontinuität"
        }
      },
      warnings,
      transposeSuggestions
    };
  }
}
