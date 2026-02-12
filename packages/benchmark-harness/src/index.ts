import fs from "node:fs/promises";
import path from "node:path";
import {
  TUNINGS,
  type Arrangement,
  type TransposeSuggestion
} from "@grifftab/domain-types";
import { HeuristicMappingEngine } from "@grifftab/griffschrift-engine";
import { normalizeAudiverisOutputDetailed } from "@grifftab/omr-provider/src/normalize.js";
import { z } from "zod";

const BenchmarkThresholdsSchema = z.object({
  tokenMatchRatioMin: z.number().min(0).max(1).default(1),
  requireMeasureCount: z.boolean().default(true),
  requireTransposeSuggestions: z.boolean().default(true)
});

const BenchmarkEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourcePdf: z.string().min(1),
  normalizedInput: z.string().min(1).optional(),
  expectedJson: z.string().min(1),
  tuning: z.enum(TUNINGS),
  licenseStatus: z.enum(["licensed", "pending", "blocked"]),
  notes: z.string().optional(),
  thresholds: BenchmarkThresholdsSchema.optional()
});

const BenchmarkManifestSchema = z.object({
  version: z.string().min(1),
  description: z.string().min(1),
  entries: z.array(BenchmarkEntrySchema)
});

const ExpectedTokenSchema = z.object({
  measure: z.number().int().min(1),
  beat: z.number().min(0),
  pitch: z.string().min(1),
  row: z.number().int().min(1),
  button: z.number().int().min(1),
  direction: z.enum(["push", "pull"]),
  duration: z.string().min(1)
});

const BenchmarkExpectedSchema = z.object({
  arrangement: z.object({
    title: z.string().min(1).optional(),
    tuning: z.enum(TUNINGS).optional(),
    measureCount: z.number().int().min(0),
    tokenSequence: z.array(ExpectedTokenSchema)
  }),
  transposeSuggestionSemitones: z.array(z.number().int()).default([])
});

export type BenchmarkManifest = z.infer<typeof BenchmarkManifestSchema>;
export type BenchmarkEntry = z.infer<typeof BenchmarkEntrySchema>;

export interface BenchmarkEntryResult {
  id: string;
  title: string;
  status: "passed" | "failed" | "skipped";
  reason?: string;
  parser?: string;
  tokenMatchRatio?: number;
  measureCountMatch?: boolean;
  transposeMatch?: boolean;
}

export interface BenchmarkSummary {
  manifestPath: string;
  strict: boolean;
  totals: {
    passed: number;
    failed: number;
    skipped: number;
    executed: number;
  };
  entries: BenchmarkEntryResult[];
}

function flattenArrangementTokens(arrangement: Arrangement): Array<z.infer<typeof ExpectedTokenSchema>> {
  return arrangement.measures
    .slice()
    .sort((left, right) => left.index - right.index)
    .flatMap((measure) =>
      measure.tokens.map((token) => ({
        measure: token.measure,
        beat: token.beat,
        pitch: token.pitch,
        row: token.row,
        button: token.button,
        direction: token.direction,
        duration: token.duration
      }))
    );
}

function tokensEqual(
  left: z.infer<typeof ExpectedTokenSchema>,
  right: z.infer<typeof ExpectedTokenSchema>
): boolean {
  return (
    left.measure === right.measure &&
    left.beat === right.beat &&
    left.pitch === right.pitch &&
    left.row === right.row &&
    left.button === right.button &&
    left.direction === right.direction &&
    left.duration === right.duration
  );
}

async function resolveArtifactPath(baseDir: string, candidate: string): Promise<string> {
  if (path.isAbsolute(candidate)) {
    return candidate;
  }

  const preferred = path.resolve(baseDir, candidate);
  const workspaceRoot = process.env.INIT_CWD ?? process.cwd();
  const fallback = path.resolve(workspaceRoot, candidate);
  try {
    await fs.access(preferred);
    return preferred;
  } catch {
    return fallback;
  }
}

function compareResults(input: {
  actualArrangement: Arrangement;
  actualTransposeSuggestions: TransposeSuggestion[];
  expected: z.infer<typeof BenchmarkExpectedSchema>;
  thresholds: z.infer<typeof BenchmarkThresholdsSchema>;
}): {
  passed: boolean;
  tokenMatchRatio: number;
  measureCountMatch: boolean;
  transposeMatch: boolean;
} {
  const actualTokens = flattenArrangementTokens(input.actualArrangement);
  const expectedTokens = input.expected.arrangement.tokenSequence;
  const maxLength = Math.max(actualTokens.length, expectedTokens.length, 1);

  let matchedTokens = 0;
  for (let index = 0; index < Math.min(actualTokens.length, expectedTokens.length); index += 1) {
    const actual = actualTokens[index];
    const expected = expectedTokens[index];
    if (actual && expected && tokensEqual(actual, expected)) {
      matchedTokens += 1;
    }
  }

  const tokenMatchRatio = matchedTokens / maxLength;
  const measureCountMatch = input.actualArrangement.measures.length === input.expected.arrangement.measureCount;
  const actualSemitones = input.actualTransposeSuggestions.map((suggestion) => suggestion.semitones);
  const expectedSemitones = input.expected.transposeSuggestionSemitones ?? [];
  const transposeMatch =
    actualSemitones.length === expectedSemitones.length &&
    actualSemitones.every((value, index) => value === expectedSemitones[index]);

  const passed =
    tokenMatchRatio >= input.thresholds.tokenMatchRatioMin &&
    (!input.thresholds.requireMeasureCount || measureCountMatch) &&
    (!input.thresholds.requireTransposeSuggestions || transposeMatch);

  return {
    passed,
    tokenMatchRatio,
    measureCountMatch,
    transposeMatch
  };
}

export async function loadBenchmarkManifest(manifestPath: string): Promise<BenchmarkManifest> {
  const raw = await fs.readFile(manifestPath, "utf8");
  return BenchmarkManifestSchema.parse(JSON.parse(raw));
}

export async function runBenchmarkSuite(input: {
  manifestPath: string;
  strict: boolean;
}): Promise<{ summary: BenchmarkSummary; shouldFail: boolean }> {
  const manifestPath = path.isAbsolute(input.manifestPath)
    ? input.manifestPath
    : path.resolve(process.cwd(), input.manifestPath);
  const manifestDir = path.dirname(manifestPath);
  const manifest = await loadBenchmarkManifest(manifestPath);
  const mappingEngine = new HeuristicMappingEngine();

  const results: BenchmarkEntryResult[] = [];

  for (const entry of manifest.entries) {
    if (entry.licenseStatus !== "licensed") {
      results.push({
        id: entry.id,
        title: entry.title,
        status: "skipped",
        reason: `licenseStatus=${entry.licenseStatus}`
      });
      continue;
    }

    if (!entry.normalizedInput) {
      results.push({
        id: entry.id,
        title: entry.title,
        status: "failed",
        reason: "normalizedInput is required for licensed entries"
      });
      continue;
    }

    const sourcePdfPath = await resolveArtifactPath(manifestDir, entry.sourcePdf);
    const normalizedInputPath = await resolveArtifactPath(manifestDir, entry.normalizedInput);
    const expectedJsonPath = await resolveArtifactPath(manifestDir, entry.expectedJson);

    try {
      await fs.access(sourcePdfPath);
      const normalizedRaw = await fs.readFile(normalizedInputPath, "utf8");
      const expectedRaw = await fs.readFile(expectedJsonPath, "utf8");
      const expectedParsed = BenchmarkExpectedSchema.parse(JSON.parse(expectedRaw));
      const expected = {
        ...expectedParsed,
        transposeSuggestionSemitones: expectedParsed.transposeSuggestionSemitones ?? []
      };

      const normalized = normalizeAudiverisOutputDetailed({
        stdout: normalizedRaw,
        sourceFilePath: sourcePdfPath,
        inputSource: normalizedInputPath
      });

      const mapped = await mappingEngine.mapScoreToGriffschrift(normalized.score, entry.tuning);
      const thresholds = BenchmarkThresholdsSchema.parse(entry.thresholds ?? {});
      const compared = compareResults({
        actualArrangement: mapped.arrangement,
        actualTransposeSuggestions: mapped.transposeSuggestions,
        expected,
        thresholds
      });

      results.push({
        id: entry.id,
        title: entry.title,
        status: compared.passed ? "passed" : "failed",
        reason: compared.passed ? undefined : "metrics below threshold",
        parser: normalized.parser,
        tokenMatchRatio: Number(compared.tokenMatchRatio.toFixed(3)),
        measureCountMatch: compared.measureCountMatch,
        transposeMatch: compared.transposeMatch
      });
    } catch (error) {
      results.push({
        id: entry.id,
        title: entry.title,
        status: "failed",
        reason: error instanceof Error ? error.message : "unknown benchmark error"
      });
    }
  }

  const summary: BenchmarkSummary = {
    manifestPath,
    strict: input.strict,
    totals: {
      passed: results.filter((result) => result.status === "passed").length,
      failed: results.filter((result) => result.status === "failed").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      executed: results.filter((result) => result.status !== "skipped").length
    },
    entries: results
  };

  return {
    summary,
    shouldFail: input.strict && summary.totals.failed > 0
  };
}
