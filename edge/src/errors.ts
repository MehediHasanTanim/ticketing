/**
 * The ONE error envelope (Consistency Conventions, contracts/errors/envelope.json).
 *
 * `ErrorCode` is IMPORTED from the generated binding, not re-declared here. It used
 * to be a hand-written union that happened to match, which meant adding a code to
 * the envelope needed two edits and only one of them was gated. `STATUS` and
 * `RETRYABLE` below are `Record<ErrorCode, ...>`, so a code added to contracts/
 * without a status or a retry decision is now a COMPILE error rather than an
 * `undefined` status line written into a response header.
 */
import { type ErrorCode } from '../../contracts/generated/ts/errors';

export type { ErrorCode };

export interface ErrorEnvelope {
  code: ErrorCode;
  messageKey: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * `too_many_attempts` is retryable AFTER A WAIT - the caller reads
 * `details.retryAfterSeconds`. `not_implemented` never is: retrying does not build
 * the feature, and a retryable 501 would have clients spinning against an endpoint
 * that is months away.
 */
const RETRYABLE: Record<ErrorCode, boolean> = {
  unauthenticated: false,
  forbidden: false,
  not_found: false,
  validation_failed: false,
  conflict: false,
  too_many_attempts: true,
  upstream_unavailable: true,
  not_implemented: false,
  internal: true,
};

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 400,
  conflict: 409,
  too_many_attempts: 429,
  upstream_unavailable: 503,
  not_implemented: 501,
  internal: 500,
};

export const envelope = (code: ErrorCode, details?: Record<string, unknown>): ErrorEnvelope => ({
  code,
  messageKey: `error.${code}`,
  retryable: RETRYABLE[code],
  ...(details ? { details } : {}),
});

export const statusFor = (code: ErrorCode): number => STATUS[code];
