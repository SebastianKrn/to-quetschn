import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

export class S3WorkerStorageClient implements WorkerStorageClient {
  async putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ key: string }> {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType
      })
    );

    return { key: input.key };
  }
}
