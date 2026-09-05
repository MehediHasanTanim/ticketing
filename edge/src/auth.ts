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
export const fixtureStubEnabled = (): boolean =>
  process.env.FIXTURE_AUTH === '1' && process.env.NODE_ENV !== 'production';

function verified(authorization: string | undefined): { tenantId?: string; propertyId?: string; staffMemberId?: string } | undefined {
  // STORY 1.5 REMOVED THE PRODUCTION PATH, which is what its prerequisite note asked
  // for: corporate users now sign in through their Tenant's provider, so the stub is
  // no longer how anybody reaches this product. It survives only as Story 1.0's
  // isolation-gate fixture, and `NODE_ENV=production` now switches it off no matter
  // what `FIXTURE_AUTH` says. `main.ts` refuses to start on that combination as well -
  // two independent refusals, because the one that matters is the one nobody remembers
  // to set.
  if (!fixtureStubEnabled()) return undefined;
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
 * REMOVED IN STORY 1.3, and the removal is the point.
 *
 * This file used to export `resolvePrincipal` and `resolveTenantPrincipal`, and the
 * server called them. Story 1.3 brought real session tokens, so both resolutions now
 * happen in `authorise.ts` - which accepts a real session OR this stub - and the
 * server's own check is what demands a Property (AD-3).
 *
 * Leaving the old pair exported would have been worse than untidy: two negative
 * controls pointed at them, so a gate that used to go red would have kept passing
 * while testing a function nothing served. A dead function a gate still watches is
 * false assurance, which is the one thing worse than no gate. Controls 23 and 28 now
 * exercise the live path.
 */


/**
 * The fixture payload, for the one caller that composes principals (`authorise.ts`).
 * Exported rather than inlining `verified()` there, so the signature check still
 * exists in exactly one place. Returns nothing unless `FIXTURE_AUTH=1`.
 */
export function resolveFixtureClaims(
  authorization: string | undefined,
): { tenantId: string; propertyId?: string; staffMemberId?: string } | undefined {
  const p = verified(authorization);
  if (!p?.tenantId) return undefined;
  return {
    tenantId: p.tenantId,
    ...(p.propertyId ? { propertyId: p.propertyId } : {}),
    ...(p.staffMemberId ? { staffMemberId: p.staffMemberId } : {}),
  };
}
