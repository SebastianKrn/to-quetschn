import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { OmrProvider, OmrScore } from "@grifftab/domain-types";
import { createOmrError, OmrProviderError } from "./errors.js";
import { normalizeAudiverisOutput } from "./normalize.js";

const execFileAsync = promisify(execFile);

export interface AudiverisProviderOptions {
  binPath: string;
  timeoutMs: number;
}

function mapExecError(error: unknown, input: {
  sourceFilePath: string;
  timeoutMs: number;
}): OmrProviderError {
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

      return normalizeAudiverisOutput({
        stdout: stdout || stderr,
        sourceFilePath: input.sourceFilePath
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

export { OmrProviderError } from "./errors.js";
