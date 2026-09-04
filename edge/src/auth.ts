import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Scope, TenantScope } from '../../core/src/tenancy';
import { asTenantId, asPropertyId, asStaffMemberId } from '../../core/src/tenancy';

/**
 * FIXTURE AUTH STUB - Story 1.0 only, and gated behind FIXTURE_AUTH=1 so it cannot
 * ship enabled.
 *
 * The cross-tenant isolation gate has to present "Tenant A's session" before any
 * identity provider exists. What is under test is the TENANCY RESOLUTION BOUNDARY
 * below, not the credential. Story 1.3 brings PIN credentials and Story 1.5 brings
 * the Tenant identity provider; Story 1.5 REMOVES this file's production path.
 */
export interface Principal extends Scope {}

/**
 * Required whenever the stub is switched on. It used to fall back to a constant,
 * which is published now that the repository is public - so a deployment that set
 * `FIXTURE_AUTH=1` without a secret would accept tokens anyone could mint. The stub
 * must never be on outside local and CI, and this makes "on without a secret"
 * refuse rather than pretend.
 */
const MIN_SECRET_LENGTH = 24;

const secret = (): string => {
  const v = process.env.FIXTURE_AUTH_SECRET;
  if (!v || v.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `FIXTURE_AUTH=1 requires FIXTURE_AUTH_SECRET of at least ${MIN_SECRET_LENGTH} `
      + 'characters. The fixture stub is Story 1.0 only and must never be enabled '
      + 'outside local and CI; there is no fallback secret.');
  }
  return v;
};

/** Boot-time check, so `FIXTURE_AUTH=1` without a secret refuses to start. */
export const fixtureSecretOrThrow = (): string => secret();

export function mintFixtureToken(p: { tenantId: string; propertyId?: string; staffMemberId?: string }): string {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * Decodes and verifies, and says nothing about scope. Both resolvers below build on
 * it so that the signature check exists once.
 */
function verified(authorization: string | undefined): { tenantId?: string; propertyId?: string; staffMemberId?: string } | undefined {
  if (process.env.FIXTURE_AUTH !== '1') return undefined;
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const token = authorization.slice('Bearer '.length);
  const [body, sig] = token.split('.');
  if (!body || !sig) return undefined;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      tenantId?: string; propertyId?: string; staffMemberId?: string; aud?: string };
    // Story 11.1 AC-2: an operator credential is refused at a cell. A different
    // signing secret already breaks the signature; this survives the two secrets
    // being misconfigured alike.
    if (p.aud) return undefined;
    return p;
  } catch { return undefined; }
}

/**
 * TENANT-SCOPED, for the one operation that has no Property yet: creating the first
 * one (Story 1.2). Returns a `TenantScope`, which is NOT assignable where a `Scope`
 * is required - so this cannot be handed to `withScope` or to any Property-scoped
 * handler, and a token carrying a Property is still fine here because a tenant
 * administrator who happens to be scoped somewhere can still create a Property.
 *
 * What it must never become is a way to reach Property data without a Property: the
 * isolation gate asserts a Tenant-scoped token reads nothing from a cell table.
 */
export function resolveTenantPrincipal(authorization: string | undefined): TenantScope | undefined {
  const p = verified(authorization);
  if (!p?.tenantId) return undefined;
  return {
    tenantId: asTenantId(p.tenantId),
    ...(p.staffMemberId ? { staffMemberId: asStaffMemberId(p.staffMemberId) } : {}),
  };
}

export function resolvePrincipal(authorization: string | undefined): Principal | undefined {
  const p = verified(authorization);
  // STILL DEMANDS BOTH. Story 1.2 added a Tenant-scoped path; it did not soften
  // this one, and a token with no Property is simply not a cell principal.
  if (!p?.tenantId || !p.propertyId) return undefined;
  return {
    tenantId: asTenantId(p.tenantId),
    propertyId: asPropertyId(p.propertyId),
    ...(p.staffMemberId ? { staffMemberId: asStaffMemberId(p.staffMemberId) } : {}),
  };
}
