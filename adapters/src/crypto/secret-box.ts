import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM, for the ONE value in this system that must be stored recoverably.
 *
 * Everything else - invitations, password resets, refresh tokens - is hashed, because
 * we only ever need to COMPARE it. A provider's upstream refresh token is different: we
 * have to PRESENT it back to the provider at every one of our token refreshes, which is
 * the mechanism behind FR-3's "access is lost at next token validation". A hash cannot
 * be presented, so it is encrypted instead, and the difference is stated here so nobody
 * later "tidies" this into a hash and quietly breaks deprovisioning.
 *
 * GCM rather than CBC: it authenticates as well as encrypts, so a tampered ciphertext
 * fails to open rather than decrypting to something. The nonce is random per message and
 * stored beside it; the 16-byte tag is appended to the ciphertext.
 */

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const MIN_KEY_LENGTH = 32;

/**
 * FAILS CLOSED, like every other secret in this codebase. A default here would be an
 * encryption key published in the source, which is not encryption.
 */
const key = (): Buffer => {
  const v = process.env.UPSTREAM_TOKEN_KEY;
  if (!v || v.length < MIN_KEY_LENGTH) {
    throw new Error(
      `UPSTREAM_TOKEN_KEY is required and must be at least ${MIN_KEY_LENGTH} characters. `
      + 'It encrypts the identity provider refresh tokens that make deprovisioning take '
      + 'effect (Story 1.5, FR-3); there is deliberately no fallback. Generate one with '
      + '`openssl rand -base64 32` and supply it from the platform secret store.');
  }
  // A 32-byte key derived from the configured value, so an operator supplying a
  // base64 string of any reasonable length gets a valid AES key rather than an error
  // about byte lengths they cannot act on.
  return createHash('sha256').update(v).digest();
};

/** Boot-time check, so a missing key stops the process rather than the first sign-in. */
export const upstreamTokenKeyOrThrow = (): Buffer => key();

export function seal(plaintext: string): { ciphertext: Buffer; nonce: Buffer } {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), nonce);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { ciphertext: Buffer.concat([body, cipher.getAuthTag()]), nonce };
}

/** Returns undefined rather than throwing when the ciphertext will not authenticate. */
export function open(ciphertext: Buffer, nonce: Buffer): string | undefined {
  try {
    if (ciphertext.length <= TAG_BYTES) return undefined;
    const body = ciphertext.subarray(0, ciphertext.length - TAG_BYTES);
    const tag = ciphertext.subarray(ciphertext.length - TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, key(), nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
  } catch {
    // A key rotation, a corrupted row, or tampering. All three mean "we cannot ask the
    // provider about this session", which the caller treats as deprovisioned - failing
    // closed rather than assuming access is still good.
    return undefined;
  }
}
