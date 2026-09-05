import type { PoolClient } from 'pg';
import { createHash } from 'node:crypto';
import { safeReturnTo, SAML_UNAVAILABLE_REASON } from '../../../core/src/identity/connection';
import type { AuthenticatedSubject, ConnectionDescriptor, IdentityProviderPort } from '../../../core/src/ports/identity';
import { ulid } from '../../../core/src/ids';
import { hashOneTimeToken } from '../../../adapters/src/crypto/credential';
import { seal, open as unseal } from '../../../adapters/src/crypto/secret-box';
import { resolveSecret, SecretUnavailable } from '../../../adapters/src/identity/secret-store';
import {
  openSession, issueRefreshToken, revokeSessions, sessionRowTtlMs,
  Unauthenticated, Forbidden, type SessionFacts,
} from '../staff/sessions';
import { appendStaffEvent } from '../staff/sessions';
import { appendTenantAudit } from '../tenant/provision-tenant';
import type { ConnectionRow } from './connect';

/**
 * SIGNING IN THROUGH A PROVIDER, AND STAYING SIGNED IN (Story 1.5, AC-1, AC-2).
 *
 * Everything protocol-shaped is in `adapters/identity`; this file is the transaction,
 * the mapping and the two decisions the domain actually makes:
 *
 *   - **authentication is not authorisation.** An identity that verifies but matches no
 *     provisioned Staff Member gets `forbidden` and NO SESSION when just-in-time
 *     provisioning is off - which is the default and, per FR-83, the only default;
 *   - **upstream state is re-checked at every refresh**, which is what makes "access is
 *     lost at next token validation, without a manual step" true rather than aspirational.
 */

/** Ten minutes: long enough to sign in, short enough that an abandoned state expires. */
const STATE_TTL_MS = 10 * 60 * 1000;

export class SsoUnavailable extends Error {}

/**
 * ONE ANSWER for an unknown Tenant, a Tenant with no connection, and an inactive one.
 * A response that differs would let anybody enumerate which hotels are customers and
 * which of them use SSO.
 */
const UNAVAILABLE = 'sign-in through an identity provider is not available for that Tenant';

const redirectUri = (): string => {
  const v = process.env.SSO_REDIRECT_URI;
  if (!v) {
    throw new SsoUnavailable(
      'SSO_REDIRECT_URI is not configured. It is the console URL the provider redirects '
      + 'to after authenticating, and it must match what is registered with the provider '
      + 'exactly - so it is configuration rather than something this server can infer '
      + 'from a request, which an attacker controls.');
  }
  return v;
};

const descriptorFor = (row: ConnectionRow): ConnectionDescriptor => ({
  protocol: row.protocol,
  issuer: row.issuer,
  clientId: row.client_id,
  // Resolved AT THE MOMENT OF USE from the platform secret store. It is not stored
  // beside the connection, not returned by any read, and not in any log line.
  clientSecret: resolveSecret(row.client_secret_ref),
  redirectUri: redirectUri(),
});

async function activeConnection(
  client: PoolClient, tenantId: string,
): Promise<ConnectionRow | undefined> {
  const res = await client.query<ConnectionRow>(
    'SELECT * FROM control_plane.identity_connections WHERE tenant_id = $1 AND active', [tenantId]);
  return res.rows[0];
}

// ------------------------------------------------------------------- the start leg

export async function handleSsoStart(
  client: PoolClient,
  provider: IdentityProviderPort,
  query: { tenantSlug: string; returnTo?: string },
  now: Date,
): Promise<{ location: string }> {
  const tenant = await client.query<{ id: string; active: boolean }>(
    'SELECT id, active FROM control_plane.tenants WHERE slug = $1', [query.tenantSlug]);
  const row = tenant.rows[0];
  if (!row || !row.active) throw new SsoUnavailable(UNAVAILABLE);

  const connection = await activeConnection(client, row.id);
  if (!connection) throw new SsoUnavailable(UNAVAILABLE);
  if (connection.protocol !== 'oidc') throw new SsoUnavailable(SAML_UNAVAILABLE_REASON);

  const request = await provider.begin(descriptorFor(connection), now);

  // THE STATE'S HASH IS THE KEY. A row an attacker can read must not contain a usable
  // value, and the PKCE verifier stored beside it must never reach the browser - that
  // is precisely what stops an intercepted authorisation code being exchanged.
  await client.query(
    `INSERT INTO control_plane.sso_states
       (state_hash, tenant_id, code_verifier, nonce, return_to, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [hashOneTimeToken(request.state), row.id, request.codeVerifier, request.nonce,
     safeReturnTo(query.returnTo) ?? null, now.toISOString(),
     new Date(now.getTime() + STATE_TTL_MS).toISOString()]);

  return { location: request.url };
}

// ---------------------------------------------------------------- the callback leg

/**
 * A REFUSAL IS A RESULT, NOT AN EXCEPTION - and that distinction is load-bearing here
 * rather than stylistic.
 *
 * Every refusal on these two paths has SIDE EFFECTS THAT MUST SURVIVE IT: the sign-in
 * state is consumed so it cannot be retried, a replayed refresh chain is burned, a
 * deprovisioned session is revoked, and the attempt is written to the audit trail.
 * Throwing rolled every one of them back, because the exception that signalled the
 * refusal also aborted the transaction that recorded it - so a refused sign-in left no
 * trace, a single-use state stayed reusable, and a session that had just been revoked
 * for being deprovisioned was still live on the next request.
 *
 * Found by running the suite, not by reading it. Returning the verdict lets the
 * transaction commit and leaves the edge one place to turn it into a status.
 */
export interface Refusal { ok: false; status: 401 | 403; reason: string }
export interface SsoResult { ok: true; facts: SessionFacts; refreshToken: string; returnTo?: string }
export type SsoOutcome = SsoResult | Refusal;

const refuse = (status: 401 | 403, reason: string): Refusal => ({ ok: false, status, reason });

export async function handleSsoCallback(
  client: PoolClient,
  provider: IdentityProviderPort,
  body: Record<string, unknown>,
  now: Date,
): Promise<SsoOutcome> {
  const state = typeof body.state === 'string' ? body.state : '';
  const code = typeof body.code === 'string' ? body.code : '';
  const samlResponse = typeof body.samlResponse === 'string' ? body.samlResponse : '';
  if (samlResponse) throw new SsoUnavailable(SAML_UNAVAILABLE_REASON);
  if (!state || !code) return refuse(401, 'that sign-in could not be completed');

  // Single-use and bound to the start that issued it. `FOR UPDATE` so two concurrent
  // callbacks with one state cannot both succeed - single-use as a database property
  // rather than a timing accident, the same construction as invitations.
  const found = await client.query<{
    state_hash: Buffer; tenant_id: string; code_verifier: string; nonce: string; return_to: string | null;
  }>(
    `SELECT state_hash, tenant_id, code_verifier, nonce, return_to
       FROM control_plane.sso_states
      WHERE state_hash = $1 AND consumed_at IS NULL AND expires_at > $2
      FOR UPDATE`,
    [hashOneTimeToken(state), now.toISOString()]);
  const pending = found.rows[0];
  // Unknown, expired and already-used are one message: the endpoint must not become a
  // way to learn that a sign-in was started.
  if (!pending) return refuse(401, 'that sign-in could not be completed');
  await client.query(
    'UPDATE control_plane.sso_states SET consumed_at = $2 WHERE state_hash = $1',
    [pending.state_hash, now.toISOString()]);

  const connection = await activeConnection(client, pending.tenant_id);
  if (!connection) return refuse(401, 'that sign-in could not be completed');

  let subject: AuthenticatedSubject;
  try {
    subject = await provider.complete(
      descriptorFor(connection),
      { code, codeVerifier: pending.code_verifier, nonce: pending.nonce },
      now);
  } catch (err) {
    if (err instanceof SecretUnavailable) throw err;   // configuration, not a refusal
    // The adapter's reason is not echoed: it can name a key, an algorithm or an
    // endpoint, and this refusal reaches an end user. The state stays consumed.
    return refuse(401, 'that sign-in could not be completed');
  }

  return completeAuthentication(client, connection, pending.tenant_id, subject,
    pending.return_to ?? undefined, now);
}

/**
 * AUTHENTICATION IS NOT AUTHORISATION (FR-83, AC-1).
 *
 * A verified identity that matches no provisioned Staff Member gets `forbidden` and NO
 * SESSION - not a session holding an empty permission set, which every client would
 * then have to remember to handle, and which would look like a bug rather than a policy.
 *
 * Matching is on (issuer, subject) first and falls back to the email address ONCE, to
 * link an existing Staff Member the first time they sign in through the provider. After
 * that the subject is stored and the address is never consulted again: an address can be
 * reassigned to a new employee, and matching on it forever is how a leaver's replacement
 * inherits their access.
 */
async function completeAuthentication(
  client: PoolClient,
  connection: ConnectionRow,
  tenantId: string,
  subject: AuthenticatedSubject,
  returnTo: string | undefined,
  now: Date,
): Promise<SsoOutcome> {
  const bySubject = await client.query<{ id: string; active: boolean; language_tag: string }>(
    `SELECT id, active, language_tag FROM control_plane.staff_members
      WHERE tenant_id = $1 AND external_issuer = $2 AND external_subject = $3`,
    [tenantId, subject.issuer, subject.subject]);
  let staff = bySubject.rows[0];
  let linked = false;

  if (!staff && subject.email) {
    const byEmail = await client.query<{ id: string; active: boolean; language_tag: string }>(
      `SELECT id, active, language_tag FROM control_plane.staff_members
        WHERE tenant_id = $1 AND lower(email) = lower($2) AND external_subject IS NULL`,
      [tenantId, subject.email]);
    staff = byEmail.rows[0];
    linked = staff !== undefined;
  }

  if (!staff) {
    // FR-83. Just-in-time provisioning is off by default and this story does not build
    // it: an identity nobody provisioned gets nothing, and the refusal says so plainly
    // rather than leaving an administrator guessing why their new starter cannot get in.
    await appendTenantAudit(client, tenantId, 'system', 'system',
      'identity.authenticated_without_access', {
        issuer: subject.issuer,
        justInTimeProvisioning: connection.jit_provisioning,
      });
    return refuse(403, connection.jit_provisioning
      ? 'that identity authenticated but has no Staff Member here, and just-in-time '
        + 'provisioning is not built yet (FR-83, Story 1.5): invite them first.'
      : 'that identity authenticated but has no Staff Member here. Just-in-time '
        + 'provisioning is off, so authenticating grants no access until somebody '
        + 'invites them and assigns a role (FR-83).');
  }
  if (!staff.active) return refuse(403, 'that Staff Member is deactivated');

  if (linked) {
    await client.query(
      'UPDATE control_plane.staff_members SET external_issuer = $2, external_subject = $3 WHERE id = $1',
      [staff.id, subject.issuer, subject.subject]);
    await appendStaffEvent(client, {
      eventId: ulid(now), type: 'IdentityLinked', tenantId,
      occurredAt: now.toISOString(), recordedAt: now.toISOString(),
      // No address in an append-only log (DG-5): the fact of the link, not the value.
      payload: { staffMemberId: staff.id, issuer: subject.issuer, matchedOn: 'email' },
    });
  }

  const facts = await openSession(client, {
    tenantId, staffMemberId: staff.id, credentialType: 'sso', languageTag: staff.language_tag,
  }, sessionRowTtlMs, now);

  const sealed = subject.upstreamRefreshToken ? seal(subject.upstreamRefreshToken) : undefined;
  await client.query(
    `INSERT INTO control_plane.sso_sessions
       (session_id, tenant_id, issuer, subject, upstream_refresh, upstream_refresh_nonce, last_checked_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [facts.sessionId, tenantId, subject.issuer, subject.subject,
     sealed?.ciphertext ?? null, sealed?.nonce ?? null, now.toISOString()]);

  await appendTenantAudit(client, tenantId, staff.id, 'staff_member', 'session.signed_in',
    { credentialType: 'sso', issuer: subject.issuer });

  return {
    ok: true,
    facts,
    refreshToken: await issueRefreshToken(client, facts, now),
    ...(returnTo ? { returnTo } : {}),
  };
}

// ---------------------------------------------------------------------- the refresh

/**
 * WHERE DEPROVISIONING BITES (AC-2, FR-3).
 *
 * Three things are re-checked here, and the access token is short-lived precisely so
 * that this happens often:
 *
 *   1. the refresh token itself - single-use, and a REPLAY kills the whole chain,
 *      because presenting one twice means it is no longer in only one place;
 *   2. local state - the session unrevoked, the Staff Member still active;
 *   3. UPSTREAM state, by asking the provider to honour its own refresh token. A
 *      deprovisioned account gets `invalid_grant` and there is nothing for us to poll,
 *      sweep or reconcile - which is what "without a manual step in JazzTicketing" means.
 *
 * A provider we cannot REACH is not a deprovisioning, and the difference matters: an
 * outage at the identity provider must not sign out a hotel's entire management team
 * mid-shift. Unreachable keeps the session; refused ends it.
 */
export async function handleRefresh(
  client: PoolClient,
  provider: IdentityProviderPort,
  presented: string,
  now: Date,
): Promise<{ ok: true; facts: SessionFacts; refreshToken: string } | Refusal> {
  // ONE message for every refusal - unknown, spent, expired, revoked, deprovisioned -
  // so a refresh endpoint cannot be used to learn which of those happened. Returned
  // rather than thrown, because the revocations below must survive the refusal.
  const generic = refuse(401, 'that refresh token is not valid');
  if (!presented) return generic;

  const found = await client.query<{
    id: string; chain_id: string; session_id: string; tenant_id: string;
    staff_member_id: string; used_at: Date | null; expires_at: Date;
  }>(
    `SELECT id, chain_id, session_id, tenant_id, staff_member_id, used_at, expires_at
       FROM control_plane.refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
    [hashOneTimeToken(presented)]);
  const token = found.rows[0];
  if (!token) return generic;

  if (token!.used_at) {
    // REPLAY. The token is in more than one place, so the whole chain dies and the
    // session with it - the alternative leaves whoever stole it holding a credential
    // that still works.
    await client.query(
      'UPDATE control_plane.refresh_tokens SET used_at = $2 WHERE chain_id = $1 AND used_at IS NULL',
      [token!.chain_id, now.toISOString()]);
    await revokeSessions(client, token!.staff_member_id, 'refresh_token_replayed', now);
    await appendTenantAudit(client, token!.tenant_id, token!.staff_member_id, 'system',
      'session.refresh_replayed', { chainId: token!.chain_id });
    return generic;
  }
  if (token!.expires_at.getTime() <= now.getTime()) return generic;

  const session = await client.query<{ revoked_at: Date | null; credential_type: string; language_tag: string; expires_at: Date }>(
    'SELECT revoked_at, credential_type, language_tag, expires_at FROM control_plane.sessions WHERE id = $1',
    [token!.session_id]);
  const row = session.rows[0];
  if (!row || row.revoked_at || row.expires_at.getTime() <= now.getTime()) return generic;

  const member = await client.query<{ active: boolean }>(
    'SELECT active FROM control_plane.staff_members WHERE id = $1', [token!.staff_member_id]);
  if (!member.rows[0]?.active) return generic;

  // ---- upstream, for a session that came from a provider ----
  if (row!.credential_type === 'sso') {
    const sso = await client.query<{ upstream_refresh: Buffer | null; upstream_refresh_nonce: Buffer | null }>(
      'SELECT upstream_refresh, upstream_refresh_nonce FROM control_plane.sso_sessions WHERE session_id = $1',
      [token!.session_id]);
    const connection = await activeConnection(client, token!.tenant_id);
    if (!connection) {
      // The Tenant disconnected the provider. Nothing upstream can vouch for this
      // session any more, so it ends here rather than running to its natural expiry.
      await revokeSessions(client, token!.staff_member_id, 'identity_provider_disconnected', now);
      return generic;
    }
    const stored = sso.rows[0];
    const upstream = stored?.upstream_refresh && stored.upstream_refresh_nonce
      ? unseal(stored.upstream_refresh, stored.upstream_refresh_nonce)
      : undefined;
    if (!upstream) {
      // No usable upstream credential means we cannot ask the provider whether this
      // identity still stands - so we stop assuming it does. Failing closed is the
      // whole point of AC-2.
      await revokeSessions(client, token!.staff_member_id, 'upstream_state_unknown', now);
      return generic;
    }
    const still = await provider.stillProvisioned(descriptorFor(connection!), upstream!, now);
    if (!still) {
      await revokeSessions(client, token!.staff_member_id, 'deprovisioned_upstream', now);
      await appendTenantAudit(client, token!.tenant_id, token!.staff_member_id, 'system',
        'session.deprovisioned_upstream', { issuer: connection!.issuer });
      return generic;
    }
    const rotated = still!.upstreamRefreshToken ? seal(still!.upstreamRefreshToken) : undefined;
    await client.query(
      `UPDATE control_plane.sso_sessions
          SET last_checked_at = $2,
              upstream_refresh = COALESCE($3, upstream_refresh),
              upstream_refresh_nonce = COALESCE($4, upstream_refresh_nonce)
        WHERE session_id = $1`,
      [token!.session_id, now.toISOString(), rotated?.ciphertext ?? null, rotated?.nonce ?? null]);
  }

  // ---- rotate ----
  const replacement = await issueRefreshToken(client, {
    sessionId: token!.session_id, tenantId: token!.tenant_id, staffMemberId: token!.staff_member_id,
  }, now, token!.chain_id);
  await client.query(
    'UPDATE control_plane.refresh_tokens SET used_at = $2 WHERE id = $1',
    [token!.id, now.toISOString()]);

  // The new access token is scoped exactly as the old session was: one Property when
  // the holder has one, Tenant-scoped otherwise. Re-derived rather than copied from the
  // presented token, so a role removed since sign-in is reflected immediately.
  const facts = await openSessionScope(client, {
    sessionId: token!.session_id, tenantId: token!.tenant_id,
    staffMemberId: token!.staff_member_id,
    credentialType: row!.credential_type as SessionFacts['credentialType'],
    languageTag: row!.language_tag,
  });
  return { ok: true, facts, refreshToken: replacement };
}

/** The scope a refreshed token should carry, re-derived rather than trusted. */
async function openSessionScope(
  client: PoolClient,
  base: { sessionId: string; tenantId: string; staffMemberId: string; credentialType: SessionFacts['credentialType']; languageTag: string },
): Promise<SessionFacts> {
  const props = await client.query<{ id: string }>(
    `SELECT p.id FROM control_plane.properties p
      WHERE p.tenant_id = $1
        AND (EXISTS (SELECT 1 FROM control_plane.staff_roles r
                      WHERE r.tenant_id = $1 AND r.staff_member_id = $2 AND r.property_id IS NULL)
          OR EXISTS (SELECT 1 FROM control_plane.staff_roles r
                      WHERE r.tenant_id = $1 AND r.staff_member_id = $2 AND r.property_id = p.id))
      ORDER BY p.created_at`,
    [base.tenantId, base.staffMemberId]);
  const only = props.rowCount === 1 ? props.rows[0]!.id : undefined;
  return { ...base, ...(only ? { propertyId: only } : {}) };
}

export const stateTtlMs = STATE_TTL_MS;
export { UNAVAILABLE as SSO_UNAVAILABLE_MESSAGE };
/** Only for the digest a suite needs; never used to compare a secret. */
export const sha256Hex = (s: string): string => createHash('sha256').update(s).digest('hex');
