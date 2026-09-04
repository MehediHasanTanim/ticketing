/**
 * A fixed-window counter for the endpoints anyone can call (Story 1.3).
 *
 * WHAT THIS IS AND IS NOT, said plainly because the difference matters. The contract
 * documents 429 with `details.retryAfterSeconds` on sign-in, credential set-up,
 * forgot and reset, so the choice was between something real and nothing. This is
 * something real, and it is PER PROCESS: run two cell replicas and the effective
 * limit doubles. That is a weaker control than it looks, and it is deliberately not
 * dressed up as a strong one.
 *
 * A durable limiter belongs with the PIN lockout policy, which ADR 0002 records as an
 * open question with no owner: no FR states a threshold, a window or a lockout
 * duration, and on a shared handset that trades a real security control against a
 * room attendant locked out mid-shift. Redis is already a dependency of this cell,
 * so the implementation is small once somebody decides the numbers.
 *
 * Until then: enough to make credential stuffing expensive from one source, honest
 * about what it does not do, and with no cross-request state beyond counters keyed by
 * a caller-supplied string - never by anything that identifies a guest.
 */

interface Window { count: number; resetAt: number }

const windows = new Map<string, Window>();

/** Keeps the map from growing without bound in a long-lived process. */
const sweep = (now: number): void => {
  if (windows.size < 4096) return;
  for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
};

export interface Limit { max: number; windowMs: number }

/**
 * Per address AND per source, as the contract says. Both are needed: per-address
 * alone lets one source spray a dictionary across many addresses, and per-source
 * alone lets a botnet hammer one address.
 */
export const LIMITS = {
  signIn: { max: 10, windowMs: 5 * 60 * 1000 },
  credentialSetUp: { max: 10, windowMs: 5 * 60 * 1000 },
  passwordForgot: { max: 5, windowMs: 15 * 60 * 1000 },
  passwordReset: { max: 10, windowMs: 15 * 60 * 1000 },
} as const satisfies Record<string, Limit>;

export interface Verdict { allowed: boolean; retryAfterSeconds: number }

export function consume(key: string, limit: Limit, now: Date): Verdict {
  const t = now.getTime();
  sweep(t);
  const existing = windows.get(key);
  if (!existing || existing.resetAt <= t) {
    windows.set(key, { count: 1, resetAt: t + limit.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  if (existing.count > limit.max) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - t) / 1000)) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Tests only: the counters are process state, and a suite must be able to start clean. */
export const resetLimiter = (): void => windows.clear();
