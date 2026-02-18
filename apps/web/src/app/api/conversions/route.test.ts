import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { ConversionJobSchema } from "@grifftab/domain-types";
import { POST } from "./route";
import {
  setDomainStoreForTests,
  type ConversionRuntime,
  type DomainStore
} from "@/lib/convex";
import { setQueueClientForTests } from "@/lib/queue";
import { setStorageClientForTests } from "@/lib/storage";

function createStore(): DomainStore {
  const conversions = new Map<string, ConversionRuntime>();

  return {
    async createConversion(input) {
      const now = new Date().toISOString();
      const job = ConversionJobSchema.parse({
        id: input.id,
        status: "queued",
        inputFileId: input.inputFileId,
        tuning: input.tuning,
        progress: 0,
        errorCode: null,
        createdAt: now,
        updatedAt: now
      });
      conversions.set(input.id, {
        job,
        transposeSuggestions: [],
        confirmedTranspose: null
      });
      return job;
    },
    async getConversion(id) {
      return conversions.get(id) ?? null;
    },
    async updateConversion(input) {
      const existing = conversions.get(input.id);
      if (!existing) return null;
      const updated = {
        ...existing,
        job: ConversionJobSchema.parse({
          ...existing.job,
          status: input.status,
          progress: input.progress ?? existing.job.progress,
          errorCode: input.errorCode ?? existing.job.errorCode,
          updatedAt: new Date().toISOString()
        }),
        transposeSuggestions: input.transposeSuggestions ?? existing.transposeSuggestions
      };
      conversions.set(input.id, updated);
      return updated;
    },
    async confirmTranspose(input) {
      const existing = conversions.get(input.id);
      if (!existing) return null;
      const updated = {
        ...existing,
        job: ConversionJobSchema.parse({
          ...existing.job,
          status: "queued",
          progress: 0,
          errorCode: null,
          updatedAt: new Date().toISOString()
        }),
        confirmedTranspose: {
          semitones: input.semitones,
          targetKey: input.targetKey
        }
      };
      conversions.set(input.id, updated);
      return updated;
    },
    async getConversionSource(id) {
      const existing = conversions.get(id);
      if (!existing) return null;
      return {
        inputFileId: existing.job.inputFileId,
        tuning: existing.job.tuning
      };
    },
    async upsertArrangement(arrangement) {
      return arrangement;
    },
    async getArrangement() {
      return null;
    },
    async requestLatestExport() {
      throw new Error("not used");
    },
    async getLatestExportByArrangement() {
      return null;
    },
    async listExportsByArrangement() {
      return [];
    }
  };
}

describe("POST /api/conversions", () => {
  beforeEach(() => {
    setDomainStoreForTests(createStore());
    setQueueClientForTests({
      async enqueueConversion() {
        return { id: "queue-1" };
      },
      async enqueueExport() {
        return { id: "queue-export-unused" };
      }
    });
    setStorageClientForTests({
      async putObject(input) {
        return { key: input.key };
      },
      async getSignedUrl() {
        return { url: "https://signed.example/source.pdf" };
      },
      async deleteObject() {
        return undefined;
      }
    });
  });

  afterEach(() => {
    setDomainStoreForTests(null);
    setQueueClientForTests(null);
    setStorageClientForTests(null);
  });

  it("rejects unauthenticated requests", async () => {
    const request = new Request("http://localhost/api/conversions", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ inputFileId: "file-1", tuning: "GCFB" })
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("accepts json requests with inputFileId", async () => {
    const request = new Request("http://localhost/api/conversions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-user-id": "dev-user"
      },
      body: JSON.stringify({ inputFileId: "file-1", tuning: "GCFB" })
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      ok: boolean;
      job: { inputFileId: string; status: string };
      queueJobId: string;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.job.inputFileId).toBe("file-1");
    expect(body.job.status).toBe("queued");
    expect(body.queueJobId).toBe("queue-1");
  });

  it("accepts multipart requests with uploaded pdf", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([Buffer.from("%PDF-1.7\n%fixture\n")], "fixture.pdf", {
        type: "application/pdf"
      })
    );
    formData.set("tuning", "ADGC");

    const request = new Request("http://localhost/api/conversions", {
      method: "POST",
      headers: {
        "x-dev-user-id": "dev-user"
      },
      body: formData
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      ok: boolean;
      job: { inputFileId: string; tuning: string; status: string };
      queueJobId: string;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.job.inputFileId.startsWith("conversions/")).toBe(true);
    expect(body.job.tuning).toBe("ADGC");
    expect(body.job.status).toBe("queued");
    expect(body.queueJobId).toBe("queue-1");
  });
});
