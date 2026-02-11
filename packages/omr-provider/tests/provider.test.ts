import { describe, expect, it } from "vitest";
import { AudiverisOmrProvider } from "../src/index";

describe("AudiverisOmrProvider", () => {
  it("maps missing binary to OMR_UNAVAILABLE", async () => {
    const provider = new AudiverisOmrProvider({
      binPath: "__missing_audiveris_binary__",
      timeoutMs: 100
    });

    await expect(provider.extractScore({ sourceFilePath: "demo.pdf" })).rejects.toMatchObject({
      code: "OMR_UNAVAILABLE"
    });
  });

  it("rejects non-pdf inputs with OMR_INPUT_INVALID", async () => {
    const provider = new AudiverisOmrProvider({
      binPath: "audiveris",
      timeoutMs: 100
    });

    await expect(provider.extractScore({ sourceFilePath: "demo.txt" })).rejects.toMatchObject({
      code: "OMR_INPUT_INVALID"
    });
  });
});
