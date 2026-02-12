import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runBenchmarkSuite } from "../src/index.js";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "grifftab-bench-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("benchmark harness", () => {
  it("skips non-licensed entries", async () => {
    await withTempDir(async (dir) => {
      const manifestPath = path.join(dir, "manifest.json");
      await fs.writeFile(
        manifestPath,
        JSON.stringify(
          {
            version: "0.1.0",
            description: "test",
            entries: [
              {
                id: "pending-1",
                title: "Pending Case",
                sourcePdf: "pdfs/missing.pdf",
                expectedJson: "expected/missing.json",
                tuning: "GCFB",
                licenseStatus: "pending"
              }
            ]
          },
          null,
          2
        ),
        "utf8"
      );

      const result = await runBenchmarkSuite({
        manifestPath,
        strict: true
      });

      expect(result.summary.totals.skipped).toBe(1);
      expect(result.summary.entries[0]?.status).toBe("skipped");
      expect(result.shouldFail).toBe(false);
    });
  });

  it("runs licensed entries and compares deterministic metrics", async () => {
    await withTempDir(async (dir) => {
      await fs.mkdir(path.join(dir, "pdfs"), { recursive: true });
      await fs.mkdir(path.join(dir, "normalized"), { recursive: true });
      await fs.mkdir(path.join(dir, "expected"), { recursive: true });

      await fs.writeFile(path.join(dir, "pdfs", "sample.pdf"), "%PDF-1.4\n%benchmark\n", "utf8");

      await fs.writeFile(
        path.join(dir, "normalized", "sample.json"),
        JSON.stringify(
          {
            title: "Benchmark Sample",
            tempoBpm: 100,
            timeSignature: "4/4",
            notes: [
              { measure: 1, beat: 0, pitch: "C4", duration: "quarter" },
              { measure: 1, beat: 1, pitch: "D4", duration: "quarter" }
            ]
          },
          null,
          2
        ),
        "utf8"
      );

      await fs.writeFile(
        path.join(dir, "expected", "sample.json"),
        JSON.stringify(
          {
            arrangement: {
              title: "Benchmark Sample",
              tuning: "GCFB",
              measureCount: 1,
              tokenSequence: [
                {
                  measure: 1,
                  beat: 0,
                  pitch: "C4",
                  row: 2,
                  button: 1,
                  direction: "push",
                  duration: "quarter"
                },
                {
                  measure: 1,
                  beat: 1,
                  pitch: "D4",
                  row: 1,
                  button: 3,
                  direction: "push",
                  duration: "quarter"
                }
              ]
            },
            transposeSuggestionSemitones: []
          },
          null,
          2
        ),
        "utf8"
      );

      const manifestPath = path.join(dir, "manifest.json");
      await fs.writeFile(
        manifestPath,
        JSON.stringify(
          {
            version: "0.1.0",
            description: "test",
            entries: [
              {
                id: "licensed-1",
                title: "Licensed Case",
                sourcePdf: "pdfs/sample.pdf",
                normalizedInput: "normalized/sample.json",
                expectedJson: "expected/sample.json",
                tuning: "GCFB",
                licenseStatus: "licensed"
              }
            ]
          },
          null,
          2
        ),
        "utf8"
      );

      const result = await runBenchmarkSuite({
        manifestPath,
        strict: true
      });

      expect(result.summary.totals.passed).toBe(1);
      expect(result.summary.entries[0]?.status).toBe("passed");
      expect(result.summary.entries[0]?.tokenMatchRatio).toBe(1);
      expect(result.shouldFail).toBe(false);
    });
  });
});
