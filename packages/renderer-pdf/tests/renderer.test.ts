import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { PdfArrangementRenderer } from "../src/index";

describe("PdfArrangementRenderer", () => {
  it("renders a valid PDF buffer with arrangement metadata", async () => {
    const renderer = new PdfArrangementRenderer();
    const buffer = await renderer.render({
      id: "arr-1",
      title: "Berg Polka",
      tuning: "GCFB",
      tempoBpm: 96,
      measures: [
        {
          index: 1,
          tokens: [
            {
              id: "t-1",
              pitch: "G3",
              row: 1,
              button: 3,
              direction: "push",
              measure: 1,
              beat: 0,
              duration: "quarter"
            }
          ]
        }
      ],
      metadata: {}
    });

    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");

    const parsed = await PDFDocument.load(buffer);
    expect(parsed.getPageCount()).toBe(1);
    expect(parsed.getTitle()).toContain("Berg Polka");
  });
});
