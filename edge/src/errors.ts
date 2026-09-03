/** The ONE error envelope (Consistency Conventions, contracts/errors/envelope.json). */
export type ErrorCode =
  | 'unauthenticated' | 'forbidden' | 'not_found'
  | 'validation_failed' | 'conflict' | 'upstream_unavailable' | 'internal';

export interface ErrorEnvelope {
  code: ErrorCode;
  messageKey: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

const RETRYABLE: ReadonlySet<ErrorCode> = new Set(['upstream_unavailable', 'internal']);

export const envelope = (code: ErrorCode, details?: Record<string, unknown>): ErrorEnvelope => ({
  code,
  messageKey: `error.${code}`,
  retryable: RETRYABLE.has(code),
  ...(details ? { details } : {}),
});

export const statusFor = (code: ErrorCode): number => ({
  unauthenticated: 401, forbidden: 403, not_found: 404, validation_failed: 400,
  conflict: 409, upstream_unavailable: 503, internal: 500,
}[code]);
