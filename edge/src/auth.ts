import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Scope } from '@core/tenancy';
import { asTenantId, asPropertyId, asStaffMemberId } from '@core/tenancy';

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

const secret = (): string => process.env.FIXTURE_AUTH_SECRET ?? 'story-1-0-fixture-secret';

export function mintFixtureToken(p: { tenantId: string; propertyId: string; staffMemberId: string }): string {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function resolvePrincipal(authorization: string | undefined): Principal | undefined {
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
      tenantId?: string; propertyId?: string; staffMemberId?: string };
    if (!p.tenantId || !p.propertyId) return undefined;
    return {
      tenantId: asTenantId(p.tenantId),
      propertyId: asPropertyId(p.propertyId),
      ...(p.staffMemberId ? { staffMemberId: asStaffMemberId(p.staffMemberId) } : {}),
    };
  } catch { return undefined; }
}
