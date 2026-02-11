import { describe, expect, it } from "vitest";
import { HeuristicMappingEngine } from "../src/index";

describe("HeuristicMappingEngine", () => {
  it("returns deterministic stub response", async () => {
    const engine = new HeuristicMappingEngine();
    const result = await engine.mapScoreToGriffschrift(
      {
        title: "Test Song",
        tempoBpm: 100,
        timeSignature: "4/4",
        notes: []
      },
      "GCFB"
    );

    expect(result.arrangement.tuning).toBe("GCFB");
    expect(result.warnings[0]).toContain("stub");
  });
});
