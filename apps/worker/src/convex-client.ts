import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import {
  ArrangementSchema,
  type Arrangement,
  type ExportErrorCode,
  type ExportJob,
  type TransposeSuggestion
} from "@grifftab/domain-types";
import type { DomainClient } from "./pipeline.js";

interface StoredConversion {
  ownerUserId?: string;
  job: {
    id: string;
    status: "queued" | "processing" | "needs_transpose_confirmation" | "completed" | "failed";
    inputFileId: string;
    tuning: "GCFB" | "ADGC" | "BEADG" | "CFBB";
    progress: number;
    errorCode: string | null;
    createdAt: string;
    updatedAt: string;
  };
  transposeSuggestions: TransposeSuggestion[];
  confirmedTranspose: {
    semitones: number;
    targetKey: string;
  } | null;
}

interface StoredArrangement {
  ownerUserId?: string;
  arrangement: Arrangement;
}

interface StoredExport {
  ownerUserId?: string;
  job: ExportJob;
  correlationId: string;
}

interface LocalDomainStateSnapshot {
  conversions: Record<string, StoredConversion>;
  arrangements: Record<string, StoredArrangement>;
  exportsByArrangement: Record<string, StoredExport>;
  exportHistoryByArrangement: Record<string, StoredExport[]>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function canAccess(ownerInStore: string | undefined, ownerRequested: string | undefined): boolean {
  if (!ownerRequested || !ownerInStore) {
    return true;
  }
  return ownerInStore === ownerRequested;
}

export class ConvexDomainClient implements DomainClient {
  private readonly client: ConvexHttpClient;
  private readonly localFallbackEnabled: boolean;
  private readonly localStatePath: string;

  constructor(url: string, adminKey?: string) {
    this.client = new ConvexHttpClient(url);
    this.localFallbackEnabled =
      process.env.NODE_ENV === "development" && process.env.CONVEX_DEPLOYMENT === "local-dev";
    this.localStatePath =
      process.env.LOCAL_DOMAIN_STORE_PATH ?? path.join(process.cwd(), ".artifacts/mvp/local-domain-store.json");

    if (adminKey) {
      const adminClient = this.client as unknown as {
        setAdminAuth?: (token: string) => void;
      };
      adminClient.setAdminAuth?.(adminKey);
    }
  }

  private readLocalState(): LocalDomainStateSnapshot {
    const empty: LocalDomainStateSnapshot = {
      conversions: {},
      arrangements: {},
      exportsByArrangement: {},
      exportHistoryByArrangement: {}
    };

    try {
      const raw = fs.readFileSync(this.localStatePath, "utf8");
      if (!raw.trim()) {
        return empty;
      }

      const parsed = JSON.parse(raw) as LocalDomainStateSnapshot;
      return {
        conversions: parsed.conversions ?? {},
        arrangements: parsed.arrangements ?? {},
        exportsByArrangement: parsed.exportsByArrangement ?? {},
        exportHistoryByArrangement: parsed.exportHistoryByArrangement ?? {}
      };
    } catch (error) {
      const code = error && typeof error === "object" ? (error as { code?: string }).code : undefined;
      if (code === "ENOENT") {
        return empty;
      }
      return empty;
    }
  }

  private writeLocalState(state: LocalDomainStateSnapshot): void {
    fs.mkdirSync(path.dirname(this.localStatePath), { recursive: true });
    const tempPath = `${this.localStatePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(tempPath, this.localStatePath);
  }

  private async withFallback<TResult>(operation: () => Promise<TResult>, fallback: () => TResult): Promise<TResult> {
    try {
      return await operation();
    } catch (error) {
      if (!this.localFallbackEnabled) {
        throw error;
      }

      return fallback();
    }
  }

  private updateExportInState(
    state: LocalDomainStateSnapshot,
    input: {
      exportId: string;
      update: (job: ExportJob) => ExportJob;
    }
  ): void {
    for (const [arrangementId, stored] of Object.entries(state.exportsByArrangement)) {
      if (stored.job.id !== input.exportId) {
        continue;
      }

      state.exportsByArrangement[arrangementId] = {
        ...stored,
        job: input.update(stored.job)
      };
    }

    for (const [arrangementId, history] of Object.entries(state.exportHistoryByArrangement)) {
      state.exportHistoryByArrangement[arrangementId] = history.map((entry) => {
        if (entry.job.id !== input.exportId) {
          return entry;
        }

        return {
          ...entry,
          job: input.update(entry.job)
        };
      });
    }
  }

  async updateConversion(input: {
    id: string;
    status: "processing" | "needs_transpose_confirmation" | "completed" | "failed" | "queued";
    progress: number;
    errorCode?: string | null;
    transposeSuggestions?: TransposeSuggestion[];
  }): Promise<void> {
    await this.withFallback(
      async () => {
        await this.client.mutation("conversions:updateConversion" as never, input as never);
      },
      () => {
        const state = this.readLocalState();
        const existing = state.conversions[input.id];
        if (!existing) {
          return;
        }

        state.conversions[input.id] = {
          ...existing,
          job: {
            ...existing.job,
            status: input.status,
            progress: input.progress,
            errorCode: input.errorCode ?? existing.job.errorCode,
            updatedAt: nowIso()
          },
          transposeSuggestions: input.transposeSuggestions ?? existing.transposeSuggestions
        };
        this.writeLocalState(state);
      }
    );
  }

  async upsertArrangement(arrangement: Arrangement, ownerUserId: string): Promise<void> {
    await this.withFallback(
      async () => {
        await this.client.mutation("arrangements:upsertArrangement" as never, {
          arrangement: ArrangementSchema.parse(arrangement),
          ownerUserId
        } as never);
      },
      () => {
        const parsed = ArrangementSchema.parse(arrangement);
        const state = this.readLocalState();
        const existing = state.arrangements[parsed.id];

        if (existing?.ownerUserId && existing.ownerUserId !== ownerUserId) {
          throw new Error("Arrangement access denied");
        }

        state.arrangements[parsed.id] = {
          ownerUserId: existing?.ownerUserId ?? ownerUserId,
          arrangement: parsed
        };
        this.writeLocalState(state);
      }
    );
  }

  async getArrangement(input: { arrangementId: string; ownerUserId: string }): Promise<Arrangement | null> {
    return this.withFallback(
      async () => {
        const remote = await this.client.query("arrangements:getArrangement" as never, {
          id: input.arrangementId,
          ownerUserId: input.ownerUserId
        } as never);
        return remote ? ArrangementSchema.parse(remote as Arrangement) : null;
      },
      () => {
        const state = this.readLocalState();
        const existing = state.arrangements[input.arrangementId];
        if (!existing) {
          return null;
        }

        if (!canAccess(existing.ownerUserId, input.ownerUserId)) {
          return null;
        }

        if (!existing.ownerUserId) {
          state.arrangements[input.arrangementId] = {
            ...existing,
            ownerUserId: input.ownerUserId
          };
          this.writeLocalState(state);
        }

        return ArrangementSchema.parse(existing.arrangement);
      }
    );
  }

  async markExportProcessing(input: { exportId: string }): Promise<void> {
    await this.withFallback(
      async () => {
        await this.client.mutation("exports:markExportProcessing" as never, input as never);
      },
      () => {
        const state = this.readLocalState();
        this.updateExportInState(state, {
          exportId: input.exportId,
          update: (job) => ({
            ...job,
            status: "processing",
            errorCode: null,
            updatedAt: nowIso()
          })
        });
        this.writeLocalState(state);
      }
    );
  }

  async markExportCompleted(input: {
    exportId: string;
    artifactKey: string;
  }): Promise<void> {
    await this.withFallback(
      async () => {
        await this.client.mutation("exports:markExportCompleted" as never, input as never);
      },
      () => {
        const state = this.readLocalState();
        this.updateExportInState(state, {
          exportId: input.exportId,
          update: (job) => ({
            ...job,
            status: "completed",
            artifactKey: input.artifactKey,
            errorCode: null,
            updatedAt: nowIso()
          })
        });
        this.writeLocalState(state);
      }
    );
  }

  async markExportFailed(input: {
    exportId: string;
    errorCode: ExportErrorCode;
  }): Promise<void> {
    await this.withFallback(
      async () => {
        await this.client.mutation("exports:markExportFailed" as never, input as never);
      },
      () => {
        const state = this.readLocalState();
        this.updateExportInState(state, {
          exportId: input.exportId,
          update: (job) => ({
            ...job,
            status: "failed",
            errorCode: input.errorCode,
            updatedAt: nowIso()
          })
        });
        this.writeLocalState(state);
      }
    );
  }
}
