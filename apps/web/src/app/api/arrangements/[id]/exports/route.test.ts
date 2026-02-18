import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";
import { setDomainStoreForTests } from "@/lib/convex";

describe("/api/arrangements/:id/exports", () => {
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
      async listExportsByArrangement(arrangementId, _ownerUserId, limit) {
        const now = new Date().toISOString();
        const items = [
          {
            id: "export-2",
            arrangementId,
            status: "completed" as const,
            format: "pdf" as const,
            artifactKey: "exports/a1/export-2.pdf",
            errorCode: null,
            createdAt: now,
            updatedAt: now
          },
          {
            id: "export-1",
            arrangementId,
            status: "failed" as const,
            format: "pdf" as const,
            artifactKey: null,
            errorCode: "EXPORT_RENDER_FAILED" as const,
            createdAt: now,
            updatedAt: now
          }
        ];

        return items.slice(0, limit ?? items.length);
      }
    });
  });

  afterEach(() => {
    setDomainStoreForTests(null);
  });

  it("rejects unauthenticated requests", async () => {
    const request = new Request("http://localhost/api/arrangements/a1/exports", {
      method: "GET"
    });

    const response = await GET(request, {
      params: { id: "a1" }
    });

    expect(response.status).toBe(401);
  });

  it("returns export history for authenticated users", async () => {
    const request = new Request("http://localhost/api/arrangements/a1/exports?limit=1", {
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
      exports: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.exports).toHaveLength(1);
    expect(body.exports[0]?.id).toBe("export-2");
  });

  it("rejects invalid limit values", async () => {
    const request = new Request("http://localhost/api/arrangements/a1/exports?limit=999", {
      method: "GET",
      headers: {
        "x-dev-user-id": "dev-user"
      }
    });

    const response = await GET(request, {
      params: { id: "a1" }
    });

    expect(response.status).toBe(400);
  });
});
