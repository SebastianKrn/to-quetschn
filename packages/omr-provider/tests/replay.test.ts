import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ReplayOmrProvider } from "../src/index";

async function sha256(filePath: string): Promise<string> {
  const raw = await fs.readFile(filePath);
  return createHash("sha256").update(raw).digest("hex");
}

describe("ReplayOmrProvider", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await fs.rm(dir, { recursive: true, force: true });
      })
    );
    tempDirs.length = 0;
  });

  it("resolves replay fixture by pdf checksum", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "grifftab-replay-"));
    tempDirs.push(dir);

    const pdfPath = path.join(dir, "fixture.pdf");
    const normalizedPath = path.join(dir, "normalized.json");
    const manifestPath = path.join(dir, "manifest.json");

    await fs.writeFile(pdfPath, Buffer.from("fixture-pdf-content"), "utf8");
    await fs.writeFile(
      normalizedPath,
      JSON.stringify({
        title: "Replay Song",
        tempoBpm: 90,
        timeSignature: "4/4",
        notes: [{ pitch: "C4", duration: "quarter", measure: 1, beat: 0 }]
      }),
      "utf8"
    );

    const checksum = await sha256(pdfPath);
    await fs.writeFile(
      manifestPath,
      JSON.stringify({
        version: "1.0.0",
        entries: [{ checksumSha256: checksum, normalizedInput: "./normalized.json" }]
      }),
      "utf8"
    );

    const provider = new ReplayOmrProvider({
      manifestPath
    });

    const score = await provider.extractScore({
      sourceFilePath: pdfPath
    });

    expect(score.title).toBe("Replay Song");
    expect(score.notes).toHaveLength(1);
  });

  it("returns OMR_INPUT_INVALID when checksum is unknown", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "grifftab-replay-"));
    tempDirs.push(dir);

    const pdfPath = path.join(dir, "fixture.pdf");
    const manifestPath = path.join(dir, "manifest.json");

    await fs.writeFile(pdfPath, Buffer.from("fixture-pdf-content"), "utf8");
    await fs.writeFile(
      manifestPath,
      JSON.stringify({
        version: "1.0.0",
        entries: []
      }),
      "utf8"
    );

    const provider = new ReplayOmrProvider({
      manifestPath
    });

    await expect(
      provider.extractScore({
        sourceFilePath: pdfPath
      })
    ).rejects.toMatchObject({
      code: "OMR_INPUT_INVALID"
    });
  });

  it("rejects non-pdf inputs with OMR_INPUT_INVALID", async () => {
    const provider = new ReplayOmrProvider({
      manifestPath: "benchmarks/replay-manifest.json"
    });

    await expect(
      provider.extractScore({
        sourceFilePath: "fixture.txt"
      })
    ).rejects.toMatchObject({
      code: "OMR_INPUT_INVALID"
    });
  });
});
