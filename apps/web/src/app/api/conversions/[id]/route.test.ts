import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";
import { setDomainStoreForTests } from "@/lib/convex";

describe("GET /api/conversions/:id", () => {
  beforeEach(() => {
    setDomainStoreForTests({
      async createConversion() {
        throw new Error("not used");
      },
      async getConversion(id) {
        if (id === "missing") {
          return null;
        }

        return {
          job: {
            id,
            status: "needs_transpose_confirmation",
            inputFileId: "file-1",
            tuning: "GCFB",
            progress: 100,
            errorCode: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          transposeSuggestions: [
            {
              semitones: 2,
              targetKey: "D4",
              playabilityScore: 0.81,
              estimatedBellowsChanges: 4,
              reason: "Bessere Spielbarkeit"
            }
          ],
          confirmedTranspose: null
        };
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
      async updateArrangementToken() {
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
    });
  });

  afterEach(() => {
    setDomainStoreForTests(null);
  });

  it("rejects unauthenticated requests", async () => {
    const request = new Request("http://localhost/api/conversions/c1", {
      method: "GET"
    });

    const response = await GET(request, {
      params: { id: "c1" }
    });

    expect(response.status).toBe(401);
  });

  it("returns conversion state including transpose suggestions", async () => {
    const request = new Request("http://localhost/api/conversions/c1", {
      method: "GET",
      headers: {
        "x-dev-user-id": "dev-user"
      }
    });

    const response = await GET(request, {
      params: { id: "c1" }
    });
    const body = (await response.json()) as {
      ok: boolean;
      job: { status: string };
      transposeSuggestions: Array<{ semitones: number }>;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.job.status).toBe("needs_transpose_confirmation");
    expect(body.transposeSuggestions[0]?.semitones).toBe(2);
  });

  it("returns 404 when conversion is missing", async () => {
    const request = new Request("http://localhost/api/conversions/missing", {
      method: "GET",
      headers: {
        "x-dev-user-id": "dev-user"
      }
    });

    const response = await GET(request, {
      params: { id: "missing" }
    });

    expect(response.status).toBe(404);
  });
});
