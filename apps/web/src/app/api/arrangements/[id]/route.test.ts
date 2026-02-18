import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, PATCH } from "./route";
import { setDomainStoreForTests } from "@/lib/convex";

describe("/api/arrangements/:id", () => {
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
        if (id === "missing") {
          return null;
        }

        return {
          id,
          title: "Polka",
          tuning: "GCFB",
          tempoBpm: 88,
          measures: [
            {
              index: 1,
              tokens: [
                {
                  id: "token-1",
                  pitch: "C4",
                  row: 1,
                  button: 1,
                  direction: "push",
                  measure: 1,
                  beat: 0,
                  duration: "quarter"
                }
              ]
            }
          ],
          metadata: {}
        };
      },
      async updateArrangementToken(input) {
        if (input.arrangementId === "missing" || input.tokenId === "missing-token") {
          return null;
        }

        return {
          id: input.arrangementId,
          title: "Polka",
          tuning: "GCFB",
          tempoBpm: 88,
          measures: [
            {
              index: 1,
              tokens: [
                {
                  id: input.tokenId,
                  pitch: "C4",
                  row: input.row,
                  button: input.button,
                  direction: input.direction,
                  measure: 1,
                  beat: 0,
                  duration: "quarter"
                }
              ]
            }
          ],
          metadata: {}
        };
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

  it("returns arrangement for authenticated users", async () => {
    const request = new Request("http://localhost/api/arrangements/arr-1", {
      method: "GET",
      headers: {
        "x-dev-user-id": "dev-user"
      }
    });

    const response = await GET(request, {
      params: { id: "arr-1" }
    });
    const body = (await response.json()) as {
      ok: boolean;
      arrangement: { id: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.arrangement.id).toBe("arr-1");
  });

  it("rejects invalid patch payloads", async () => {
    const request = new Request("http://localhost/api/arrangements/arr-1", {
      method: "PATCH",
      headers: {
        "x-dev-user-id": "dev-user",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        tokenId: "token-1",
        row: 0
      })
    });

    const response = await PATCH(request, {
      params: { id: "arr-1" }
    });

    expect(response.status).toBe(400);
  });

  it("updates a single token for authenticated users", async () => {
    const request = new Request("http://localhost/api/arrangements/arr-1", {
      method: "PATCH",
      headers: {
        "x-dev-user-id": "dev-user",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        tokenId: "token-1",
        row: 2,
        button: 4,
        direction: "pull"
      })
    });

    const response = await PATCH(request, {
      params: { id: "arr-1" }
    });
    const body = (await response.json()) as {
      ok: boolean;
      arrangement: {
        measures: Array<{
          tokens: Array<{
            row: number;
            button: number;
            direction: string;
          }>;
        }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.arrangement.measures[0]?.tokens[0]?.row).toBe(2);
    expect(body.arrangement.measures[0]?.tokens[0]?.button).toBe(4);
    expect(body.arrangement.measures[0]?.tokens[0]?.direction).toBe("pull");
  });

  it("returns 404 when arrangement or token is missing", async () => {
    const request = new Request("http://localhost/api/arrangements/arr-1", {
      method: "PATCH",
      headers: {
        "x-dev-user-id": "dev-user",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        tokenId: "missing-token",
        row: 2,
        button: 4,
        direction: "pull"
      })
    });

    const response = await PATCH(request, {
      params: { id: "arr-1" }
    });

    expect(response.status).toBe(404);
  });
});
