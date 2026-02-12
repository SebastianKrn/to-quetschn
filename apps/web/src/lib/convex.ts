import { ConvexHttpClient } from "convex/browser";
import {
  ArrangementSchema,
  ConversionJobSchema,
  ExportJobSchema,
  type Arrangement,
  type ConversionJob,
  type ConversionJobStatus,
  type ExportJob,
  type Tuning,
  type TransposeSuggestion
} from "@grifftab/domain-types";
import { getWebEnv, type WebEnv } from "./env";

export interface ConversionRuntime {
  job: ConversionJob;
  transposeSuggestions: TransposeSuggestion[];
  confirmedTranspose: {
    semitones: number;
    targetKey: string;
  } | null;
}

export interface DomainStore {
  createConversion(input: {
    id: string;
    inputFileId: string;
    tuning: Tuning;
    ownerUserId: string;
  }): Promise<ConversionJob>;
  getConversion(id: string, ownerUserId: string): Promise<ConversionRuntime | null>;
  updateConversion(input: {
    id: string;
    status: ConversionJobStatus;
    progress?: number;
    errorCode?: string | null;
    transposeSuggestions?: TransposeSuggestion[];
    ownerUserId?: string;
  }): Promise<ConversionRuntime | null>;
  confirmTranspose(input: {
    id: string;
    semitones: number;
    targetKey: string;
    ownerUserId: string;
  }): Promise<ConversionRuntime | null>;
  getConversionSource(id: string, ownerUserId?: string): Promise<{ inputFileId: string; tuning: Tuning } | null>;
  upsertArrangement(arrangement: Arrangement, ownerUserId: string): Promise<Arrangement>;
  getArrangement(id: string, ownerUserId: string): Promise<Arrangement | null>;
  requestLatestExport(input: {
    arrangementId: string;
    correlationId: string;
    ownerUserId: string;
  }): Promise<{
    job: ExportJob;
    shouldEnqueue: boolean;
  }>;
  getLatestExportByArrangement(arrangementId: string, ownerUserId: string): Promise<ExportJob | null>;
}

interface StoredConversion {
  ownerUserId?: string;
  job: ConversionJob;
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

const memory = {
  conversions: new Map<string, StoredConversion>(),
  arrangements: new Map<string, StoredArrangement>(),
  exportsByArrangement: new Map<string, StoredExport>()
};

function nowIso(): string {
  return new Date().toISOString();
}

function assertOwnerAccess(storedOwner: string | undefined, requestedOwner: string | undefined): boolean {
  if (!requestedOwner) {
    return true;
  }

  if (!storedOwner) {
    return true;
  }

  return storedOwner === requestedOwner;
}

class MemoryDomainStore implements DomainStore {
  private claimConversionOwner(input: { id: string; ownerUserId?: string }): StoredConversion | null {
    const conversion = memory.conversions.get(input.id);
    if (!conversion) {
      return null;
    }

    if (!assertOwnerAccess(conversion.ownerUserId, input.ownerUserId)) {
      return null;
    }

    if (input.ownerUserId && !conversion.ownerUserId) {
      const claimed = {
        ...conversion,
        ownerUserId: input.ownerUserId
      };
      memory.conversions.set(input.id, claimed);
      return claimed;
    }

    return conversion;
  }

  private claimArrangementOwner(input: { id: string; ownerUserId: string }): StoredArrangement | null {
    const arrangement = memory.arrangements.get(input.id);
    if (!arrangement) {
      return null;
    }

    if (!assertOwnerAccess(arrangement.ownerUserId, input.ownerUserId)) {
      return null;
    }

    if (!arrangement.ownerUserId) {
      const claimed = {
        ...arrangement,
        ownerUserId: input.ownerUserId
      };
      memory.arrangements.set(input.id, claimed);
      return claimed;
    }

    return arrangement;
  }

  private claimExportOwner(input: { arrangementId: string; ownerUserId: string }): StoredExport | null {
    const stored = memory.exportsByArrangement.get(input.arrangementId);
    if (!stored) {
      return null;
    }

    if (!assertOwnerAccess(stored.ownerUserId, input.ownerUserId)) {
      return null;
    }

    if (!stored.ownerUserId) {
      const claimed = {
        ...stored,
        ownerUserId: input.ownerUserId
      };
      memory.exportsByArrangement.set(input.arrangementId, claimed);
      return claimed;
    }

    return stored;
  }

  async createConversion(input: {
    id: string;
    inputFileId: string;
    tuning: Tuning;
    ownerUserId: string;
  }): Promise<ConversionJob> {
    const now = nowIso();
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

    memory.conversions.set(job.id, {
      ownerUserId: input.ownerUserId,
      job,
      transposeSuggestions: [],
      confirmedTranspose: null
    });

    return job;
  }

  async getConversion(id: string, ownerUserId: string): Promise<ConversionRuntime | null> {
    const conversion = this.claimConversionOwner({ id, ownerUserId });
    if (!conversion) {
      return null;
    }

    return {
      job: conversion.job,
      transposeSuggestions: conversion.transposeSuggestions,
      confirmedTranspose: conversion.confirmedTranspose
    };
  }

  async updateConversion(input: {
    id: string;
    status: ConversionJobStatus;
    progress?: number;
    errorCode?: string | null;
    transposeSuggestions?: TransposeSuggestion[];
    ownerUserId?: string;
  }): Promise<ConversionRuntime | null> {
    const existing = this.claimConversionOwner({
      id: input.id,
      ownerUserId: input.ownerUserId
    });

    if (!existing) {
      return null;
    }

    const updated = ConversionJobSchema.parse({
      ...existing.job,
      status: input.status,
      progress: input.progress ?? existing.job.progress,
      errorCode: input.errorCode ?? existing.job.errorCode,
      updatedAt: nowIso()
    });

    const stored: StoredConversion = {
      ...existing,
      ownerUserId: existing.ownerUserId ?? input.ownerUserId,
      job: updated,
      transposeSuggestions: input.transposeSuggestions ?? existing.transposeSuggestions,
      confirmedTranspose: existing.confirmedTranspose
    };

    memory.conversions.set(input.id, stored);

    return {
      job: updated,
      transposeSuggestions: stored.transposeSuggestions,
      confirmedTranspose: stored.confirmedTranspose
    };
  }

  async confirmTranspose(input: {
    id: string;
    semitones: number;
    targetKey: string;
    ownerUserId: string;
  }): Promise<ConversionRuntime | null> {
    const existing = this.claimConversionOwner({
      id: input.id,
      ownerUserId: input.ownerUserId
    });

    if (!existing) {
      return null;
    }

    const updated = ConversionJobSchema.parse({
      ...existing.job,
      status: "queued",
      progress: 0,
      errorCode: null,
      updatedAt: nowIso()
    });

    const stored: StoredConversion = {
      ...existing,
      ownerUserId: existing.ownerUserId ?? input.ownerUserId,
      job: updated,
      confirmedTranspose: {
        semitones: input.semitones,
        targetKey: input.targetKey
      }
    };

    memory.conversions.set(input.id, stored);

    return {
      job: updated,
      transposeSuggestions: stored.transposeSuggestions,
      confirmedTranspose: stored.confirmedTranspose
    };
  }

  async getConversionSource(id: string, ownerUserId?: string): Promise<{ inputFileId: string; tuning: Tuning } | null> {
    const conversion = this.claimConversionOwner({ id, ownerUserId });
    if (!conversion) {
      return null;
    }

    return {
      inputFileId: conversion.job.inputFileId,
      tuning: conversion.job.tuning
    };
  }

  async upsertArrangement(arrangement: Arrangement, ownerUserId: string): Promise<Arrangement> {
    const parsed = ArrangementSchema.parse(arrangement);
    const existing = memory.arrangements.get(parsed.id);

    if (existing && !assertOwnerAccess(existing.ownerUserId, ownerUserId)) {
      throw new Error("Arrangement access denied");
    }

    memory.arrangements.set(parsed.id, {
      ownerUserId: existing?.ownerUserId ?? ownerUserId,
      arrangement: parsed
    });
    return parsed;
  }

  async getArrangement(id: string, ownerUserId: string): Promise<Arrangement | null> {
    const claimed = this.claimArrangementOwner({ id, ownerUserId });
    return claimed?.arrangement ?? null;
  }

  async requestLatestExport(input: {
    arrangementId: string;
    correlationId: string;
    ownerUserId: string;
  }): Promise<{
    job: ExportJob;
    shouldEnqueue: boolean;
  }> {
    const existing = this.claimExportOwner({
      arrangementId: input.arrangementId,
      ownerUserId: input.ownerUserId
    });

    if (existing) {
      const reusable =
        existing.job.status === "queued" ||
        existing.job.status === "processing" ||
        (existing.job.status === "completed" && existing.job.artifactKey !== null);

      if (reusable) {
        return {
          job: existing.job,
          shouldEnqueue: false
        };
      }
    }

    const now = nowIso();
    const exportJob = ExportJobSchema.parse({
      id: existing?.job.id ?? `export-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      arrangementId: input.arrangementId,
      status: "queued",
      format: "pdf",
      artifactKey: null,
      errorCode: null,
      createdAt: existing?.job.createdAt ?? now,
      updatedAt: now
    });

    memory.exportsByArrangement.set(input.arrangementId, {
      ownerUserId: existing?.ownerUserId ?? input.ownerUserId,
      job: exportJob,
      correlationId: input.correlationId
    });

    return {
      job: exportJob,
      shouldEnqueue: true
    };
  }

  async getLatestExportByArrangement(arrangementId: string, ownerUserId: string): Promise<ExportJob | null> {
    const claimed = this.claimExportOwner({ arrangementId, ownerUserId });
    return claimed?.job ?? null;
  }
}

class ConvexDomainStore extends MemoryDomainStore {
  private readonly client: ConvexHttpClient;

  constructor(
    url: string,
    private readonly options: {
      allowFallback: boolean;
      adminKey?: string;
    }
  ) {
    super();
    this.client = new ConvexHttpClient(url);
    if (options.adminKey) {
      const adminClient = this.client as unknown as {
        setAdminAuth?: (token: string) => void;
      };
      adminClient.setAdminAuth?.(options.adminKey);
    }
  }

  private async callMutation<TResult>(name: string, args: Record<string, unknown>): Promise<TResult> {
    return this.client.mutation(name as never, args as never) as Promise<TResult>;
  }

  private async callQuery<TResult>(name: string, args: Record<string, unknown>): Promise<TResult> {
    return this.client.query(name as never, args as never) as Promise<TResult>;
  }

  private async withFallback<TResult>(input: {
    operation: () => Promise<TResult>;
    fallback: () => Promise<TResult>;
    operationName: string;
  }): Promise<TResult> {
    try {
      return await input.operation();
    } catch (error) {
      if (this.options.allowFallback) {
        return input.fallback();
      }

      throw new Error(`Convex ${input.operationName} failed`, { cause: error });
    }
  }

  override async createConversion(input: {
    id: string;
    inputFileId: string;
    tuning: Tuning;
    ownerUserId: string;
  }): Promise<ConversionJob> {
    return this.withFallback({
      operationName: "createConversion",
      operation: async () => {
        const remote = await this.callMutation<ConversionJob>("conversions:createConversion", input);
        return ConversionJobSchema.parse(remote);
      },
      fallback: () => super.createConversion(input)
    });
  }

  override async getConversion(id: string, ownerUserId: string): Promise<ConversionRuntime | null> {
    return this.withFallback({
      operationName: "getConversion",
      operation: async () => {
        const remote = await this.callQuery<ConversionRuntime | null>("conversions:getConversion", {
          id,
          ownerUserId
        });
        if (!remote) {
          return null;
        }

        return {
          job: ConversionJobSchema.parse(remote.job),
          transposeSuggestions: remote.transposeSuggestions ?? [],
          confirmedTranspose: remote.confirmedTranspose ?? null
        };
      },
      fallback: () => super.getConversion(id, ownerUserId)
    });
  }

  override async updateConversion(input: {
    id: string;
    status: ConversionJobStatus;
    progress?: number;
    errorCode?: string | null;
    transposeSuggestions?: TransposeSuggestion[];
    ownerUserId?: string;
  }): Promise<ConversionRuntime | null> {
    return this.withFallback({
      operationName: "updateConversion",
      operation: async () => {
        const remote = await this.callMutation<ConversionRuntime | null>("conversions:updateConversion", input);
        if (!remote) {
          return null;
        }

        return {
          job: ConversionJobSchema.parse(remote.job),
          transposeSuggestions: remote.transposeSuggestions ?? [],
          confirmedTranspose: remote.confirmedTranspose ?? null
        };
      },
      fallback: () => super.updateConversion(input)
    });
  }

  override async confirmTranspose(input: {
    id: string;
    semitones: number;
    targetKey: string;
    ownerUserId: string;
  }): Promise<ConversionRuntime | null> {
    return this.withFallback({
      operationName: "confirmTranspose",
      operation: async () => {
        const remote = await this.callMutation<ConversionRuntime | null>("conversions:confirmTranspose", input);
        if (!remote) {
          return null;
        }

        return {
          job: ConversionJobSchema.parse(remote.job),
          transposeSuggestions: remote.transposeSuggestions ?? [],
          confirmedTranspose: remote.confirmedTranspose ?? null
        };
      },
      fallback: () => super.confirmTranspose(input)
    });
  }

  override async getConversionSource(id: string, ownerUserId?: string): Promise<{ inputFileId: string; tuning: Tuning } | null> {
    return this.withFallback({
      operationName: "getConversionSource",
      operation: () =>
        this.callQuery<{ inputFileId: string; tuning: Tuning } | null>("conversions:getConversionSource", {
          id,
          ownerUserId
        }),
      fallback: () => super.getConversionSource(id, ownerUserId)
    });
  }

  override async upsertArrangement(arrangement: Arrangement, ownerUserId: string): Promise<Arrangement> {
    return this.withFallback({
      operationName: "upsertArrangement",
      operation: async () => {
        const remote = await this.callMutation<Arrangement>("arrangements:upsertArrangement", {
          arrangement,
          ownerUserId
        });
        return ArrangementSchema.parse(remote);
      },
      fallback: () => super.upsertArrangement(arrangement, ownerUserId)
    });
  }

  override async getArrangement(id: string, ownerUserId: string): Promise<Arrangement | null> {
    return this.withFallback({
      operationName: "getArrangement",
      operation: async () => {
        const remote = await this.callQuery<Arrangement | null>("arrangements:getArrangement", {
          id,
          ownerUserId
        });
        return remote ? ArrangementSchema.parse(remote) : null;
      },
      fallback: () => super.getArrangement(id, ownerUserId)
    });
  }

  override async requestLatestExport(input: {
    arrangementId: string;
    correlationId: string;
    ownerUserId: string;
  }): Promise<{
    job: ExportJob;
    shouldEnqueue: boolean;
  }> {
    return this.withFallback({
      operationName: "requestLatestExport",
      operation: async () => {
        const remote = await this.callMutation<{ job: ExportJob; shouldEnqueue: boolean }>(
          "exports:requestLatestExport",
          input
        );
        return {
          job: ExportJobSchema.parse(remote.job),
          shouldEnqueue: remote.shouldEnqueue
        };
      },
      fallback: () => super.requestLatestExport(input)
    });
  }

  override async getLatestExportByArrangement(arrangementId: string, ownerUserId: string): Promise<ExportJob | null> {
    return this.withFallback({
      operationName: "getLatestExportByArrangement",
      operation: async () => {
        const remote = await this.callQuery<ExportJob | null>("exports:getLatestExportByArrangement", {
          arrangementId,
          ownerUserId
        });
        return remote ? ExportJobSchema.parse(remote) : null;
      },
      fallback: () => super.getLatestExportByArrangement(arrangementId, ownerUserId)
    });
  }
}

const env = getWebEnv();

function allowConvexFallback(input: WebEnv): boolean {
  return input.NODE_ENV === "development" && input.CONVEX_DEPLOYMENT === "local-dev";
}

function createDefaultStore(): DomainStore {
  if (env.NODE_ENV === "test") {
    return new MemoryDomainStore();
  }

  return new ConvexDomainStore(env.CONVEX_URL, {
    allowFallback: allowConvexFallback(env),
    adminKey: env.CONVEX_ADMIN_KEY
  });
}

let domainStore: DomainStore = createDefaultStore();

export function getDomainStore(): DomainStore {
  return domainStore;
}

export function setDomainStoreForTests(store: DomainStore | null) {
  domainStore = store ?? createDefaultStore();
}
