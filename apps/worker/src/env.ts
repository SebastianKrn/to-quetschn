import { z } from "zod";

const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  QUEUE_PREFIX: z.string().default("grifftab"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  OMR_SERVICE_URL: z.string().url().default("http://localhost:4100"),
  CONVEX_URL: z.string().url().default("http://127.0.0.1:3210"),
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1).default("grifftab-files"),
  S3_ACCESS_KEY_ID: z.string().min(1).default("minioadmin"),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default("minioadmin"),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true"),
  LOG_LEVEL: z.string().default("info")
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function getWorkerEnv(): WorkerEnv {
  return workerEnvSchema.parse(process.env);
}
