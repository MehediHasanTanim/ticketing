import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

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
