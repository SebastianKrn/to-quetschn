import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  ConversionQueuePayloadSchema,
  QueueTopics,
  type ConversionQueuePayload
} from "@grifftab/domain-types";
import { getWebEnv } from "./env";

export interface QueueClient {
  enqueueConversion(payload: ConversionQueuePayload): Promise<{ id: string }>;
}

const env = getWebEnv();
const queueName = `${env.QUEUE_PREFIX}-${QueueTopics.ConversionRequested.replaceAll(".", "-")}`;

class BullMqQueueClient implements QueueClient {
  private readonly connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });

  private readonly queue = new Queue(queueName, {
    connection: this.connection
  });

  async enqueueConversion(payload: ConversionQueuePayload): Promise<{ id: string }> {
    const parsed = ConversionQueuePayloadSchema.parse(payload);
    const job = await this.queue.add(QueueTopics.ConversionRequested, parsed, {
      attempts: 3,
      removeOnComplete: 200,
      removeOnFail: 200,
      backoff: {
        type: "exponential",
        delay: 1000
      }
    });

    return { id: String(job.id ?? parsed.conversionId) };
  }
}

let queueClient: QueueClient | null = null;

export function getQueueClient(): QueueClient {
  if (!queueClient) {
    queueClient = new BullMqQueueClient();
  }

  return queueClient;
}

export function setQueueClientForTests(client: QueueClient | null) {
  queueClient = client;
}
