import { describe, expect, it } from "vitest";
import { GriffschriftSvgRenderer } from "../src/index";

describe("GriffschriftSvgRenderer", () => {
  it("renders arrangement layout with direction symbols", () => {
    const renderer = new GriffschriftSvgRenderer();
    const svg = renderer.renderArrangement(
      {
        id: "a1",
        title: "Demo <Song>",
        tuning: "GCFB",
        tempoBpm: 90,
        measures: [
          {
            index: 1,
            tokens: [
              {
                id: "t1",
                pitch: "G3",
                row: 1,
                button: 1,
                direction: "push",
                measure: 1,
                beat: 0,
                duration: "quarter"
              },
              {
                id: "t2",
                pitch: "A3",
                row: 1,
                button: 1,
                direction: "pull",
                measure: 1,
                beat: 1,
                duration: "quarter"
              }
            ]
          }
        ],
        metadata: {}
      },
      { width: 800, height: 600 }
    );

    expect(svg).toContain("<svg");
    expect(svg).toContain("○");
    expect(svg).toContain("●");
    expect(svg).toContain("Demo &lt;Song&gt;");
  });
});
