import { Redis } from "ioredis";
import { QueueEvents, Worker } from "bullmq";
import { ConversionQueuePayloadSchema, QueueTopics } from "@grifftab/domain-types";
import { HeuristicMappingEngine } from "@grifftab/griffschrift-engine";
import { getWorkerEnv } from "./env.js";
import { OmrServiceHttpClient } from "./omr-client.js";
import { ConvexDomainClient } from "./convex-client.js";
import { getErrorCode, isRetryableOmrError, runConversionPipeline } from "./pipeline.js";

async function main() {
  const env = getWorkerEnv();
  const connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });

  const queueName = `${env.QUEUE_PREFIX}-${QueueTopics.ConversionRequested.replaceAll(".", "-")}`;
  const mappingEngine = new HeuristicMappingEngine();
  const omrClient = new OmrServiceHttpClient(env.OMR_SERVICE_URL);
  const domainClient = new ConvexDomainClient(env.CONVEX_URL);

  const worker = new Worker(
    queueName,
    async (job) => {
      const parsed = ConversionQueuePayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        throw new Error(`Invalid conversion payload: ${parsed.error.message}`);
      }

      try {
        const result = await runConversionPipeline({
          payload: parsed.data,
          mappingEngine,
          domainClient,
          omrClient
        });

        console.log(
          JSON.stringify({
            level: env.LOG_LEVEL,
            event: "conversion.pipeline.completed",
            conversionId: parsed.data.conversionId,
            status: result.status,
            attempt: job.attemptsMade + 1
          })
        );

        return result;
      } catch (error) {
        const errorCode = getErrorCode(error);
        const retryable = isRetryableOmrError(error);
        const totalAttempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
        const remainingAttempts = totalAttempts - (job.attemptsMade + 1);

        if (retryable && remainingAttempts > 0) {
          await domainClient.updateConversion({
            id: parsed.data.conversionId,
            status: "queued",
            progress: 0,
            errorCode
          });

          throw error;
        }

        await domainClient.updateConversion({
          id: parsed.data.conversionId,
          status: "failed",
          progress: 100,
          errorCode
        });

        throw error;
      }
    },
    {
      connection,
      concurrency: env.WORKER_CONCURRENCY
    }
  );

  const events = new QueueEvents(queueName, { connection });
  await events.waitUntilReady();

  worker.on("completed", (job) => {
    console.log(
      JSON.stringify({
        level: env.LOG_LEVEL,
        event: QueueTopics.ConversionCompleted,
        id: job.id
      })
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      JSON.stringify({
        level: "error",
        event: QueueTopics.ConversionFailed,
        id: job?.id,
        error: error.message
      })
    );
  });

  console.log(JSON.stringify({ level: env.LOG_LEVEL, message: "worker started", queueName }));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ level: "error", message: "worker crashed", error }));
  process.exitCode = 1;
});
