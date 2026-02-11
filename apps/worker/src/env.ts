import { z } from "zod";

const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  QUEUE_PREFIX: z.string().default("grifftab"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  OMR_SERVICE_URL: z.string().url().default("http://localhost:4100"),
  CONVEX_URL: z.string().url().default("http://127.0.0.1:3210"),
  LOG_LEVEL: z.string().default("info")
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function getWorkerEnv(): WorkerEnv {
  return workerEnvSchema.parse(process.env);
}
