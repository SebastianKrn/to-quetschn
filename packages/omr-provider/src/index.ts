import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { OmrProvider, OmrScore } from "@grifftab/domain-types";

const execFileAsync = promisify(execFile);

export interface AudiverisProviderOptions {
  binPath: string;
  timeoutMs: number;
}

export class AudiverisOmrProvider implements OmrProvider {
  constructor(private readonly options: AudiverisProviderOptions) {}

  async extractScore(input: {
    sourceFilePath: string;
    correlationId?: string;
  }): Promise<OmrScore> {
    try {
      await execFileAsync(this.options.binPath, ["-batch", input.sourceFilePath], {
        timeout: this.options.timeoutMs
      });
    } catch {
      // Foundation stub: keep deterministic fallback while CLI parser is pending.
    }

    return {
      title: "OMR Stub Result",
      tempoBpm: 80,
      timeSignature: "4/4",
      notes: []
    };
  }
}
