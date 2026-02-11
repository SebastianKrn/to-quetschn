import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  ConversionQueuePayloadSchema,
  ExportQueuePayloadSchema,
  QueueTopics,
  type ConversionQueuePayload,
  type ExportQueuePayload
} from "@grifftab/domain-types";
import { getWebEnv } from "./env";

export interface QueueClient {
  enqueueConversion(payload: ConversionQueuePayload): Promise<{ id: string }>;
  enqueueExport(payload: ExportQueuePayload): Promise<{ id: string }>;
}

const env = getWebEnv();
const conversionQueueName = `${env.QUEUE_PREFIX}-${QueueTopics.ConversionRequested.replaceAll(".", "-")}`;
const exportQueueName = `${env.QUEUE_PREFIX}-${QueueTopics.ExportRequested.replaceAll(".", "-")}`;

class BullMqQueueClient implements QueueClient {
  private readonly connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });

  private readonly queue = new Queue(conversionQueueName, {
    connection: this.connection
  });

  private readonly exportQueue = new Queue(exportQueueName, {
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

  async enqueueExport(payload: ExportQueuePayload): Promise<{ id: string }> {
    const parsed = ExportQueuePayloadSchema.parse(payload);
    const job = await this.exportQueue.add(QueueTopics.ExportRequested, parsed, {
      attempts: 3,
      removeOnComplete: 200,
      removeOnFail: 200,
      backoff: {
        type: "exponential",
        delay: 1000
      }
    });

    return { id: String(job.id ?? parsed.exportId) };
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
