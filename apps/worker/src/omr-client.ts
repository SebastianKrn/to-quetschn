import { OmrErrorSchema, OmrScoreSchema, type OmrScore } from "@grifftab/domain-types";

export interface OmrHttpClient {
  extractScore(input: {
    sourceFilePath: string;
    correlationId: string;
  }): Promise<OmrScore>;
}

export class OmrServiceHttpClient implements OmrHttpClient {
  constructor(private readonly baseUrl: string) {}

  async extractScore(input: {
    sourceFilePath: string;
    correlationId: string;
  }): Promise<OmrScore> {
    const response = await fetch(`${this.baseUrl}/extract`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(input)
    });

    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      score?: unknown;
      error?: unknown;
    };

    if (!response.ok || !body.ok) {
      const error = OmrErrorSchema.safeParse(body.error);
      if (error.success) {
        throw error.data;
      }

      throw {
        code: "OMR_UNAVAILABLE",
        message: "OMR service returned invalid error payload",
        retryable: true
      };
    }

    return OmrScoreSchema.parse(body.score);
  }
}
