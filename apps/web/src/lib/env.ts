import { z } from "zod";

const webEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  FEATURE_PUBLIC_SHARING: z.enum(["true", "false"]).default("false"),
  FEATURE_TRANSPOSE_SUGGESTIONS: z.enum(["true", "false"]).default("true"),
  OMR_SERVICE_URL: z.string().url().default("http://localhost:4100"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(8).default("dev-secret-placeholder"),
  CONVEX_URL: z.string().url().default("http://127.0.0.1:3210"),
  SENTRY_DSN: z.string().optional()
});

export type WebEnv = z.infer<typeof webEnvSchema>;

let cachedEnv: WebEnv | null = null;

export function getWebEnv(): WebEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = webEnvSchema.parse(process.env);
  return cachedEnv;
}
