import type { PoolClient } from 'pg';
import {
  resolvePermissions, type CredentialType, type Grant, type Permission,
} from '../../../core/src/staff/roles';
import { SUPPORTED_LANGUAGES } from '../../../core/src/staff/invite';
import { ValidationError } from '../../../core/src/validation';
import { ulid } from '../../../core/src/ids';
import {
  hashCredential, verifyCredential, generateOneTimeToken, hashOneTimeToken,
} from '../../../adapters/src/crypto/credential';
import { appendTenantAudit } from '../tenant/provision-tenant';

/**
 * SESSIONS AND THE ONE PERMISSION ANSWER (Story 1.3 T3, T4).
 *
 * `resolveSession` below is the single server-side decision point AD-11 asks for.
 * Every gated route reaches it through `edge/src/authorise.ts` and nothing else
 * answers a permission question - because two answers is how a hidden button becomes
 * a security bug, and because AC-3's context switch is only honest if switching
 * Property changes the answer rather than the client's copy of it.
 *
 * Nothing is cached. Grants are read per request for the token's Property, which is
 * what makes "permissions are re-resolved for the new Property" true by construction
 * rather than by remembering to invalidate something.
 */

/** 14 days, matching Story 1.1's first-administrator invitation. */
const INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
/**
 * One hour for a reset. Much shorter than an invitation, because a reset link is
 * often requested from a machine that is not the person's own and because the
 * mailbox is the whole of the protection until MFA lands (FR-84, Epic 12).
 */
const RESET_TTL_MS = 60 * 60 * 1000;

export class Unauthenticated extends Error {}
export class Forbidden extends Error {}
export class NotFound extends Error {}

export interface PropertyRefView { id: string; name: string; region: string; active: boolean }

export interface SessionView {
  sessionId: string;
  staffMemberId: string;
  displayName: string;
  tenantId: string;
  propertyId?: string;
  region?: string;
  credentialType: CredentialType;
  languageTag: string;
  permissions: Permission[];
  switchableProperties: PropertyRefView[];
  expiresAt: string;
}

export interface SessionFacts {
  sessionId: string;
  tenantId: string;
  propertyId?: string;
  staffMemberId: string;
  credentialType: CredentialType;
  languageTag: string;
}

/** What the caller presented, once the token's signature has already been checked. */
export interface TokenClaims {
  sessionId: string;
  tenantId: string;
  propertyId?: string;
  staffMemberId: string;
  credentialType: CredentialType;
  languageTag: string;
}

// ------------------------------------------------------------------ the decision

/**
 * The grants that are IN SCOPE for this request: Tenant-wide grants, plus grants at
 * this Property, and nothing from any other Property. A grant at the Quay is not part
 * of the answer while the caller is scoped to the Harbour, which is the whole of AC-3
 * and half of AC-4.
 */
export async function loadGrants(
  client: PoolClient, tenantId: string, staffMemberId: string, propertyId: string | undefined,
): Promise<Grant[]> {
  const res = await client.query<{ role_key: string; property_id: string | null }>(
    `SELECT role_key, property_id FROM control_plane.staff_roles
      WHERE tenant_id = $1 AND staff_member_id = $2
        AND (property_id IS NULL OR property_id = $3)`,
    [tenantId, staffMemberId, propertyId ?? null]);
  return res.rows.map((r) => ({ roleKey: r.role_key, scope: r.property_id === null ? 'tenant' : 'property' }));
}

/**
 * The property picker's contents, and the FR-1 boundary in one query: only Properties
 * in the caller's own Tenant, ever. A Tenant-wide grant sees all of them (that is
 * what AC-5's corporate scope means); otherwise only the ones a grant names.
 *
 * Deactivated Properties stay in the list on purpose - their records remain readable
 * and only new work is refused (Story 1.2 AC-3), so dropping them would hide history.
 */
export async function switchableProperties(
  client: PoolClient, tenantId: string, staffMemberId: string,
): Promise<PropertyRefView[]> {
  const res = await client.query<{ id: string; name: string; region: string; active: boolean }>(
    `SELECT p.id, p.name, p.region, p.active
       FROM control_plane.properties p
      WHERE p.tenant_id = $1
        AND (
          EXISTS (SELECT 1 FROM control_plane.staff_roles r
                   WHERE r.tenant_id = $1 AND r.staff_member_id = $2 AND r.property_id IS NULL)
          OR EXISTS (SELECT 1 FROM control_plane.staff_roles r
                      WHERE r.tenant_id = $1 AND r.staff_member_id = $2 AND r.property_id = p.id)
        )
      ORDER BY p.created_at`,
    [tenantId, staffMemberId]);
  return res.rows.map((r) => ({ id: r.id, name: r.name, region: r.region, active: r.active }));
}

/**
 * THE decision. Liveness first, then the answer:
 *
 *   - the session row must exist, be unrevoked and unexpired. A password reset
 *     revokes every other session, and this read is what makes that immediate -
 *     no blacklist, no sweep, no cache to invalidate (the same mechanism Story 11.1
 *     used for a deactivated operator);
 *   - the Staff Member must still be active;
 *   - the Property, when the session is scoped to one, must belong to this Tenant.
 *     A token whose Property was moved out from under it is not authenticated for it.
 *
 * Then permissions, resolved from the grants in scope and the credential type
 * together (FR-4): a PIN carries only operational permissions whatever role it holds.
 */
export async function resolveSession(
  client: PoolClient, claims: TokenClaims, now: Date,
): Promise<SessionView> {
  const sess = await client.query<{ expires_at: Date; revoked_at: Date | null; tenant_id: string; staff_member_id: string }>(
    'SELECT expires_at, revoked_at, tenant_id, staff_member_id FROM control_plane.sessions WHERE id = $1',
    [claims.sessionId]);
  const row = sess.rows[0];
  if (!row) throw new Unauthenticated('no such session');
  if (row.revoked_at) throw new Unauthenticated('this session was revoked');
  if (row.expires_at.getTime() <= now.getTime()) throw new Unauthenticated('this session has expired');
  // A token that names a session belonging to someone else, or to another Tenant, is
  // not a token for this session. Signature alone does not settle that.
  if (row.tenant_id !== claims.tenantId || row.staff_member_id !== claims.staffMemberId) {
    throw new Unauthenticated('this token does not match its session');
  }

  const member = await client.query<{ name: string; language_tag: string; active: boolean }>(
    'SELECT name, language_tag, active FROM control_plane.staff_members WHERE id = $1 AND tenant_id = $2',
    [claims.staffMemberId, claims.tenantId]);
  const staff = member.rows[0];
  if (!staff) throw new Unauthenticated('no such Staff Member in this Tenant');
  if (!staff.active) throw new Unauthenticated('this Staff Member is deactivated');

  let region: string | undefined;
  if (claims.propertyId) {
    const prop = await client.query<{ region: string }>(
      'SELECT region FROM control_plane.properties WHERE id = $1 AND tenant_id = $2',
      [claims.propertyId, claims.tenantId]);
    if (!prop.rows[0]) throw new Unauthenticated('this session is scoped to a Property outside its Tenant');
    region = prop.rows[0].region;
  }

  const grants = await loadGrants(client, claims.tenantId, claims.staffMemberId, claims.propertyId);
  const { permissions, unmappedRoles } = resolvePermissions(grants, claims.credentialType);
  if (unmappedRoles.length > 0) {
    // Loud, and not fatal. Until Story 1.4 there should be no such role, so this is a
    // seeding defect - and a permission model that fails silently is one nobody finds
    // out about until a shift cannot work. No staff identifier in the line (DG-5).
    console.warn('[authz] roles with no permission mapping', JSON.stringify({
      tenantId: claims.tenantId, roles: unmappedRoles,
    }));
  }

  return {
    sessionId: claims.sessionId,
    staffMemberId: claims.staffMemberId,
    displayName: staff.name,
    tenantId: claims.tenantId,
    ...(claims.propertyId ? { propertyId: claims.propertyId } : {}),
    ...(region ? { region } : {}),
    credentialType: claims.credentialType,
    // The session's language, not the row's: FR-61 applies it at sign-in and reverts
    // it for the next person on a Shared Device, so it is session state.
    languageTag: claims.languageTag,
    permissions,
    switchableProperties: await switchableProperties(client, claims.tenantId, claims.staffMemberId),
    expiresAt: row.expires_at.toISOString(),
  };
}

// ------------------------------------------------------------------ credentials

const MIN_PASSWORD = 12;
const MAX_PASSWORD = 256;

const assertPassword = (v: unknown): string => {
  if (typeof v !== 'string' || v.length < MIN_PASSWORD || v.length > MAX_PASSWORD) {
    throw new ValidationError(`password must be between ${MIN_PASSWORD} and ${MAX_PASSWORD} characters`);
  }
  return v;
};

const assertLanguage = (v: unknown): string => {
  const tag = typeof v === 'string' ? v.trim() : '';
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(tag)) {
    throw new ValidationError(`languageTag must be one of ${SUPPORTED_LANGUAGES.join(', ')} (AD-12)`);
  }
  return tag;
};

async function openSession(
  client: PoolClient,
  p: { tenantId: string; staffMemberId: string; credentialType: 'sso' | 'password' | 'pin' | 'badge'; languageTag: string },
  rowTtlMs: number,
  now: Date,
): Promise<SessionFacts> {
  const sessionId = ulid(now);
  await client.query(
    `INSERT INTO control_plane.sessions (id, tenant_id, staff_member_id, credential_type, language_tag, issued_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [sessionId, p.tenantId, p.staffMemberId, p.credentialType, p.languageTag,
     now.toISOString(), new Date(now.getTime() + rowTtlMs).toISOString()]);

  // Scope the new session to a Property only when there is exactly ONE to choose:
  // the picker does not appear in that case, so asking the client for a round trip to
  // choose the only option would be ceremony. Zero or many stays Tenant-scoped and
  // the caller picks - which is also the FR-1 case, where zero Properties exist.
  const props = await switchableProperties(client, p.tenantId, p.staffMemberId);
  const only = props.length === 1 ? props[0] : undefined;

  return {
    sessionId, tenantId: p.tenantId, staffMemberId: p.staffMemberId,
    ...(only ? { propertyId: only.id } : {}),
    credentialType: p.credentialType, languageTag: p.languageTag,
  };
}

/** Every session for this Staff Member except, optionally, one. */
async function revokeSessions(
  client: PoolClient, staffMemberId: string, reason: string, now: Date, except?: string,
): Promise<number> {
  const res = await client.query(
    `UPDATE control_plane.sessions SET revoked_at = $2, revoked_reason = $3
      WHERE staff_member_id = $1 AND revoked_at IS NULL AND ($4::text IS NULL OR id <> $4)`,
    [staffMemberId, now.toISOString(), reason, except ?? null]);
  return res.rowCount ?? 0;
}

/**
 * `POST /auth/credential/set-up`. Redeems an invitation - Story 1.1's
 * first-administrator one, or a staff one issued by `POST /staff` - and returns a
 * session, because the holder has just proved control of the mailbox it was sent to
 * and there is no earlier session to protect.
 *
 * EVERY rejection is one generic `validation_failed`: unknown, expired, already
 * redeemed. A different answer for each would let anyone with the endpoint learn that
 * an invitation existed.
 */
export async function handleCredentialSetUp(
  client: PoolClient, body: Record<string, unknown>, now: Date,
): Promise<SessionFacts> {
  const token = typeof body.token === 'string' ? body.token : '';
  const password = assertPassword(body.password);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const languageTag = assertLanguage(body.languageTag);
  if (!name) throw new ValidationError('name is required');
  if (!token) throw new ValidationError('this link is not valid');

  // BY TOKEN HASH, through a SECURITY DEFINER function: the cell role holds no
  // privilege on `control_plane.invitations` at all (migration 004 revoked it and
  // 008 kept it that way), so this cannot enumerate invitations - the caller must
  // already hold the token. The function takes a row lock, which is what makes
  // single-use a database property rather than a timing accident.
  const found = await client.query<{
    id: string; tenant_id: string; email: string; scope: string; staff_member_id: string | null;
  }>(
    'SELECT id, tenant_id, email, scope, staff_member_id FROM control_plane.find_invitation_by_token($1, $2)',
    [hashOneTimeToken(token), now.toISOString()]);
  const invitation = found.rows[0];
  // One message for all three failures, deliberately.
  if (!invitation) throw new ValidationError('this link is not valid, or it has already been used');

  let staffMemberId = invitation.staff_member_id;
  if (staffMemberId === null) {
    // STORY 1.1's FIRST ADMINISTRATOR. Provisioning creates a Tenant, its roles, its
    // defaults and this invitation - and no Properties and no Staff Members (FR-1) -
    // so the Staff Member is created here, at the moment the person describes
    // themselves. The grant is TENANT-WIDE property_administrator: there is no
    // Property to scope it to, and someone has to be able to create the first one.
    if (invitation.scope !== 'tenant_administrator') {
      throw new ValidationError('this link is not valid, or it has already been used');
    }
    staffMemberId = `01S${ulid(now).slice(3)}`;
    await client.query(
      `INSERT INTO control_plane.staff_members (id, tenant_id, name, email, language_tag, invited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, 'jazzware_operator', $6)`,
      [staffMemberId, invitation.tenant_id, name, invitation.email, languageTag, now.toISOString()]);
    await client.query(
      `INSERT INTO control_plane.staff_roles (tenant_id, staff_member_id, property_id, role_key, granted_at, granted_by)
       VALUES ($1, $2, NULL, 'property_administrator', $3, 'jazzware_operator')`,
      [invitation.tenant_id, staffMemberId, now.toISOString()]);
    await appendStaffEvent(client, {
      eventId: ulid(now), type: 'StaffMemberInvited', tenantId: invitation.tenant_id,
      occurredAt: now.toISOString(), recordedAt: now.toISOString(),
      payload: {
        staffMemberId, name, languageTag, hasEmail: true,
        credentialPath: 'set_up_link', invitedBy: 'jazzware_operator',
      },
    });
    await appendStaffEvent(client, {
      eventId: ulid(now), type: 'RolesAssigned', tenantId: invitation.tenant_id,
      occurredAt: now.toISOString(), recordedAt: now.toISOString(),
      payload: { staffMemberId, roles: [{ propertyId: null, roleKey: 'property_administrator' }] },
    });
  } else {
    // A staff invitation: the Staff Member already exists with the roles the
    // administrator chose. The person's own spelling of their name and their own
    // choice of language win over what was typed for them.
    await client.query(
      'UPDATE control_plane.staff_members SET name = $2, language_tag = $3 WHERE id = $1',
      [staffMemberId, name, languageTag]);
  }

  const { hash, salt } = hashCredential(password);
  await client.query(
    `INSERT INTO control_plane.staff_credentials (staff_member_id, kind, hash, salt, set_at)
     VALUES ($1, 'password', $2, $3, $4)
     ON CONFLICT (staff_member_id, kind) DO UPDATE SET hash = $2, salt = $3, set_at = $4`,
    [staffMemberId, hash, salt, now.toISOString()]);
  // Redeemed here, and the function refuses a second attempt by returning zero rows.
  // It also attaches the Staff Member when the invitation arrived without one, which
  // is Story 1.1's first-administrator case.
  const redeemed = await client.query<{ redeem_invitation: number }>(
    'SELECT control_plane.redeem_invitation($1, $2, $3) AS redeem_invitation',
    [invitation.id, staffMemberId, now.toISOString()]);
  if ((redeemed.rows[0]?.redeem_invitation ?? 0) === 0) {
    // Someone redeemed it between the lookup and here. Same generic message.
    throw new ValidationError('this link is not valid, or it has already been used');
  }

  await appendStaffEvent(client, {
    eventId: ulid(now), type: 'CredentialSet', tenantId: invitation.tenant_id,
    occurredAt: now.toISOString(), recordedAt: now.toISOString(),
    payload: { staffMemberId, kind: 'password', via: 'invitation' },
  });
  await appendTenantAudit(client, invitation.tenant_id, staffMemberId, 'staff_member',
    'credential.set_up', { via: 'invitation', invitationId: invitation.id });

  return openSession(client, {
    tenantId: invitation.tenant_id, staffMemberId, credentialType: 'password', languageTag,
  }, SESSION_ROW_TTL_MS, now);
}

/** Kept here rather than imported from edge/: app/ never depends outward. */
const SESSION_ROW_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * `POST /auth/sign-in`. ONE generic failure for every rejection - unknown address,
 * wrong password, no password credential, deactivated Staff Member, deactivated
 * Tenant - so the screen cannot be used to discover who has an account.
 *
 * On the address collision the contract describes: an address is unique within a
 * Tenant and not across Tenants, so this resolves candidates and requires exactly one
 * password to match. Two matches cannot be told apart and are refused identically.
 */
export async function handleSignIn(
  client: PoolClient, body: Record<string, unknown>, now: Date,
): Promise<SessionFacts> {
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const generic = (): never => { throw new Unauthenticated('that address and password do not match an account'); };
  if (!email || !password) generic();

  const candidates = await client.query<{
    id: string; tenant_id: string; language_tag: string; active: boolean;
    tenant_active: boolean; hash: Buffer; salt: Buffer;
  }>(
    `SELECT s.id, s.tenant_id, s.language_tag, s.active, t.active AS tenant_active, c.hash, c.salt
       FROM control_plane.staff_members s
       JOIN control_plane.tenants t ON t.id = s.tenant_id
       JOIN control_plane.staff_credentials c
         ON c.staff_member_id = s.id AND c.kind = 'password'
      WHERE lower(s.email) = lower($1)`,
    [email]);

  const matched = candidates.rows.filter((r) => verifyCredential(password, r.hash, r.salt));
  if (matched.length === 0) generic();
  if (matched.length > 1) {
    // Unresolvable, and the person cannot diagnose it - so it is logged for whoever
    // can. The address is staff identity under DG-5 and is not in the line.
    console.warn('[auth] an address resolves to accounts in more than one Tenant', JSON.stringify({
      tenants: matched.map((r) => r.tenant_id).sort(),
    }));
    generic();
  }
  const account = matched[0]!;
  // Checked AFTER the password, so a deactivated account is indistinguishable from a
  // wrong password to anyone who does not already hold the credential.
  if (!account.active || !account.tenant_active) generic();

  await appendTenantAudit(client, account.tenant_id, account.id, 'staff_member', 'session.signed_in',
    { credentialType: 'password' });
  return openSession(client, {
    tenantId: account.tenant_id, staffMemberId: account.id,
    credentialType: 'password', languageTag: account.language_tag,
  }, SESSION_ROW_TTL_MS, now);
}

/**
 * `POST /auth/password/forgot`. ALWAYS 202, whether or not the address exists and
 * whether or not it is governed by SSO. A response that differs is an
 * account-enumeration oracle, and this is the one endpoint anyone can call.
 *
 * Returns the number of links queued only so the caller (the edge) can log it; that
 * number never reaches the response.
 */
export async function handlePasswordForgot(
  client: PoolClient, body: Record<string, unknown>, now: Date,
): Promise<number> {
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) return 0;

  const found = await client.query<{ id: string; tenant_id: string; email: string }>(
    `SELECT s.id, s.tenant_id, s.email FROM control_plane.staff_members s
       JOIN control_plane.tenants t ON t.id = s.tenant_id AND t.active
       JOIN control_plane.staff_credentials c ON c.staff_member_id = s.id AND c.kind = 'password'
      WHERE lower(s.email) = lower($1) AND s.active`,
    [email]);

  for (const member of found.rows) {
    const token = generateOneTimeToken();
    const expiresAt = new Date(now.getTime() + RESET_TTL_MS);
    await client.query(
      `INSERT INTO control_plane.password_resets (id, tenant_id, staff_member_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ulid(now), member.tenant_id, member.id, hashOneTimeToken(token), expiresAt.toISOString(), now.toISOString()]);
    // The plaintext goes to the outbox and nowhere else. The cell holds INSERT and
    // nothing else on that table (migration 008), so no query, report or later
    // handler can harvest a pending reset.
    await client.query(
      `INSERT INTO control_plane.outbox (id, kind, tenant_id, payload) VALUES ($1, 'password_reset', $2, $3)`,
      [ulid(now), member.tenant_id, JSON.stringify({
        email: member.email, token, expiresAt: expiresAt.toISOString(),
      })]);
    await appendTenantAudit(client, member.tenant_id, member.id, 'system', 'password.reset_requested', {});
  }
  return found.rowCount ?? 0;
}

/**
 * `POST /auth/password/reset`. 204 and NO session, unlike credential set-up, and it
 * revokes every other session for that Staff Member.
 *
 * The asymmetry is deliberate: a set-up is a first arrival with nothing to protect,
 * while a reset may be the response to a credential already in someone else's hands,
 * so it has to end the sessions that credential could have opened - including on any
 * Shared Device.
 */
export async function handlePasswordReset(
  client: PoolClient, body: Record<string, unknown>, now: Date,
): Promise<void> {
  const token = typeof body.token === 'string' ? body.token : '';
  const password = assertPassword(body.password);
  const invalid = (): never => { throw new ValidationError('this link is not valid, or it has already been used'); };
  if (!token) invalid();

  // FOR UPDATE, so two concurrent redemptions of one link cannot both succeed. This
  // table is the cell's own (migration 008 created it) and holds only hashes, so it
  // needs no definer function - but single-use has to be enforced by the lock rather
  // than by the gap between reading and writing.
  const found = await client.query<{ id: string; tenant_id: string; staff_member_id: string }>(
    `SELECT id, tenant_id, staff_member_id FROM control_plane.password_resets
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2
      FOR UPDATE`,
    [hashOneTimeToken(token), now.toISOString()]);
  const reset = found.rows[0];
  if (!reset) invalid();

  const { hash, salt } = hashCredential(password);
  await client.query(
    `INSERT INTO control_plane.staff_credentials (staff_member_id, kind, hash, salt, set_at)
     VALUES ($1, 'password', $2, $3, $4)
     ON CONFLICT (staff_member_id, kind) DO UPDATE SET hash = $2, salt = $3, set_at = $4`,
    [reset!.staff_member_id, hash, salt, now.toISOString()]);
  await client.query(
    'UPDATE control_plane.password_resets SET used_at = $2 WHERE id = $1', [reset!.id, now.toISOString()]);
  // Every OTHER reset for this person dies with it: a second link in an inbox is a
  // second way in for whoever is reading that inbox.
  await client.query(
    `UPDATE control_plane.password_resets SET used_at = $2
      WHERE staff_member_id = $1 AND used_at IS NULL`,
    [reset!.staff_member_id, now.toISOString()]);

  const revoked = await revokeSessions(client, reset!.staff_member_id, 'password_reset', now);
  await appendStaffEvent(client, {
    eventId: ulid(now), type: 'CredentialSet', tenantId: reset!.tenant_id,
    occurredAt: now.toISOString(), recordedAt: now.toISOString(),
    payload: { staffMemberId: reset!.staff_member_id, kind: 'password', via: 'reset' },
  });
  await appendTenantAudit(client, reset!.tenant_id, reset!.staff_member_id, 'staff_member',
    'password.reset', { sessionsRevoked: revoked });
}

/**
 * `POST /auth/context`. AC-3: switch Property without signing out, with permissions
 * re-resolved for the new Property.
 *
 * It MINTS A NEW TOKEN against the same session rather than reinterpreting the old
 * one, because every token carries its scope in the signed body (AD-3) - a scope a
 * header could change is not a scope. The old token keeps working at the old Property
 * until it expires, which is correct: the holder still has a role there.
 *
 * The two refusals answer differently on purpose. A `propertyId` in another Tenant is
 * `not_found`, so the response cannot be used to discover that a Property exists
 * elsewhere; one in this Tenant where the caller holds no role is `forbidden`,
 * because they already know it exists.
 */
export async function handleSwitchContext(
  client: PoolClient, claims: TokenClaims, propertyId: string, now: Date,
): Promise<SessionFacts> {
  if (!propertyId) throw new ValidationError('propertyId is required');

  const prop = await client.query<{ id: string }>(
    'SELECT id FROM control_plane.properties WHERE id = $1 AND tenant_id = $2',
    [propertyId, claims.tenantId]);
  if (!prop.rows[0]) throw new NotFound('no such Property in this Tenant');

  const grants = await loadGrants(client, claims.tenantId, claims.staffMemberId, propertyId);
  if (grants.length === 0) {
    throw new Forbidden('you hold no role at this Property');
  }

  await appendTenantAudit(client, claims.tenantId, claims.staffMemberId, 'staff_member',
    'session.context_switched', { propertyId, sessionId: claims.sessionId });

  return {
    sessionId: claims.sessionId, tenantId: claims.tenantId, propertyId,
    staffMemberId: claims.staffMemberId, credentialType: claims.credentialType,
    languageTag: claims.languageTag,
  };
}

export const invitationTtlMs = INVITATION_TTL_MS;
export { revokeSessions };

/**
 * A Staff Member belongs to a Tenant and holds roles at zero or more Properties, so
 * these events name no Property - the same AD-3 exception Story 1.1 took, and
 * migration 008 adds each type to the CHECK that lists the permitted ones.
 */
export async function appendStaffEvent(
  client: PoolClient,
  e: { eventId: string; type: string; tenantId: string; occurredAt: string; recordedAt: string; payload: unknown },
): Promise<void> {
  await client.query(
    `INSERT INTO control_plane.events (event_id, type, tenant_id, property_id, occurred_at, recorded_at, payload)
     VALUES ($1, $2, $3, NULL, $4, $5, $6)`,
    [e.eventId, e.type, e.tenantId, e.occurredAt, e.recordedAt, JSON.stringify(e.payload)]);
}
