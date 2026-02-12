import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { OmrProvider, OmrScore } from "@grifftab/domain-types";
import { createOmrError, OmrProviderError } from "./errors.js";
import { normalizeAudiverisOutput } from "./normalize.js";

const execFileAsync = promisify(execFile);

export interface AudiverisProviderOptions {
  binPath: string;
  timeoutMs: number;
}

function mapExecError(
  error: unknown,
  input: {
    sourceFilePath: string;
    timeoutMs: number;
  }
): OmrProviderError {
  const err = error as NodeJS.ErrnoException & {
    killed?: boolean;
    signal?: NodeJS.Signals;
  };

  if (err.code === "ENOENT") {
    return createOmrError({
      code: "OMR_UNAVAILABLE",
      message: "Audiveris binary not found",
      retryable: true,
      details: { sourceFilePath: input.sourceFilePath }
    });
  }

  if (err.signal === "SIGTERM" || err.killed === true) {
    return createOmrError({
      code: "OMR_TIMEOUT",
      message: `Audiveris timed out after ${input.timeoutMs}ms`,
      retryable: true,
      details: { sourceFilePath: input.sourceFilePath }
    });
  }

  return createOmrError({
    code: "OMR_UNAVAILABLE",
    message: "Audiveris execution failed",
    retryable: true,
    details: {
      sourceFilePath: input.sourceFilePath,
      error: err.message
    },
    cause: error
  });
}

function candidateAudiverisOutputs(sourceFilePath: string): string[] {
  const parsed = path.parse(sourceFilePath);
  const baseWithoutExt = path.join(parsed.dir, parsed.name);
  const nestedBase = path.join(parsed.dir, parsed.name, parsed.name);
  const suffixes = [".musicxml", ".xml", ".mxl"];

  const paths = new Set<string>();
  for (const suffix of suffixes) {
    paths.add(`${baseWithoutExt}${suffix}`);
    paths.add(`${nestedBase}${suffix}`);
  }

  return Array.from(paths);
}

async function readFirstExistingAudiverisOutput(sourceFilePath: string): Promise<{
  artifactPath: string;
  content: string;
} | null> {
  const candidates = candidateAudiverisOutputs(sourceFilePath);
  for (const artifactPath of candidates) {
    try {
      const content = await fs.readFile(artifactPath, "utf8");
      if (content.trim().length > 0) {
        return {
          artifactPath,
          content
        };
      }
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        continue;
      }

      throw createOmrError({
        code: "OMR_UNAVAILABLE",
        message: "Unable to read Audiveris export artifact",
        retryable: true,
        details: {
          sourceFilePath,
          artifactPath,
          error: nodeError.message
        },
        cause: error
      });
    }
  }

  return null;
}

export class AudiverisOmrProvider implements OmrProvider {
  constructor(private readonly options: AudiverisProviderOptions) {}

  async extractScore(input: {
    sourceFilePath: string;
    correlationId?: string;
  }): Promise<OmrScore> {
    if (!input.sourceFilePath || !input.sourceFilePath.toLowerCase().endsWith(".pdf")) {
      throw createOmrError({
        code: "OMR_INPUT_INVALID",
        message: "OMR input must reference a PDF file path",
        retryable: false,
        details: {
          sourceFilePath: input.sourceFilePath
        }
      });
    }

    try {
      const { stdout, stderr } = await execFileAsync(
        this.options.binPath,
        ["-batch", "-export", input.sourceFilePath],
        {
          timeout: this.options.timeoutMs,
          maxBuffer: 10 * 1024 * 1024
        }
      );

      const artifact = await readFirstExistingAudiverisOutput(input.sourceFilePath);
      if (artifact) {
        try {
          return normalizeAudiverisOutput({
            stdout: artifact.content,
            sourceFilePath: input.sourceFilePath,
            inputSource: artifact.artifactPath
          });
        } catch (error) {
          if (!(error instanceof OmrProviderError) || error.code !== "OMR_PARSE_FAILED") {
            throw error;
          }
        }
      }

      return normalizeAudiverisOutput({
        stdout: stdout || stderr,
        sourceFilePath: input.sourceFilePath,
        inputSource: "stdout"
      });
    } catch (error) {
      if (error instanceof OmrProviderError) {
        throw error;
      }

      throw mapExecError(error, {
        sourceFilePath: input.sourceFilePath,
        timeoutMs: this.options.timeoutMs
      });
    }
  }
}

export { normalizeAudiverisOutput, normalizeAudiverisOutputDetailed } from "./normalize.js";
export { OmrProviderError } from "./errors.js";
