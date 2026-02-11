import { ConvexHttpClient } from "convex/browser";
import { ArrangementSchema, type Arrangement, type TransposeSuggestion } from "@grifftab/domain-types";
import type { DomainClient } from "./pipeline.js";

export class ConvexDomainClient implements DomainClient {
  private readonly client: ConvexHttpClient;

  constructor(url: string) {
    this.client = new ConvexHttpClient(url);
  }

  async updateConversion(input: {
    id: string;
    status: "processing" | "needs_transpose_confirmation" | "completed" | "failed" | "queued";
    progress: number;
    errorCode?: string | null;
    transposeSuggestions?: TransposeSuggestion[];
  }): Promise<void> {
    await this.client.mutation("conversions:updateConversion" as never, input as never);
  }

  async upsertArrangement(arrangement: Arrangement): Promise<void> {
    await this.client.mutation("arrangements:upsertArrangement" as never, {
      arrangement: ArrangementSchema.parse(arrangement)
    } as never);
  }
}
