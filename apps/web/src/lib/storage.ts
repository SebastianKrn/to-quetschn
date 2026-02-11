import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageClient } from "@grifftab/domain-types";
import { getWebEnv } from "./env";

const env = getWebEnv();

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY
  }
});

class S3StorageClient implements StorageClient {
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

  async getSignedUrl(input: {
    key: string;
    expiresInSeconds: number;
  }): Promise<{ url: string }> {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: input.key
      }),
      { expiresIn: input.expiresInSeconds }
    );

    return { url };
  }

  async deleteObject(input: { key: string }): Promise<void> {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: input.key
      })
    );
  }
}

let storageClient: StorageClient = new S3StorageClient();

export function getStorageClient(): StorageClient {
  return storageClient;
}

export function setStorageClientForTests(client: StorageClient | null) {
  storageClient = client ?? new S3StorageClient();
}

export function createConversionObjectKey(input: { conversionId: string; extension?: string }): string {
  const extension = input.extension ?? "pdf";
  return `conversions/${input.conversionId}/${randomUUID()}.${extension}`;
}
