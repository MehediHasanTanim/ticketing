/**
 * ULID - sortable by creation, safe in URLs (Consistency Conventions).
 * Implemented here rather than taken as a dependency because core/ has no
 * npm dependencies at all (the boundary lint enforces that).
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32, no I L O U

function encodeTime(ms: number, len: number): string {
  let out = '';
  for (let i = len - 1; i >= 0; i--) {
    const mod = ms % 32;
    out = ALPHABET[mod] + out;
    ms = (ms - mod) / 32;
  }
  return out;
}

function encodeRandom(len: number, rand: () => number): string {
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(rand() * 32)];
  return out;
}

export function ulid(now: Date, rand: () => number = Math.random): string {
  return encodeTime(now.getTime(), 10) + encodeRandom(16, rand);
}
