import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { OmrErrorSchema, OmrScoreSchema } from "@grifftab/domain-types";
import { AudiverisOmrProvider, OmrProviderError } from "@grifftab/omr-provider";
import { getOmrEnv } from "./env.js";

const env = getOmrEnv();
const app = express();

app.use(express.json({ limit: "10mb" }));

const provider = new AudiverisOmrProvider({
  binPath: env.AUDIVERIS_BIN,
  timeoutMs: env.AUDIVERIS_TIMEOUT_MS
});

async function materializePdfSource(source: string): Promise<{
  sourceFilePath: string;
  cleanup: () => Promise<void>;
}> {
  if (!/^https?:\/\//i.test(source)) {
    return {
      sourceFilePath: source,
      cleanup: async () => undefined
    };
  }

  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Unable to download source PDF (${response.status})`);
  }

  const tempPath = path.join(os.tmpdir(), `grifftab-${randomUUID()}.pdf`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(tempPath, buffer);

  return {
    sourceFilePath: tempPath,
    cleanup: async () => {
      await fs.unlink(tempPath).catch(() => undefined);
    }
  };
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "omr-service",
    provider: env.OMR_PROVIDER,
    timeoutMs: env.AUDIVERIS_TIMEOUT_MS
  });
});

app.post("/extract", async (req, res) => {
  const sourceFilePath = String(req.body?.sourceFilePath ?? "");
  const correlationId = String(req.body?.correlationId ?? "");

  if (!sourceFilePath) {
    const error = OmrErrorSchema.parse({
      code: "OMR_INPUT_INVALID",
      message: "sourceFilePath is required",
      retryable: false
    });

    res.status(400).json({ ok: false, error });
    return;
  }

  let materialized:
    | {
        sourceFilePath: string;
        cleanup: () => Promise<void>;
      }
    | undefined;
  try {
    materialized = await materializePdfSource(sourceFilePath);
    const score = await provider.extractScore({
      sourceFilePath: materialized.sourceFilePath,
      correlationId
    });
    res.json({ ok: true, score: OmrScoreSchema.parse(score) });
  } catch (error) {
    if (error instanceof OmrProviderError) {
      const statusByCode = {
        OMR_INPUT_INVALID: 400,
        OMR_PARSE_FAILED: 422,
        OMR_TIMEOUT: 504,
        OMR_UNAVAILABLE: 503
      } as const;

      res.status(statusByCode[error.code]).json({
        ok: false,
        error: OmrErrorSchema.parse({
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          details: error.details
        })
      });
      return;
    }

    res.status(500).json({
      ok: false,
      error: {
        code: "OMR_UNAVAILABLE",
        message: "Unexpected OMR failure",
        retryable: true
      }
    });
  } finally {
    await materialized?.cleanup();
  }
});

app.listen(env.OMR_PORT, () => {
  console.log(
    JSON.stringify({
      level: env.LOG_LEVEL,
      message: "omr-service started",
      port: env.OMR_PORT
    })
  );
});
