import express from "express";
import { AudiverisOmrProvider } from "@grifftab/omr-provider";
import { getOmrEnv } from "./env.js";

const env = getOmrEnv();
const app = express();

app.use(express.json({ limit: "10mb" }));

const provider = new AudiverisOmrProvider({
  binPath: env.AUDIVERIS_BIN,
  timeoutMs: env.AUDIVERIS_TIMEOUT_MS
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "omr-service",
    provider: env.OMR_PROVIDER
  });
});

app.post("/extract", async (req, res) => {
  const sourceFilePath = String(req.body?.sourceFilePath ?? "");
  if (!sourceFilePath) {
    res.status(400).json({ ok: false, error: "sourceFilePath is required" });
    return;
  }

  const score = await provider.extractScore({ sourceFilePath });
  res.json({ ok: true, score });
});

app.listen(env.OMR_PORT, () => {
  console.log(JSON.stringify({ level: env.LOG_LEVEL, message: "omr-service started", port: env.OMR_PORT }));
});
