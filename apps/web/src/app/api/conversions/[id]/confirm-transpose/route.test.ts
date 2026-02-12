import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";
import { setDomainStoreForTests } from "@/lib/convex";
import { setQueueClientForTests } from "@/lib/queue";

describe("POST /api/conversions/:id/confirm-transpose", () => {
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
      async getLatestExportByArrangement() {
        return null;
      },
      async listExportsByArrangement() {
        return [];
      },
      async confirmTranspose(input) {
        return {
          job: {
            id: input.id,
            status: "queued",
            inputFileId: "file-123",
            tuning: "GCFB",
            progress: 0,
            errorCode: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          transposeSuggestions: [],
          confirmedTranspose: {
            semitones: input.semitones,
            targetKey: input.targetKey
          }
        };
      }
    });

    setQueueClientForTests({
      async enqueueConversion() {
        return { id: "queue-2" };
      },
      async enqueueExport() {
        return { id: "queue-export-unused" };
      }
    });
  });

  afterEach(() => {
    setDomainStoreForTests(null);
    setQueueClientForTests(null);
  });

  it("updates transpose and requeues conversion", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-user-id": "dev-user"
      },
      body: JSON.stringify({ semitones: 2, targetKey: "D" })
    });

    const response = await POST(request, { params: { id: "conversion-1" } });
    const body = (await response.json()) as {
      ok: boolean;
      conversionId: string;
      confirmedTranspose: { semitones: number };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.conversionId).toBe("conversion-1");
    expect(body.confirmedTranspose.semitones).toBe(2);
  });
});
