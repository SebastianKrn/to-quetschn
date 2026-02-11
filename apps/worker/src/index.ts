import { Redis } from "ioredis";
import { QueueEvents, Worker } from "bullmq";
import { QueueTopics } from "@grifftab/domain-types";
import { getWorkerEnv } from "./env.js";

async function main() {
  const env = getWorkerEnv();
  const connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });

  const queueName = `${env.QUEUE_PREFIX}:${QueueTopics.ConversionRequested}`;

  const worker = new Worker(
    queueName,
    async (job) => {
      // Foundation stub only: real conversion orchestration to be implemented.
      console.log(JSON.stringify({ level: env.LOG_LEVEL, event: "job.received", id: job.id, name: job.name }));
      return { ok: true, processedAt: new Date().toISOString() };
    },
    {
      connection,
      concurrency: env.WORKER_CONCURRENCY
    }
  );

  const events = new QueueEvents(queueName, { connection });
  await events.waitUntilReady();

  worker.on("completed", (job) => {
    console.log(JSON.stringify({ level: env.LOG_LEVEL, event: QueueTopics.ConversionCompleted, id: job.id }));
  });

  worker.on("failed", (job, error) => {
    console.error(JSON.stringify({ level: "error", event: QueueTopics.ConversionFailed, id: job?.id, error: error.message }));
  });

  console.log(JSON.stringify({ level: env.LOG_LEVEL, message: "worker started", queueName }));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ level: "error", message: "worker crashed", error }));
  process.exitCode = 1;
});
