import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { OmrProvider, OmrScore } from "@grifftab/domain-types";
import { createOmrError } from "./errors.js";
import { normalizeAudiverisOutput } from "./normalize.js";

export interface ReplayOmrProviderOptions {
  manifestPath: string;
}

interface ReplayManifest {
  version: string;
  entries: Array<{
    checksumSha256: string;
    normalizedInput: string;
    label?: string;
  }>;
}

interface ResolvedReplayEntry {
  checksumSha256: string;
  normalizedInputPath: string;
  label?: string;
}

function isManifest(value: unknown): value is ReplayManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const manifest = value as ReplayManifest;
  if (typeof manifest.version !== "string" || !Array.isArray(manifest.entries)) {
    return false;
  }

  return manifest.entries.every((entry) => {
    return (
      entry &&
      typeof entry === "object" &&
      typeof entry.checksumSha256 === "string" &&
      entry.checksumSha256.length > 0 &&
      typeof entry.normalizedInput === "string" &&
      entry.normalizedInput.length > 0 &&
      (entry.label === undefined || typeof entry.label === "string")
    );
  });
}

export class ReplayOmrProvider implements OmrProvider {
  private resolvedEntries: Map<string, ResolvedReplayEntry> | null = null;

  constructor(private readonly options: ReplayOmrProviderOptions) {}

  private async loadManifest(): Promise<Map<string, ResolvedReplayEntry>> {
    if (this.resolvedEntries) {
      return this.resolvedEntries;
    }

    const manifestPath = path.isAbsolute(this.options.manifestPath)
      ? this.options.manifestPath
      : path.resolve(process.cwd(), this.options.manifestPath);

    let manifestRaw: string;
    try {
      manifestRaw = await fs.readFile(manifestPath, "utf8");
    } catch (error) {
      throw createOmrError({
        code: "OMR_UNAVAILABLE",
        message: "Replay OMR manifest is not readable",
        retryable: true,
        details: {
          manifestPath
        },
        cause: error
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(manifestRaw);
    } catch (error) {
      throw createOmrError({
        code: "OMR_PARSE_FAILED",
        message: "Replay OMR manifest contains invalid JSON",
        retryable: false,
        details: {
          manifestPath
        },
        cause: error
      });
    }

    if (!isManifest(parsed)) {
      throw createOmrError({
        code: "OMR_PARSE_FAILED",
        message: "Replay OMR manifest has invalid shape",
        retryable: false,
        details: {
          manifestPath
        }
      });
    }

    const baseDir = path.dirname(manifestPath);
    const resolved = new Map<string, ResolvedReplayEntry>();
    for (const entry of parsed.entries) {
      resolved.set(entry.checksumSha256.toLowerCase(), {
        checksumSha256: entry.checksumSha256.toLowerCase(),
        normalizedInputPath: path.isAbsolute(entry.normalizedInput)
          ? entry.normalizedInput
          : path.resolve(baseDir, entry.normalizedInput),
        label: entry.label
      });
    }

    this.resolvedEntries = resolved;
    return resolved;
  }

  private async checksumFile(inputPath: string): Promise<string> {
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(inputPath);
    } catch (error) {
      throw createOmrError({
        code: "OMR_UNAVAILABLE",
        message: "Replay OMR input file is not readable",
        retryable: true,
        details: {
          sourceFilePath: inputPath
        },
        cause: error
      });
    }

    return createHash("sha256").update(buffer).digest("hex");
  }

  async extractScore(input: {
    sourceFilePath: string;
    correlationId?: string;
  }): Promise<OmrScore> {
    if (!input.sourceFilePath || !input.sourceFilePath.toLowerCase().endsWith(".pdf")) {
      throw createOmrError({
        code: "OMR_INPUT_INVALID",
        message: "Replay OMR input must reference a PDF file path",
        retryable: false,
        details: {
          sourceFilePath: input.sourceFilePath
        }
      });
    }

    const manifest = await this.loadManifest();
    const checksum = await this.checksumFile(input.sourceFilePath);
    const replay = manifest.get(checksum);

    if (!replay) {
      throw createOmrError({
        code: "OMR_INPUT_INVALID",
        message: "No replay fixture found for PDF checksum",
        retryable: false,
        details: {
          sourceFilePath: input.sourceFilePath,
          checksumSha256: checksum
        }
      });
    }

    let normalizedRaw: string;
    try {
      normalizedRaw = await fs.readFile(replay.normalizedInputPath, "utf8");
    } catch (error) {
      throw createOmrError({
        code: "OMR_UNAVAILABLE",
        message: "Replay fixture input is not readable",
        retryable: true,
        details: {
          sourceFilePath: input.sourceFilePath,
          normalizedInputPath: replay.normalizedInputPath
        },
        cause: error
      });
    }

    return normalizeAudiverisOutput({
      stdout: normalizedRaw,
      sourceFilePath: input.sourceFilePath,
      inputSource: replay.normalizedInputPath
    });
  }
}
