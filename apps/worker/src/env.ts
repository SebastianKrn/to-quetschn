import { z } from "zod";

const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  QUEUE_PREFIX: z.string().default("grifftab"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  OMR_SERVICE_URL: z.string().url().default("http://localhost:4100"),
  CONVEX_URL: z.string().url().default("http://127.0.0.1:3210"),
  CONVEX_DEPLOYMENT: z.string().optional(),
  CONVEX_ADMIN_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1).default("grifftab-files"),
  S3_ACCESS_KEY_ID: z.string().min(1).default("minioadmin"),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default("minioadmin"),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true"),
  LOG_LEVEL: z.string().default("info")
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["replace", "placeholder", "changeme", "dev-secret"].some((token) =>
    normalized.includes(token)
  );
}

function assertSecureRuntimeConfig(env: WorkerEnv): void {
  const secureRuntime =
    env.NODE_ENV === "staging" ||
    env.CONVEX_DEPLOYMENT === "staging" ||
    env.CONVEX_DEPLOYMENT === "production";
  if (!secureRuntime) {
    return;
  }

  if (!env.CONVEX_ADMIN_KEY || isPlaceholder(env.CONVEX_ADMIN_KEY)) {
    throw new Error("CONVEX_ADMIN_KEY is required and must be non-placeholder in staging/production");
  }
}

export function getWorkerEnv(): WorkerEnv {
  const parsed = workerEnvSchema.parse(process.env);
  assertSecureRuntimeConfig(parsed);
  return parsed;
}
