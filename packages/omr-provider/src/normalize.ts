import { OmrScoreSchema, type OmrScore } from "@grifftab/domain-types";
import { createOmrError } from "./errors.js";

function parseDelimitedNotes(stdout: string): OmrScore | null {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) {
    return null;
  }

  const notes = lines.map((line, index) => {
    const [measure, beat, pitch, duration] = line.split(",").map((part) => part.trim());
    if (!measure || !beat || !pitch || !duration) {
      throw createOmrError({
        code: "OMR_PARSE_FAILED",
        message: `Invalid normalized note row at index ${index}`,
        retryable: false
      });
    }

    return {
      measure: Number(measure),
      beat: Number(beat),
      pitch,
      duration
    };
  });

  return OmrScoreSchema.parse({
    title: "Audiveris Extract",
    tempoBpm: 80,
    timeSignature: "4/4",
    notes
  });
}

export function normalizeAudiverisOutput(input: {
  stdout: string;
  sourceFilePath: string;
}): OmrScore {
  const trimmed = input.stdout.trim();

  if (!trimmed) {
    throw createOmrError({
      code: "OMR_PARSE_FAILED",
      message: "Audiveris returned empty output",
      retryable: false,
      details: { sourceFilePath: input.sourceFilePath }
    });
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return OmrScoreSchema.parse(parsed);
  } catch {
    const fromDelimited = parseDelimitedNotes(trimmed);
    if (fromDelimited) {
      return fromDelimited;
    }

    throw createOmrError({
      code: "OMR_PARSE_FAILED",
      message: "Audiveris output could not be normalized",
      retryable: false,
      details: { sourceFilePath: input.sourceFilePath }
    });
  }
}
