import { describe, expect, it, vi } from "vitest";
import type { MappingEngine, OmrScore } from "@grifftab/domain-types";
import { runConversionPipeline } from "../src/pipeline";

describe("runConversionPipeline", () => {
  it("persists completed conversions", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const upserts: Array<Record<string, unknown>> = [];

    const domainClient = {
      updateConversion: vi.fn(async (input) => {
        updates.push(input as Record<string, unknown>);
      }),
      upsertArrangement: vi.fn(async (arrangement) => {
        upserts.push(arrangement as Record<string, unknown>);
      })
    };

    const mappingEngine: MappingEngine = {
      mapScoreToGriffschrift: vi.fn(async () => ({
        arrangement: {
          id: "arr-1",
          title: "Song",
          tuning: "GCFB",
          tempoBpm: 80,
          measures: [],
          metadata: {}
        },
        warnings: [],
        transposeSuggestions: []
      }))
    };

    const omrClient = {
      extractScore: vi.fn(async (): Promise<OmrScore> => ({
        title: "Song",
        tempoBpm: 80,
        timeSignature: "4/4",
        notes: []
      }))
    };

    const result = await runConversionPipeline({
      payload: {
        conversionId: "c1",
        sourceFileId: "file-1",
        tuning: "GCFB",
        correlationId: "corr-1"
      },
      mappingEngine,
      domainClient,
      omrClient
    });

    expect(result.status).toBe("completed");
    expect(domainClient.updateConversion).toHaveBeenCalled();
    expect(domainClient.upsertArrangement).toHaveBeenCalledTimes(1);
    expect(updates.at(-1)?.status).toBe("completed");
  });

  it("moves conversion to transpose confirmation when unplayable", async () => {
    const domainClient = {
      updateConversion: vi.fn(async () => undefined),
      upsertArrangement: vi.fn(async () => undefined)
    };

    const mappingEngine: MappingEngine = {
      mapScoreToGriffschrift: vi.fn(async () => ({
        arrangement: {
          id: "arr-1",
          title: "Song",
          tuning: "GCFB",
          tempoBpm: 80,
          measures: [],
          metadata: {}
        },
        warnings: ["unplayable"],
        transposeSuggestions: [
          {
            semitones: 2,
            targetKey: "D4",
            playabilityScore: 0.8,
            estimatedBellowsChanges: 3,
            reason: "better"
          }
        ]
      }))
    };

    const omrClient = {
      extractScore: vi.fn(async (): Promise<OmrScore> => ({
        title: "Song",
        tempoBpm: 80,
        timeSignature: "4/4",
        notes: [{ pitch: "C#4", duration: "quarter", measure: 1, beat: 0 }]
      }))
    };

    const result = await runConversionPipeline({
      payload: {
        conversionId: "c2",
        sourceFileId: "file-2",
        tuning: "GCFB",
        correlationId: "corr-2"
      },
      mappingEngine,
      domainClient,
      omrClient
    });

    expect(result.status).toBe("needs_transpose_confirmation");
    expect(domainClient.upsertArrangement).not.toHaveBeenCalled();
  });
});
