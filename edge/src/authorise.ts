import type { IncomingMessage } from 'node:http';
import type { PoolClient } from 'pg';
import { ALL_PERMISSIONS, type CredentialType, type Permission } from '../../core/src/staff/roles';
import {
  resolveSession, switchableProperties, Unauthenticated,
  type SessionView, type TokenClaims,
} from '../../app/src/staff/sessions';
import { decodeSessionToken } from './session-token';
import { resolveFixtureClaims } from './auth';

/**
 * THE SINGLE SERVER-SIDE DECISION POINT (Story 1.3 T4, AD-11).
 *
 * "Implement authorisation as a single server-side decision point that the interface
 * queries, so there is exactly one place where a permission question is answered. Two
 * answers is how a hidden button becomes a security bug."
 *
 * `GET /v1/auth/session` serves the same function to the interface, from the same
 * code path, so what the console renders and what the server enforces cannot disagree
 * - they are the same array.
 *
 * Nothing here caches. Grants are read per request for the token's Property, which is
 * what makes AC-3's re-resolution structural instead of something a handler has to
 * remember to do.
 */

export type PrincipalKind = 'session' | 'fixture';

export interface CellPrincipal {
  kind: PrincipalKind;
  sessionId: string;
  tenantId: string;
  /** Absent for a Tenant-scoped session: FR-1's first administrator, before any Property exists. */
  propertyId?: string;
  staffMemberId: string;
  credentialType: CredentialType;
  languageTag: string;
}

/**
 * A real session token first, then Story 1.0's fixture stub. The order does not
 * matter for correctness - the two formats cannot be confused, because a session
 * token carries an audience and the fixture verifier refuses any token that has one -
 * but it puts the real path first so that the stub is what falls away in Story 1.5.
 */
export function resolveCellPrincipal(
  authorization: string | undefined, now: Date,
): CellPrincipal | undefined {
  const session = decodeSessionToken(authorization, now);
  if (session) {
    return {
      kind: 'session',
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      ...(session.propertyId ? { propertyId: session.propertyId } : {}),
      staffMemberId: session.staffMemberId,
      credentialType: session.credentialType,
      languageTag: session.languageTag,
    };
  }
  const fixture = resolveFixtureClaims(authorization);
  if (!fixture) return undefined;
  return {
    kind: 'fixture',
    sessionId: 'fixture',
    tenantId: fixture.tenantId,
    ...(fixture.propertyId ? { propertyId: fixture.propertyId } : {}),
    staffMemberId: fixture.staffMemberId ?? 'fixture',
    credentialType: 'fixture',
    languageTag: 'en',
  };
}

export const toClaims = (p: CellPrincipal): TokenClaims => ({
  sessionId: p.sessionId,
  tenantId: p.tenantId,
  ...(p.propertyId ? { propertyId: p.propertyId } : {}),
  staffMemberId: p.staffMemberId,
  credentialType: p.credentialType,
  languageTag: p.languageTag,
});

/**
 * The session as the server sees it, for a real credential or for the fixture stub.
 *
 * The fixture branch holds EVERY permission, and that is stated out loud rather than
 * hidden: the stub is a total authentication bypass already - anyone with the secret
 * mints any scope - so withholding permissions from it would add no security while
 * making the isolation gate pass for the wrong reason. It exists only when
 * `FIXTURE_AUTH=1`, `credentialType: 'fixture'` appears in the session response so a
 * misconfigured environment is visible from the outside, and Story 1.5 removes it.
 */
export async function sessionFor(
  client: PoolClient, principal: CellPrincipal, now: Date,
): Promise<SessionView> {
  if (principal.kind === 'session') return resolveSession(client, toClaims(principal), now);

  const region = principal.propertyId
    ? (await client.query<{ region: string }>(
      'SELECT region FROM control_plane.properties WHERE id = $1 AND tenant_id = $2',
      [principal.propertyId, principal.tenantId])).rows[0]?.region
    : undefined;

  return {
    sessionId: 'fixture',
    staffMemberId: principal.staffMemberId,
    displayName: 'Story 1.0 fixture principal',
    tenantId: principal.tenantId,
    ...(principal.propertyId ? { propertyId: principal.propertyId } : {}),
    ...(region ? { region } : {}),
    credentialType: 'fixture',
    languageTag: principal.languageTag,
    permissions: [...ALL_PERMISSIONS],
    switchableProperties: await switchableProperties(client, principal.tenantId, principal.staffMemberId),
    // The stub's tokens are not time-limited; reporting the request time keeps the
    // shape honest rather than inventing a lifetime it does not have.
    expiresAt: now.toISOString(),
  };
}

export type Denial =
  | { deny: 'unauthenticated'; reason: string }
  | { deny: 'forbidden'; reason: string }
  | { deny: 'needs_property'; reason: string };

export interface Granted { session: SessionView }

/**
 * Ask the one question. Returns the session on success so a handler never has to
 * resolve it a second time, and a typed denial otherwise so the edge maps each to a
 * status in exactly one place.
 */
export async function decide(
  client: PoolClient, principal: CellPrincipal, permission: Permission, now: Date,
): Promise<Granted | Denial> {
  let session: SessionView;
  try {
    session = await sessionFor(client, principal, now);
  } catch (err) {
    if (err instanceof Unauthenticated) return { deny: 'unauthenticated', reason: err.message };
    throw err;
  }
  if (!session.permissions.includes(permission)) {
    // ONE refusal for two different causes, on purpose. A Property-scoped
    // administrator who lacks a Tenant-wide permission and a room attendant who lacks
    // it entirely get the same answer, because telling them apart would describe the
    // permission model to whoever is probing it.
    return {
      deny: 'forbidden',
      reason: session.propertyId
        ? `this action needs ${permission}, which your role at this Property does not carry`
        : `this action needs ${permission}, which your Tenant-wide role does not carry`,
    };
  }
  return { session };
}

/** The client's own IP, for the rate limiter. Never stored, never logged with a staff id. */
export const sourceOf = (req: IncomingMessage): string => req.socket.remoteAddress ?? 'unknown';
