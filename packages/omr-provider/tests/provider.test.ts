import { describe, expect, it } from "vitest";
import { AudiverisOmrProvider } from "../src/index";

describe("AudiverisOmrProvider", () => {
  it("returns a score structure even when audiveris is unavailable", async () => {
    const provider = new AudiverisOmrProvider({
      binPath: "__missing_audiveris_binary__",
      timeoutMs: 100
    });

    const result = await provider.extractScore({ sourceFilePath: "demo.pdf" });
    expect(result.notes).toEqual([]);
    expect(result.timeSignature).toBe("4/4");
  });
});
