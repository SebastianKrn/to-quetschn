import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "./route";
import { setDomainStoreForTests } from "@/lib/convex";
import { setQueueClientForTests } from "@/lib/queue";
import { setStorageClientForTests } from "@/lib/storage";

describe("/api/arrangements/:id/export", () => {
  beforeEach(() => {
    setDomainStoreForTests({
      async createConversion() {
        throw new Error("not used");
      },
      async getConversion() {
        return null;
      },
      async updateConversion() {
        return null;
      },
      async confirmTranspose() {
        return null;
      },
      async getConversionSource() {
        return null;
      },
      async upsertArrangement(arrangement) {
        return arrangement;
      },
      async getArrangement(id) {
        return {
          id,
          title: "Polka",
          tuning: "GCFB",
          tempoBpm: 88,
          measures: [],
          metadata: {}
        };
      },
      async requestLatestExport(input) {
        return {
          job: {
            id: "export-1",
            arrangementId: input.arrangementId,
            status: "queued",
            format: "pdf",
            artifactKey: null,
            errorCode: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          shouldEnqueue: true
        };
      },
      async getLatestExportByArrangement(arrangementId) {
        return {
          id: "export-1",
          arrangementId,
          status: "completed",
          format: "pdf",
          artifactKey: "exports/arrangement-1/export-1.pdf",
          errorCode: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    });

    setQueueClientForTests({
      async enqueueConversion() {
        return { id: "unused" };
      },
      async enqueueExport() {
        return { id: "queue-export-1" };
      }
    });

    setStorageClientForTests({
      async putObject(input) {
        return { key: input.key };
      },
      async getSignedUrl() {
        return { url: "https://signed.example/export.pdf" };
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

  it("rejects unauthenticated export requests", async () => {
    const request = new Request("http://localhost/api/arrangements/a1/export", {
      method: "POST"
    });

    const response = await POST(request, {
      params: { id: "a1" }
    });

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated export status reads", async () => {
    const request = new Request("http://localhost/api/arrangements/a1/export", {
      method: "GET"
    });

    const response = await GET(request, {
      params: { id: "a1" }
    });

    expect(response.status).toBe(401);
  });

  it("enqueues export jobs for authenticated users", async () => {
    const request = new Request("http://localhost/api/arrangements/a1/export", {
      method: "POST",
      headers: {
        "x-dev-user-id": "dev-user"
      }
    });

    const response = await POST(request, {
      params: { id: "a1" }
    });
    const body = (await response.json()) as {
      ok: boolean;
      enqueued: boolean;
      queueJobId: string | null;
      export: {
        status: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.enqueued).toBe(true);
    expect(body.queueJobId).toBe("queue-export-1");
    expect(body.export.status).toBe("queued");
  });

  it("returns signed download urls for completed exports", async () => {
    const request = new Request("http://localhost/api/arrangements/a1/export", {
      method: "GET",
      headers: {
        "x-dev-user-id": "dev-user"
      }
    });

    const response = await GET(request, {
      params: { id: "a1" }
    });
    const body = (await response.json()) as {
      ok: boolean;
      download?: { url: string };
      export: { status: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.export.status).toBe("completed");
    expect(body.download?.url).toBe("https://signed.example/export.pdf");
  });

  it("returns non-completed export status without download payload", async () => {
    setDomainStoreForTests({
      async createConversion() {
        throw new Error("not used");
      },
      async getConversion() {
        return null;
      },
      async updateConversion() {
        return null;
      },
      async confirmTranspose() {
        return null;
      },
      async getConversionSource() {
        return null;
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
      async getLatestExportByArrangement(arrangementId) {
        return {
          id: "export-2",
          arrangementId,
          status: "processing",
          format: "pdf",
          artifactKey: null,
          errorCode: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    });

    const request = new Request("http://localhost/api/arrangements/a1/export", {
      method: "GET",
      headers: {
        "x-dev-user-id": "dev-user"
      }
    });

    const response = await GET(request, {
      params: { id: "a1" }
    });
    const body = (await response.json()) as {
      ok: boolean;
      download?: unknown;
      export: { status: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.export.status).toBe("processing");
    expect(body.download).toBeUndefined();
  });
});
