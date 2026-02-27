import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getWorkerEnv } from "./env.js";

export interface WorkerStorageClient {
  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ key: string }>;
}

const env = getWorkerEnv();

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY
  }
});

const AUTO_CREATE_BUCKET = env.NODE_ENV === "development" || env.NODE_ENV === "test";

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const value = error as { name?: unknown; Code?: unknown; $metadata?: { httpStatusCode?: number } };
  if (typeof value.Code === "string") {
    return value.Code;
  }
  if (typeof value.name === "string") {
    return value.name;
  }
  if (value.$metadata?.httpStatusCode === 404) {
    return "NotFound";
  }

  return undefined;
}

function isMissingBucketError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === "NoSuchBucket" || code === "NotFound";
}

function isBucketAlreadyPresentError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === "BucketAlreadyOwnedByYou" || code === "BucketAlreadyExists";
}

export class S3WorkerStorageClient implements WorkerStorageClient {
  private bucketReady = !AUTO_CREATE_BUCKET;
  private ensureBucketPromise: Promise<void> | null = null;

  private async ensureBucketExists(force = false): Promise<void> {
    if (!AUTO_CREATE_BUCKET) {
      return;
    }

    if (!force && this.bucketReady) {
      return;
    }

    if (!force && this.ensureBucketPromise) {
      await this.ensureBucketPromise;
      return;
    }

    const ensurePromise = (async () => {
      try {
        await s3.send(
          new HeadBucketCommand({
            Bucket: env.S3_BUCKET
          })
        );
        this.bucketReady = true;
        return;
      } catch (error) {
        if (!isMissingBucketError(error)) {
          throw error;
        }
      }

      try {
        await s3.send(
          new CreateBucketCommand({
            Bucket: env.S3_BUCKET
          })
        );
      } catch (error) {
        if (!isBucketAlreadyPresentError(error)) {
          throw error;
        }
      }

      this.bucketReady = true;
    })();

    this.ensureBucketPromise = ensurePromise;
    try {
      await ensurePromise;
    } finally {
      if (this.ensureBucketPromise === ensurePromise) {
        this.ensureBucketPromise = null;
      }
    }
  }

  private async putObjectOnce(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType
      })
    );
  }

  async putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ key: string }> {
    await this.ensureBucketExists();
    try {
      await this.putObjectOnce(input);
    } catch (error) {
      if (!AUTO_CREATE_BUCKET || !isMissingBucketError(error)) {
        throw error;
      }

      this.bucketReady = false;
      await this.ensureBucketExists(true);
      await this.putObjectOnce(input);
    }

    return { key: input.key };
  }
}
