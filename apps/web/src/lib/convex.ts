import { ConvexHttpClient } from "convex/browser";
import {
  ArrangementSchema,
  ConversionJobSchema,
  type Arrangement,
  type ConversionJob,
  type ConversionJobStatus,
  type Tuning,
  type TransposeSuggestion
} from "@grifftab/domain-types";
import { getWebEnv } from "./env";

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
  }): Promise<ConversionJob>;
  getConversion(id: string): Promise<ConversionRuntime | null>;
  updateConversion(input: {
    id: string;
    status: ConversionJobStatus;
    progress?: number;
    errorCode?: string | null;
    transposeSuggestions?: TransposeSuggestion[];
  }): Promise<ConversionRuntime | null>;
  confirmTranspose(input: {
    id: string;
    semitones: number;
    targetKey: string;
  }): Promise<ConversionRuntime | null>;
  getConversionSource(id: string): Promise<{ inputFileId: string; tuning: Tuning } | null>;
  upsertArrangement(arrangement: Arrangement): Promise<Arrangement>;
  getArrangement(id: string): Promise<Arrangement | null>;
}

interface StoredConversion {
  job: ConversionJob;
  transposeSuggestions: TransposeSuggestion[];
  confirmedTranspose: {
    semitones: number;
    targetKey: string;
  } | null;
}

const memory = {
  conversions: new Map<string, StoredConversion>(),
  arrangements: new Map<string, Arrangement>()
};

function nowIso(): string {
  return new Date().toISOString();
}

class MemoryDomainStore implements DomainStore {
  async createConversion(input: {
    id: string;
    inputFileId: string;
    tuning: Tuning;
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
      job,
      transposeSuggestions: [],
      confirmedTranspose: null
    });

    return job;
  }

  async getConversion(id: string): Promise<ConversionRuntime | null> {
    const conversion = memory.conversions.get(id);
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
  }): Promise<ConversionRuntime | null> {
    const existing = memory.conversions.get(input.id);
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
  }): Promise<ConversionRuntime | null> {
    const existing = memory.conversions.get(input.id);
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

  async getConversionSource(id: string): Promise<{ inputFileId: string; tuning: Tuning } | null> {
    const conversion = memory.conversions.get(id);
    if (!conversion) {
      return null;
    }

    return {
      inputFileId: conversion.job.inputFileId,
      tuning: conversion.job.tuning
    };
  }

  async upsertArrangement(arrangement: Arrangement): Promise<Arrangement> {
    const parsed = ArrangementSchema.parse(arrangement);
    memory.arrangements.set(parsed.id, parsed);
    return parsed;
  }

  async getArrangement(id: string): Promise<Arrangement | null> {
    return memory.arrangements.get(id) ?? null;
  }
}

class ConvexDomainStore extends MemoryDomainStore {
  private readonly client: ConvexHttpClient;

  constructor(url: string) {
    super();
    this.client = new ConvexHttpClient(url);
  }

  private async callMutation<TResult>(name: string, args: Record<string, unknown>): Promise<TResult> {
    return this.client.mutation(name as never, args as never) as Promise<TResult>;
  }

  private async callQuery<TResult>(name: string, args: Record<string, unknown>): Promise<TResult> {
    return this.client.query(name as never, args as never) as Promise<TResult>;
  }

  override async createConversion(input: {
    id: string;
    inputFileId: string;
    tuning: Tuning;
  }): Promise<ConversionJob> {
    try {
      const remote = await this.callMutation<ConversionJob>("conversions:createConversion", input);
      return ConversionJobSchema.parse(remote);
    } catch {
      return super.createConversion(input);
    }
  }

  override async getConversion(id: string): Promise<ConversionRuntime | null> {
    try {
      const remote = await this.callQuery<ConversionRuntime | null>("conversions:getConversion", { id });
      if (!remote) {
        return null;
      }

      return {
        job: ConversionJobSchema.parse(remote.job),
        transposeSuggestions: remote.transposeSuggestions ?? [],
        confirmedTranspose: remote.confirmedTranspose ?? null
      };
    } catch {
      return super.getConversion(id);
    }
  }

  override async updateConversion(input: {
    id: string;
    status: ConversionJobStatus;
    progress?: number;
    errorCode?: string | null;
    transposeSuggestions?: TransposeSuggestion[];
  }): Promise<ConversionRuntime | null> {
    try {
      const remote = await this.callMutation<ConversionRuntime | null>("conversions:updateConversion", input);
      if (!remote) {
        return null;
      }

      return {
        job: ConversionJobSchema.parse(remote.job),
        transposeSuggestions: remote.transposeSuggestions ?? [],
        confirmedTranspose: remote.confirmedTranspose ?? null
      };
    } catch {
      return super.updateConversion(input);
    }
  }

  override async confirmTranspose(input: {
    id: string;
    semitones: number;
    targetKey: string;
  }): Promise<ConversionRuntime | null> {
    try {
      const remote = await this.callMutation<ConversionRuntime | null>("conversions:confirmTranspose", input);
      if (!remote) {
        return null;
      }

      return {
        job: ConversionJobSchema.parse(remote.job),
        transposeSuggestions: remote.transposeSuggestions ?? [],
        confirmedTranspose: remote.confirmedTranspose ?? null
      };
    } catch {
      return super.confirmTranspose(input);
    }
  }

  override async getConversionSource(id: string): Promise<{ inputFileId: string; tuning: Tuning } | null> {
    try {
      return await this.callQuery<{ inputFileId: string; tuning: Tuning } | null>(
        "conversions:getConversionSource",
        { id }
      );
    } catch {
      return super.getConversionSource(id);
    }
  }

  override async upsertArrangement(arrangement: Arrangement): Promise<Arrangement> {
    try {
      const remote = await this.callMutation<Arrangement>("arrangements:upsertArrangement", {
        arrangement
      });
      return ArrangementSchema.parse(remote);
    } catch {
      return super.upsertArrangement(arrangement);
    }
  }

  override async getArrangement(id: string): Promise<Arrangement | null> {
    try {
      const remote = await this.callQuery<Arrangement | null>("arrangements:getArrangement", { id });
      return remote ? ArrangementSchema.parse(remote) : null;
    } catch {
      return super.getArrangement(id);
    }
  }
}

const env = getWebEnv();

let domainStore: DomainStore = new ConvexDomainStore(env.CONVEX_URL);

export function getDomainStore(): DomainStore {
  return domainStore;
}

export function setDomainStoreForTests(store: DomainStore | null) {
  domainStore = store ?? new ConvexDomainStore(env.CONVEX_URL);
}
