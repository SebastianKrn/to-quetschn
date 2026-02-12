import { OmrScoreSchema, type OmrScore } from "@grifftab/domain-types";
import { createOmrError } from "./errors.js";

type ParserName = "json" | "musicxml" | "delimited";

export interface NormalizedAudiverisOutput {
  score: OmrScore;
  parser: ParserName;
  attempts: ParserName[];
}

function parseDelimitedNotes(content: string): OmrScore | null {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) {
    return null;
  }

  const notes = lines.map((line, index) => {
    const [measureRaw, beatRaw, pitchRaw, durationRaw] = line.split(",").map((part) => part.trim());
    if (!measureRaw || !beatRaw || !pitchRaw || !durationRaw) {
      throw createOmrError({
        code: "OMR_PARSE_FAILED",
        message: `Invalid normalized note row at index ${index}`,
        retryable: false
      });
    }

    const measure = Number(measureRaw);
    const beat = Number(beatRaw);
    if (!Number.isFinite(measure) || !Number.isFinite(beat)) {
      throw createOmrError({
        code: "OMR_PARSE_FAILED",
        message: `Invalid numeric note fields at index ${index}`,
        retryable: false
      });
    }

    return {
      measure,
      beat,
      pitch: pitchRaw,
      duration: durationRaw
    };
  });

  return OmrScoreSchema.parse({
    title: "Audiveris Extract",
    tempoBpm: 80,
    timeSignature: "4/4",
    notes
  });
}

function beatDurationForType(durationType: string | null): number {
  switch (durationType) {
    case "whole":
      return 4;
    case "half":
      return 2;
    case "quarter":
      return 1;
    case "eighth":
      return 0.5;
    case "16th":
      return 0.25;
    case "32nd":
      return 0.125;
    default:
      return 1;
  }
}

function extractTagValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function toAccidental(alter: string | null): string {
  if (!alter) {
    return "";
  }

  const amount = Number(alter);
  if (!Number.isFinite(amount) || amount === 0) {
    return "";
  }

  if (amount > 0) {
    return "#".repeat(Math.round(amount));
  }

  return "b".repeat(Math.round(Math.abs(amount)));
}

function parseMusicXml(content: string): OmrScore | null {
  const trimmed = content.trim();
  if (!trimmed.includes("<score-partwise") && !trimmed.includes("<score-timewise")) {
    return null;
  }

  const title =
    extractTagValue(trimmed, "work-title") ??
    extractTagValue(trimmed, "movement-title") ??
    "Audiveris Extract";

  const beats = extractTagValue(trimmed, "beats") ?? "4";
  const beatType = extractTagValue(trimmed, "beat-type") ?? "4";
  const timeSignature = `${beats}/${beatType}`;

  const tempoMatch = trimmed.match(/<sound[^>]*tempo=["']([0-9.]+)["']/i);
  const tempoBpmRaw = tempoMatch?.[1] ? Number(tempoMatch[1]) : 80;
  const tempoBpm = Number.isFinite(tempoBpmRaw) ? Math.max(1, Math.round(tempoBpmRaw)) : 80;

  const notes: OmrScore["notes"] = [];
  const measureRegex = /<measure\b([^>]*)>([\s\S]*?)<\/measure>/gi;
  let measureMatch = measureRegex.exec(trimmed);
  let measureIndex = 1;

  while (measureMatch) {
    const attrs = measureMatch[1] ?? "";
    const body = measureMatch[2] ?? "";
    const numberMatch = attrs.match(/number=["']([^"']+)["']/i);
    const parsedMeasure = Number(numberMatch?.[1]);
    const measure = Number.isFinite(parsedMeasure) && parsedMeasure > 0 ? parsedMeasure : measureIndex;

    let beat = 0;
    const noteRegex = /<note\b[^>]*>([\s\S]*?)<\/note>/gi;
    let noteMatch = noteRegex.exec(body);

    while (noteMatch) {
      const noteBody = noteMatch[1] ?? "";
      const isRest = /<rest\b[^>]*\/>/i.test(noteBody) || /<rest\b[^>]*>[\s\S]*?<\/rest>/i.test(noteBody);
      const isChord = /<chord\s*\/>/i.test(noteBody);
      const durationType = extractTagValue(noteBody, "type") ?? "quarter";
      const beatIncrement = beatDurationForType(durationType);

      if (!isRest) {
        const step = extractTagValue(noteBody, "step");
        const octave = extractTagValue(noteBody, "octave");
        if (!step || !octave) {
          throw createOmrError({
            code: "OMR_PARSE_FAILED",
            message: "MusicXML note is missing step or octave",
            retryable: false
          });
        }

        const alter = extractTagValue(noteBody, "alter");
        const accidental = toAccidental(alter);

        notes.push({
          measure,
          beat: isChord ? Math.max(beat - beatIncrement, 0) : beat,
          pitch: `${step.toUpperCase()}${accidental}${octave}`,
          duration: durationType
        });
      }

      if (!isChord) {
        beat += beatIncrement;
      }

      noteMatch = noteRegex.exec(body);
    }

    measureMatch = measureRegex.exec(trimmed);
    measureIndex += 1;
  }

  return OmrScoreSchema.parse({
    title,
    tempoBpm,
    timeSignature,
    notes
  });
}

function parseCanonicalJson(content: string): OmrScore | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    return OmrScoreSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function normalizeAudiverisOutputDetailed(input: {
  stdout: string;
  sourceFilePath: string;
  inputSource?: string;
}): NormalizedAudiverisOutput {
  const trimmed = input.stdout.trim();
  if (!trimmed) {
    throw createOmrError({
      code: "OMR_PARSE_FAILED",
      message: "Audiveris returned empty output",
      retryable: false,
      details: {
        sourceFilePath: input.sourceFilePath,
        inputSource: input.inputSource ?? "stdout",
        parsersTried: "none"
      }
    });
  }

  const attempts: ParserName[] = [];
  const parserErrors: string[] = [];

  const parsers: Array<{
    name: ParserName;
    parse: (content: string) => OmrScore | null;
  }> = [
    { name: "json", parse: parseCanonicalJson },
    { name: "musicxml", parse: parseMusicXml },
    { name: "delimited", parse: parseDelimitedNotes }
  ];

  for (const parser of parsers) {
    attempts.push(parser.name);
    try {
      const score = parser.parse(trimmed);
      if (score) {
        return {
          score,
          parser: parser.name,
          attempts
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      parserErrors.push(`${parser.name}:${message}`);
    }
  }

  throw createOmrError({
    code: "OMR_PARSE_FAILED",
    message: "Audiveris output could not be normalized",
    retryable: false,
    details: {
      sourceFilePath: input.sourceFilePath,
      inputSource: input.inputSource ?? "stdout",
      parsersTried: attempts.join(","),
      parserErrors: parserErrors.join(" | ") || "none"
    }
  });
}

export function normalizeAudiverisOutput(input: {
  stdout: string;
  sourceFilePath: string;
  inputSource?: string;
}): OmrScore {
  return normalizeAudiverisOutputDetailed(input).score;
}
