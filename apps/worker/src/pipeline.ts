import {
  OmrErrorSchema,
  type OmrNote,
  type Arrangement,
  type ConversionQueuePayload,
  type MappingEngine,
  type OmrScore,
  type Tuning,
  type TransposeSuggestion
} from "@grifftab/domain-types";

const NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#"
};

export interface DomainClient {
  updateConversion(input: {
    id: string;
    status: "processing" | "needs_transpose_confirmation" | "completed" | "failed" | "queued";
    progress: number;
    errorCode?: string | null;
    transposeSuggestions?: TransposeSuggestion[];
  }): Promise<void>;
  upsertArrangement(arrangement: Arrangement, ownerUserId: string): Promise<void>;
}

export interface OmrClient {
  extractScore(input: {
    sourceFilePath: string;
    correlationId: string;
  }): Promise<OmrScore>;
}

function toMidi(pitch: string): number {
  const match = pitch.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid pitch: ${pitch}`);
  }

  const [, letterRaw = "", accidentalRaw = "", octaveRaw = ""] = match;
  const letter = letterRaw.toUpperCase();
  const accidental = accidentalRaw;
  const octave = Number(octaveRaw);
  const normalized = accidental === "b" ? FLAT_TO_SHARP[`${letter}b`] ?? `${letter}${accidental}` : `${letter}${accidental}`;
  const semitone = NOTE_ORDER.indexOf(normalized as (typeof NOTE_ORDER)[number]);

  if (semitone < 0) {
    throw new Error(`Unsupported pitch: ${pitch}`);
  }

  return (octave + 1) * 12 + semitone;
}

function fromMidi(midi: number): string {
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_ORDER[semitone]}${octave}`;
}

function transposeNote(note: OmrNote, semitones: number): OmrNote {
  if (semitones === 0) {
    return note;
  }

  return {
    ...note,
    pitch: fromMidi(toMidi(note.pitch) + semitones)
  };
}

function applyTranspose(score: OmrScore, semitones: number | undefined): OmrScore {
  if (!semitones || semitones === 0) {
    return score;
  }

  return {
    ...score,
    notes: score.notes.map((note) => transposeNote(note, semitones))
  };
}

export async function runConversionPipeline(input: {
  payload: ConversionQueuePayload;
  mappingEngine: MappingEngine;
  domainClient: DomainClient;
  omrClient: OmrClient;
}): Promise<{ status: "completed" | "needs_transpose_confirmation" }> {
  const { payload, mappingEngine, domainClient, omrClient } = input;

  await domainClient.updateConversion({
    id: payload.conversionId,
    status: "processing",
    progress: 10,
    errorCode: null
  });

  const score = await omrClient.extractScore({
    sourceFilePath: payload.sourceDownloadUrl ?? payload.sourceFileId,
    correlationId: payload.correlationId
  });
  const transposedScore = applyTranspose(score, payload.transposeSemitones);

  await domainClient.updateConversion({
    id: payload.conversionId,
    status: "processing",
    progress: 55,
    errorCode: null
  });

  const mapped = await mappingEngine.mapScoreToGriffschrift(transposedScore, payload.tuning as Tuning);

  if (mapped.transposeSuggestions.length > 0 && !payload.transposeSemitones) {
    await domainClient.updateConversion({
      id: payload.conversionId,
      status: "needs_transpose_confirmation",
      progress: 100,
      errorCode: null,
      transposeSuggestions: mapped.transposeSuggestions
    });

    return { status: "needs_transpose_confirmation" };
  }

  await domainClient.upsertArrangement({
    ...mapped.arrangement,
    id: payload.conversionId,
    metadata: {
      ...mapped.arrangement.metadata,
      conversionId: payload.conversionId,
      correlationId: payload.correlationId,
      ...(payload.transposeSemitones
        ? {
            transposeSemitones: String(payload.transposeSemitones)
          }
        : {})
    }
  }, payload.ownerUserId);

  await domainClient.updateConversion({
    id: payload.conversionId,
    status: "completed",
    progress: 100,
    errorCode: null
  });

  return { status: "completed" };
}

export function getErrorCode(error: unknown): string {
  const parsed = OmrErrorSchema.safeParse(error);
  if (parsed.success) {
    return parsed.data.code;
  }

  if (error instanceof Error && typeof error.message === "string") {
    return error.message.includes("OMR_") ? error.message : "UNKNOWN_ERROR";
  }

  return "UNKNOWN_ERROR";
}

export function isRetryableOmrError(error: unknown): boolean {
  const parsed = OmrErrorSchema.safeParse(error);
  if (parsed.success) {
    return parsed.data.retryable;
  }

  return false;
}
