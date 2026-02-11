import { ConvexHttpClient } from "convex/browser";
import {
  ArrangementSchema,
  type Arrangement,
  type ExportErrorCode,
  type TransposeSuggestion
} from "@grifftab/domain-types";
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

  async getArrangement(input: { arrangementId: string }): Promise<Arrangement | null> {
    const remote = await this.client.query("arrangements:getArrangement" as never, {
      id: input.arrangementId
    } as never);
    return remote ? ArrangementSchema.parse(remote as Arrangement) : null;
  }

  async markExportProcessing(input: { exportId: string }): Promise<void> {
    await this.client.mutation("exports:markExportProcessing" as never, input as never);
  }

  async markExportCompleted(input: {
    exportId: string;
    artifactKey: string;
  }): Promise<void> {
    await this.client.mutation("exports:markExportCompleted" as never, input as never);
  }

  async markExportFailed(input: {
    exportId: string;
    errorCode: ExportErrorCode;
  }): Promise<void> {
    await this.client.mutation("exports:markExportFailed" as never, input as never);
  }
}
