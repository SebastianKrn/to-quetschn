import { describe, expect, it } from "vitest";
import { GriffschriftSvgRenderer } from "../src/index";

describe("GriffschriftSvgRenderer", () => {
  it("renders an svg shell", () => {
    const renderer = new GriffschriftSvgRenderer();
    const svg = renderer.renderArrangement(
      {
        id: "a1",
        title: "Demo",
        tuning: "GCFB",
        tempoBpm: 90,
        measures: [],
        metadata: {}
      },
      { width: 800, height: 600 }
    );

    expect(svg).toContain("<svg");
    expect(svg).toContain("Demo");
  });
});
