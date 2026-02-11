import type { OmrErrorCode } from "@grifftab/domain-types";

export class OmrProviderError extends Error {
  readonly code: OmrErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, string>;

  constructor(input: {
    code: OmrErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, string>;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "OmrProviderError";
    this.code = input.code;
    this.retryable = input.retryable;
    this.details = input.details;
  }
}

export function createOmrError(input: {
  code: OmrErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, string>;
  cause?: unknown;
}): OmrProviderError {
  return new OmrProviderError(input);
}
