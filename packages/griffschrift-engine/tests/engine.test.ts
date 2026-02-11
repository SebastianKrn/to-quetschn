import { describe, expect, it } from "vitest";
import { HeuristicMappingEngine } from "../src/index";

describe("HeuristicMappingEngine", () => {
  it("maps playable notes into griff tokens", async () => {
    const engine = new HeuristicMappingEngine();
    const result = await engine.mapScoreToGriffschrift(
      {
        title: "Test Song",
        tempoBpm: 100,
        timeSignature: "4/4",
        notes: [
          { pitch: "G3", duration: "quarter", measure: 1, beat: 0 },
          { pitch: "B3", duration: "quarter", measure: 1, beat: 1 },
          { pitch: "D4", duration: "quarter", measure: 1, beat: 2 }
        ]
      },
      "GCFB"
    );

    expect(result.arrangement.tuning).toBe("GCFB");
    expect(result.arrangement.measures[0].tokens).toHaveLength(3);
    expect(result.transposeSuggestions).toHaveLength(0);
  });

  it("returns transpose suggestions for unplayable pitches", async () => {
    const engine = new HeuristicMappingEngine();
    const result = await engine.mapScoreToGriffschrift(
      {
        title: "Chromatic",
        tempoBpm: 90,
        timeSignature: "4/4",
        notes: [{ pitch: "C#4", duration: "quarter", measure: 1, beat: 0 }]
      },
      "GCFB"
    );

    expect(result.warnings[0]).toContain("nicht direkt spielbar");
    expect(result.transposeSuggestions.length).toBeGreaterThan(0);
    expect(result.transposeSuggestions[0].playabilityScore).toBeGreaterThanOrEqual(0);
  });
});
