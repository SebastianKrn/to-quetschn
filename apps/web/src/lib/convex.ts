import fs from "node:fs";
import path from "node:path";
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
    rightsConfirmedAt?: string | null;
    rightsConfirmationSource?: "upload_form" | "api_json" | null;
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
  updateArrangementToken(input: {
    arrangementId: string;
    ownerUserId: string;
    tokenId: string;
    row: number;
    button: number;
    direction: "push" | "pull";
  }): Promise<Arrangement | null>;
  requestLatestExport(input: {
    arrangementId: string;
    correlationId: string;
    ownerUserId: string;
    force?: boolean;
  }): Promise<{
    job: ExportJob;
    shouldEnqueue: boolean;
  }>;
  getLatestExportByArrangement(arrangementId: string, ownerUserId: string): Promise<ExportJob | null>;
  listExportsByArrangement(arrangementId: string, ownerUserId: string, limit?: number): Promise<ExportJob[]>;
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

interface LocalDomainStateSnapshot {
  conversions: Record<string, StoredConversion>;
  arrangements: Record<string, StoredArrangement>;
  exportsByArrangement: Record<string, StoredExport>;
  exportHistoryByArrangement: Record<string, StoredExport[]>;
}

const memory = {
  conversions: new Map<string, StoredConversion>(),
  arrangements: new Map<string, StoredArrangement>(),
  exportsByArrangement: new Map<string, StoredExport>(),
  exportHistoryByArrangement: new Map<string, StoredExport[]>()
};

const ENABLE_LOCAL_DOMAIN_STATE =
  process.env.CONVEX_DEPLOYMENT === "local-dev" &&
  (process.env.NODE_ENV === "development" || process.env.PILOT_MODE === "true");
const LOCAL_DOMAIN_STATE_PATH =
  process.env.LOCAL_DOMAIN_STORE_PATH ?? path.join(process.cwd(), ".artifacts/mvp/local-domain-store.json");

function loadLocalDomainState() {
  if (!ENABLE_LOCAL_DOMAIN_STATE) {
    return;
  }

  let parsed: LocalDomainStateSnapshot | null = null;
  try {
    const raw = fs.readFileSync(LOCAL_DOMAIN_STATE_PATH, "utf8");
    if (!raw.trim()) {
      return;
    }
    parsed = JSON.parse(raw) as LocalDomainStateSnapshot;
  } catch (error) {
    const code = error && typeof error === "object" ? (error as { code?: string }).code : undefined;
    if (code === "ENOENT") {
      return;
    }
    return;
  }

  memory.conversions = new Map(Object.entries(parsed.conversions ?? {}));
  memory.arrangements = new Map(Object.entries(parsed.arrangements ?? {}));
  memory.exportsByArrangement = new Map(Object.entries(parsed.exportsByArrangement ?? {}));
  memory.exportHistoryByArrangement = new Map(Object.entries(parsed.exportHistoryByArrangement ?? {}));
}

function persistLocalDomainState() {
  if (!ENABLE_LOCAL_DOMAIN_STATE) {
    return;
  }

  const snapshot: LocalDomainStateSnapshot = {
    conversions: Object.fromEntries(memory.conversions.entries()),
    arrangements: Object.fromEntries(memory.arrangements.entries()),
    exportsByArrangement: Object.fromEntries(memory.exportsByArrangement.entries()),
    exportHistoryByArrangement: Object.fromEntries(memory.exportHistoryByArrangement.entries())
  };

  fs.mkdirSync(path.dirname(LOCAL_DOMAIN_STATE_PATH), { recursive: true });
  const tempPath = `${LOCAL_DOMAIN_STATE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), "utf8");
  fs.renameSync(tempPath, LOCAL_DOMAIN_STATE_PATH);
}

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
  private syncFromDisk() {
    loadLocalDomainState();
  }

  private syncToDisk() {
    persistLocalDomainState();
  }

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

  private listClaimedHistory(input: {
    arrangementId: string;
    ownerUserId: string;
  }): StoredExport[] {
    const history = memory.exportHistoryByArrangement.get(input.arrangementId) ?? [];
    let changed = false;
    const claimed = history.map((entry) => {
      if (entry.ownerUserId) {
        return entry;
      }

      changed = true;
      return {
        ...entry,
        ownerUserId: input.ownerUserId
      };
    });

    if (changed) {
      memory.exportHistoryByArrangement.set(input.arrangementId, claimed);
    }

    return claimed.filter((entry) => assertOwnerAccess(entry.ownerUserId, input.ownerUserId));
  }

  async createConversion(input: {
    id: string;
    inputFileId: string;
    tuning: Tuning;
    ownerUserId: string;
    rightsConfirmedAt?: string | null;
    rightsConfirmationSource?: "upload_form" | "api_json" | null;
  }): Promise<ConversionJob> {
    this.syncFromDisk();
    const now = nowIso();
    const job = ConversionJobSchema.parse({
      id: input.id,
      status: "queued",
      inputFileId: input.inputFileId,
      tuning: input.tuning,
      progress: 0,
      errorCode: null,
      rightsConfirmedAt: input.rightsConfirmedAt ?? null,
      rightsConfirmationSource: input.rightsConfirmationSource ?? null,
      createdAt: now,
      updatedAt: now
    });

    memory.conversions.set(job.id, {
      ownerUserId: input.ownerUserId,
      job,
      transposeSuggestions: [],
      confirmedTranspose: null
    });
    this.syncToDisk();

    return job;
  }

  async getConversion(id: string, ownerUserId: string): Promise<ConversionRuntime | null> {
    this.syncFromDisk();
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
    this.syncFromDisk();
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
    this.syncToDisk();

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
    this.syncFromDisk();
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
    this.syncToDisk();

    return {
      job: updated,
      transposeSuggestions: stored.transposeSuggestions,
      confirmedTranspose: stored.confirmedTranspose
    };
  }

  async getConversionSource(id: string, ownerUserId?: string): Promise<{ inputFileId: string; tuning: Tuning } | null> {
    this.syncFromDisk();
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
    this.syncFromDisk();
    const parsed = ArrangementSchema.parse(arrangement);
    const existing = memory.arrangements.get(parsed.id);

    if (existing && !assertOwnerAccess(existing.ownerUserId, ownerUserId)) {
      throw new Error("Arrangement access denied");
    }

    memory.arrangements.set(parsed.id, {
      ownerUserId: existing?.ownerUserId ?? ownerUserId,
      arrangement: parsed
    });
    this.syncToDisk();
    return parsed;
  }

  async getArrangement(id: string, ownerUserId: string): Promise<Arrangement | null> {
    this.syncFromDisk();
    const claimed = this.claimArrangementOwner({ id, ownerUserId });
    return claimed?.arrangement ?? null;
  }

  async updateArrangementToken(input: {
    arrangementId: string;
    ownerUserId: string;
    tokenId: string;
    row: number;
    button: number;
    direction: "push" | "pull";
  }): Promise<Arrangement | null> {
    this.syncFromDisk();
    const claimed = this.claimArrangementOwner({
      id: input.arrangementId,
      ownerUserId: input.ownerUserId
    });
    if (!claimed) {
      return null;
    }

    let tokenFound = false;
    const updated: Arrangement = ArrangementSchema.parse({
      ...claimed.arrangement,
      measures: claimed.arrangement.measures.map((measure) => ({
        ...measure,
        tokens: measure.tokens.map((token) => {
          if (token.id !== input.tokenId) {
            return token;
          }

          tokenFound = true;
          return {
            ...token,
            row: input.row,
            button: input.button,
            direction: input.direction
          };
        })
      }))
    });

    if (!tokenFound) {
      return null;
    }

    memory.arrangements.set(input.arrangementId, {
      ownerUserId: claimed.ownerUserId ?? input.ownerUserId,
      arrangement: updated
    });
    this.syncToDisk();

    return updated;
  }

  async requestLatestExport(input: {
    arrangementId: string;
    correlationId: string;
    ownerUserId: string;
    force?: boolean;
  }): Promise<{
    job: ExportJob;
    shouldEnqueue: boolean;
  }> {
    this.syncFromDisk();
    const existing = this.claimExportOwner({
      arrangementId: input.arrangementId,
      ownerUserId: input.ownerUserId
    });

    if (existing && !input.force) {
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
      id: `export-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      arrangementId: input.arrangementId,
      status: "queued",
      format: "pdf",
      artifactKey: null,
      errorCode: null,
      createdAt: now,
      updatedAt: now
    });

    const stored = {
      ownerUserId: existing?.ownerUserId ?? input.ownerUserId,
      job: exportJob,
      correlationId: input.correlationId
    };

    memory.exportsByArrangement.set(input.arrangementId, stored);
    const history = memory.exportHistoryByArrangement.get(input.arrangementId) ?? [];
    memory.exportHistoryByArrangement.set(input.arrangementId, [stored, ...history]);
    this.syncToDisk();

    return {
      job: exportJob,
      shouldEnqueue: true
    };
  }

  async getLatestExportByArrangement(arrangementId: string, ownerUserId: string): Promise<ExportJob | null> {
    this.syncFromDisk();
    const claimed = this.claimExportOwner({ arrangementId, ownerUserId });
    return claimed?.job ?? null;
  }

  async listExportsByArrangement(arrangementId: string, ownerUserId: string, limit = 20): Promise<ExportJob[]> {
    this.syncFromDisk();
    const clampedLimit = Math.max(1, Math.min(limit, 50));
    const history = this.listClaimedHistory({
      arrangementId,
      ownerUserId
    });

    return history.slice(0, clampedLimit).map((entry) => entry.job);
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
    rightsConfirmedAt?: string | null;
    rightsConfirmationSource?: "upload_form" | "api_json" | null;
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

  override async updateArrangementToken(input: {
    arrangementId: string;
    ownerUserId: string;
    tokenId: string;
    row: number;
    button: number;
    direction: "push" | "pull";
  }): Promise<Arrangement | null> {
    return this.withFallback({
      operationName: "updateArrangementToken",
      operation: async () => {
        const remote = await this.callMutation<Arrangement | null>("arrangements:updateArrangementToken", input);
        return remote ? ArrangementSchema.parse(remote) : null;
      },
      fallback: () => super.updateArrangementToken(input)
    });
  }

  override async requestLatestExport(input: {
    arrangementId: string;
    correlationId: string;
    ownerUserId: string;
    force?: boolean;
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

  override async listExportsByArrangement(arrangementId: string, ownerUserId: string, limit?: number): Promise<ExportJob[]> {
    return this.withFallback({
      operationName: "listExportsByArrangement",
      operation: async () => {
        const remote = await this.callQuery<ExportJob[]>("exports:listExportsByArrangement", {
          arrangementId,
          ownerUserId,
          limit
        });
        return remote.map((entry) => ExportJobSchema.parse(entry));
      },
      fallback: () => super.listExportsByArrangement(arrangementId, ownerUserId, limit)
    });
  }
}

const env = getWebEnv();

function allowConvexFallback(input: WebEnv): boolean {
  if (input.CONVEX_DEPLOYMENT !== "local-dev") {
    return false;
  }

  return input.NODE_ENV === "development" || input.PILOT_MODE === "true";
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
