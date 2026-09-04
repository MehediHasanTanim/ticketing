import { createHmac, timingSafeEqual } from 'node:crypto';
import type { TenantScope, PropertyId, StaffMemberId } from '../../core/src/tenancy';
import { asTenantId, asPropertyId, asStaffMemberId } from '../../core/src/tenancy';
import type { CredentialType } from '../../core/src/staff/roles';

/**
 * REAL SESSION TOKENS (Story 1.3). The first credential in this product that a
 * person can actually obtain: everything before it was either Story 1.0's fixture
 * stub or an operator token on the Jazzware-internal surface.
 *
 * It follows the operator token's shape on purpose, because the reasoning is the
 * same and three separately-invented token formats would be three sets of mistakes:
 *
 *   - its OWN secret, with no fallback, checked at boot;
 *   - its OWN audience, checked on every request, so a token minted for one surface
 *     is refused by the other even if the two secrets were ever set alike;
 *   - the scope INSIDE the signed body (AD-3), never in a header - a scope a header
 *     can change is not a scope, which is why a context switch mints a new token
 *     rather than reinterpreting this one.
 *
 * Liveness is deliberately NOT in here. Revocation, expiry of the session row and a
 * deactivated Staff Member are database questions, answered on every request in
 * app/src/staff/sessions.ts - so a password reset that revokes every other session
 * needs no token blacklist and no sweep.
 */

export const CELL_SESSION_AUDIENCE = 'jazzticketing-cell-session';

const MIN_SECRET_LENGTH = 24;

const tokenSecret = (): string => {
  const v = process.env.SESSION_TOKEN_SECRET;
  if (!v || v.length === 0) {
    throw new Error(
      'SESSION_TOKEN_SECRET is required: a cell signs staff session tokens with it, and '
      + 'there is deliberately no fallback - a default in public source is a signing key '
      + 'everybody has. Set it from the platform secret store (see .env.example).');
  }
  if (v.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_TOKEN_SECRET must be at least ${MIN_SECRET_LENGTH} characters; it is the HMAC `
      + 'key for every staff session in this cell.');
  }
  return v;
};

/** Boot-time check, so a missing secret stops the process rather than the first sign-in. */
export const sessionSecretOrThrow = (): string => tokenSecret();

/**
 * Fifteen minutes. Short because FR-3 makes the access-token lifetime the ACTUAL
 * deprovisioning delay - an identity removed upstream keeps working until its token
 * expires - and ADR 0002 leaves the number to Story 1.5, which builds the refresh
 * that makes a short lifetime bearable. Until then this is the shortest value that
 * does not make a console session useless, and it is stated here rather than spread
 * across handlers.
 */
export const SESSION_TTL_SECONDS = 15 * 60;

/**
 * Eight hours on the session ROW, which is a different thing from the token: the row
 * is the sign-in, the token is a short-lived assertion about it. A context switch
 * mints a new token against the same row, so this is how long someone can keep
 * working without signing in again.
 */
export const SESSION_ROW_TTL_MS = 8 * 60 * 60 * 1000;

interface TokenBody {
  aud: string;
  /** The session row this token speaks for. */
  sid: string;
  tid: string;
  /**
   * ABSENT for a Tenant-scoped session - the FR-1 case where a Tenant's first
   * administrator signs in before any Property exists. Present for everything else,
   * because AD-3 wants the scope inside the signed body rather than in a header.
   */
  pid?: string;
  smid: string;
  ct: CredentialType;
  lang: string;
  exp: number;
}

const sign = (body: string): string =>
  createHmac('sha256', tokenSecret()).update(body).digest('base64url');

/**
 * A verified session token, which may be TENANT-scoped or PROPERTY-scoped. It extends
 * `TenantScope` and not `Scope` on purpose: the type system then refuses to hand a
 * Tenant-scoped session to `withScope` or to a Property-scoped handler, exactly as it
 * has since Story 1.2, and the narrowing has to be done explicitly.
 */
export interface SessionPrincipal extends TenantScope {
  sessionId: string;
  propertyId?: PropertyId;
  /**
   * REQUIRED here, unlike on `TenantScope` where Story 1.0's fixture scopes could
   * omit it. A real session always belongs to a Staff Member: there is no way to
   * obtain one without being one.
   */
  staffMemberId: StaffMemberId;
  credentialType: CredentialType;
  languageTag: string;
}

export function mintSessionToken(p: {
  sessionId: string;
  tenantId: string;
  /** Omitted for a Tenant-scoped session (FR-1's first administrator). */
  propertyId?: string;
  staffMemberId: string;
  credentialType: CredentialType;
  languageTag: string;
  now: Date;
}): { accessToken: string; expiresInSeconds: number; expiresAt: Date } {
  const expiresAt = new Date(p.now.getTime() + SESSION_TTL_SECONDS * 1000);
  const body: TokenBody = {
    aud: CELL_SESSION_AUDIENCE,
    sid: p.sessionId,
    tid: p.tenantId,
    ...(p.propertyId ? { pid: p.propertyId } : {}),
    smid: p.staffMemberId,
    ct: p.credentialType,
    lang: p.languageTag,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  return {
    accessToken: `${encoded}.${sign(encoded)}`,
    expiresInSeconds: SESSION_TTL_SECONDS,
    expiresAt,
  };
}

/**
 * Signature, audience, expiry and shape. Says nothing about whether the session is
 * still live or the Staff Member still active - that is the database's answer, and
 * keeping the two apart is what stops a cached "valid token" meaning "valid access".
 */
export function decodeSessionToken(
  authorization: string | undefined, now: Date,
): SessionPrincipal | undefined {
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const [encoded, sig] = authorization.slice('Bearer '.length).split('.');
  if (!encoded || !sig) return undefined;

  const expected = sign(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;

  try {
    const body = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<TokenBody>;
    // The check that survives the two secrets being misconfigured alike, in either
    // direction: an operator token carries the control plane's audience and is
    // refused here, and this one is refused there.
    if (body.aud !== CELL_SESSION_AUDIENCE) return undefined;
    if (!body.sid || !body.tid || !body.smid || !body.ct || !body.lang) return undefined;
    if (typeof body.exp !== 'number' || body.exp * 1000 <= now.getTime()) return undefined;
    // A fixture credential is not something a token can claim to be: it exists only
    // because FIXTURE_AUTH=1 and it is minted by a different function entirely.
    if (body.ct === 'fixture') return undefined;
    return {
      sessionId: body.sid,
      tenantId: asTenantId(body.tid),
      ...(body.pid ? { propertyId: asPropertyId(body.pid) } : {}),
      staffMemberId: asStaffMemberId(body.smid),
      credentialType: body.ct,
      languageTag: body.lang,
    };
  } catch { return undefined; }
}
