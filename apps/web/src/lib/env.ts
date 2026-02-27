import { z } from "zod";

const webEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  FEATURE_PUBLIC_SHARING: z.enum(["true", "false"]).default("false"),
  FEATURE_TRANSPOSE_SUGGESTIONS: z.enum(["true", "false"]).default("true"),
  PILOT_MODE: z.enum(["true", "false"]).default("false"),
  ENFORCE_UPLOAD_RIGHTS_CONFIRMATION: z.enum(["true", "false"]).default("false"),
  OMR_SERVICE_URL: z.string().url().default("http://localhost:4100"),

  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(8).default("9h6W2mQ3rT8yL1pV7cN4xD5kF0sJ2aBz"),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().min(1).default("postgresql://grifftab:grifftab@localhost:5432/grifftab"),

  CONVEX_URL: z.string().url().default("http://127.0.0.1:3210"),
  CONVEX_DEPLOYMENT: z.string().optional(),
  CONVEX_ADMIN_KEY: z.string().optional(),

  REDIS_URL: z.string().default("redis://localhost:6379"),
  QUEUE_PREFIX: z.string().default("grifftab"),

  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1).default("grifftab-files"),
  S3_ACCESS_KEY_ID: z.string().min(1).default("minioadmin"),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default("minioadmin"),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true"),

  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.string().default("info")
});

export type WebEnv = z.infer<typeof webEnvSchema>;

let cachedEnv: WebEnv | null = null;

function isPlaceholderSecret(secret: string): boolean {
  const normalized = secret.trim().toLowerCase();
  return [
    "replace",
    "replace-me",
    "replace-prod",
    "replace-staging",
    "placeholder",
    "dev-secret",
    "dev-secret-placeholder",
    "changeme"
  ].some((token) => normalized.includes(token));
}

function isSecureRuntime(env: WebEnv): boolean {
  return (
    env.NODE_ENV === "staging" ||
    env.CONVEX_DEPLOYMENT === "staging" ||
    env.CONVEX_DEPLOYMENT === "production"
  );
}

function assertSecureRuntimeConfig(env: WebEnv): void {
  if (!isSecureRuntime(env)) {
    return;
  }

  if (env.BETTER_AUTH_SECRET.length < 32 || isPlaceholderSecret(env.BETTER_AUTH_SECRET)) {
    throw new Error("BETTER_AUTH_SECRET must be strong (>=32 chars, non-placeholder) in staging/production");
  }

  if (!env.CONVEX_ADMIN_KEY || isPlaceholderSecret(env.CONVEX_ADMIN_KEY)) {
    throw new Error("CONVEX_ADMIN_KEY is required and must be non-placeholder in staging/production");
  }
}

export function getWebEnv(): WebEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = webEnvSchema.parse(process.env);
  assertSecureRuntimeConfig(cachedEnv);
  return cachedEnv;
}

export function resetWebEnvForTests(): void {
  cachedEnv = null;
}
