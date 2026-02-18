import { z } from "zod";

const omrEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  OMR_PORT: z.coerce.number().int().positive().default(4100),
  OMR_PROVIDER: z.string().default("audiveris"),
  OMR_MODE: z.enum(["audiveris", "replay"]).default("audiveris"),
  OMR_REPLAY_MANIFEST_PATH: z.string().default("benchmarks/replay-manifest.json"),
  AUDIVERIS_BIN: z.string().default("audiveris"),
  AUDIVERIS_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  LOG_LEVEL: z.string().default("info")
});

export type OmrEnv = z.infer<typeof omrEnvSchema>;

export function getOmrEnv(): OmrEnv {
  return omrEnvSchema.parse(process.env);
}
