import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Credential hashing, in `adapters/` because two callers need it and neither should
 * reach into the other: `edge/` verifies at sign-in and `ops/` seeds the bootstrap
 * operator at deploy time (Stories 11.1, 11.2). scrypt from node:crypto rather than
 * a dependency - one fewer thing to keep patched inside an image.
 */

const SCRYPT_KEYLEN = 64;
/** Node's own defaults, stated rather than implied so a future change is visible. */
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

export function hashCredential(plaintext: string): { hash: Buffer; salt: Buffer } {
  const salt = randomBytes(32);
  return { hash: scryptSync(plaintext, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS), salt };
}

export function verifyCredential(plaintext: string, hash: Buffer, salt: Buffer): boolean {
  const candidate = scryptSync(plaintext, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return candidate.length === hash.length && timingSafeEqual(candidate, hash);
}

/**
 * A PIN, for the Shared Device account Story 1.3 creates when an invitation carries
 * no email address. `randomInt` and not `Math.random`: this is a credential, and a
 * predictable one on a handset in a corridor is no credential at all.
 *
 * Uniform over the whole range including leading zeros, so "003914" is as likely as
 * any other value - trimming leading zeros would quietly shrink the space.
 */
export function generatePin(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += String(randomInt(0, 10));
  return out;
}

/**
 * A one-time token for an invitation or a password reset. 32 bytes, base64url, so it
 * survives a URL fragment untouched. Only its sha256 is ever stored (Story 1.1 set
 * that shape; this is the same one), and it travels in a FRAGMENT rather than a query
 * string so it reaches no access log and no Referer header.
 */
export const generateOneTimeToken = (): string => randomBytes(32).toString('base64url');

/** The stored form of a one-time token. Irreversible, so a leaked row is not a credential. */
export const hashOneTimeToken = (token: string): Buffer =>
  createHash('sha256').update(token).digest();
