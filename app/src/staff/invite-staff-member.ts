import type { PoolClient } from 'pg';
import {
  inviteStaffMember, verdictForPair, PIN_LENGTH,
  type NormalisedRole, type PairVerdict,
} from '../../../core/src/staff/invite';
import {
  resolvePermissions, TENANT_ASSIGNABLE_ROLES,
  type CredentialType, type Grant,
} from '../../../core/src/staff/roles';
import { ValidationError } from '../../../core/src/validation';
import { ulid } from '../../../core/src/ids';
import {
  hashCredential, generatePin, generateOneTimeToken, hashOneTimeToken,
} from '../../../adapters/src/crypto/credential';
import { appendTenantAudit } from '../tenant/provision-tenant';
import { appendStaffEvent, invitationTtlMs, Forbidden, NotFound } from './sessions';

/**
 * Inviting a Staff Member (Story 1.3 T1, T2). TENANT-scoped, because an invitation
 * carries roles at one or more Properties and therefore cannot be scoped to one -
 * the same shape as `POST /properties`, and authorised PER PAIR rather than per
 * request, which is what makes AC-4 more than a slogan.
 */

export class ConflictError extends Error {}

export interface StaffMemberView {
  staffMemberId: string;
  tenantId: string;
  name: string;
  email?: string;
  languageTag: string;
  roles: Array<{ propertyId?: string; roleKey: string }>;
  credentialStatus: 'invited' | 'password_set' | 'pin_only';
  active: boolean;
  createdAt: string;
}

export interface RoleView {
  key: string;
  name: string;
  isShipped: boolean;
  editable: boolean;
  assignableAtTenantScope: boolean;
  permissions: string[];
  duplicatedFrom?: string;
  independentOfSource: true;
  recoveryApprovalThreshold?: number;
  updatedAt?: string;
}

/**
 * AC-2's role picker. Read from the TENANT'S OWN roles rather than the constant in
 * core/src/tenant/provision.ts, which is what makes Story 1.4's custom roles appear
 * here without touching this function - and what makes a role key from another
 * Tenant impossible to pick.
 */
export async function listRoles(client: PoolClient, tenantId: string): Promise<RoleView[]> {
  // Every field the role editor needs since Story 1.4, including the permission set -
  // which now lives here, per Tenant, rather than in the build.
  const res = await client.query<{
    key: string; name: string; is_shipped: boolean; permissions: string[] | null;
    assignable_at_tenant_scope: boolean; duplicated_from: string | null;
    recovery_approval_threshold: number | null; updated_at: Date | null;
  }>(
    `SELECT key, name, is_shipped, permissions, assignable_at_tenant_scope,
            duplicated_from, recovery_approval_threshold, updated_at
       FROM control_plane.roles WHERE tenant_id = $1 ORDER BY is_shipped DESC, key`,
    [tenantId]);
  return res.rows.map((r) => ({
    key: r.key,
    name: r.name,
    isShipped: r.is_shipped,
    // A shipped role is duplicable and never editable (FR-81). Its own field rather
    // than the client negating isShipped, so a later reason to lock a role does not
    // mean every screen relearns the rule.
    editable: !r.is_shipped,
    // STORED, not derived: a corporate viewer holds only Property-scope permissions and
    // is Tenant-wide by design (Story 1.3 AC-5), so no derivation can be right.
    assignableAtTenantScope: r.assignable_at_tenant_scope,
    permissions: [...(r.permissions ?? [])].sort(),
    ...(r.duplicated_from ? { duplicatedFrom: r.duplicated_from } : {}),
    independentOfSource: true as const,
    ...(r.recovery_approval_threshold !== null
      ? { recoveryApprovalThreshold: r.recovery_approval_threshold } : {}),
    ...(r.updated_at ? { updatedAt: r.updated_at.toISOString() } : {}),
  }));
}

/** Every grant the caller holds, across the whole Tenant - not just the current Property. */
async function callerGrants(
  client: PoolClient, tenantId: string, staffMemberId: string,
): Promise<Array<Grant & { propertyId: string | null }>> {
  // Joined to the role, because Story 1.4 moved permission sets into the Tenant.
  const res = await client.query<{ role_key: string; property_id: string | null; permissions: string[] }>(
    `SELECT sr.role_key, sr.property_id, r.permissions
       FROM control_plane.staff_roles sr
       JOIN control_plane.roles r ON r.tenant_id = sr.tenant_id AND r.key = sr.role_key
      WHERE sr.tenant_id = $1 AND sr.staff_member_id = $2`,
    [tenantId, staffMemberId]);
  return res.rows.map((r) => ({
    roleKey: r.role_key,
    propertyId: r.property_id,
    scope: r.property_id === null ? 'tenant' : 'property',
    permissions: r.permissions ?? [],
  }));
}

/**
 * WHERE the caller may exercise one permission. Computed by asking the one decision
 * function once per Property the caller holds anything at, rather than by
 * reimplementing its rules here - AD-11's "exactly one place where a permission
 * question is answered" is worth nothing if this file quietly becomes a second place.
 */
export interface Authority {
  tenantWide: boolean;
  atProperty: Set<string>;
}

export async function authorityFor(
  client: PoolClient, tenantId: string, staffMemberId: string,
  credentialType: CredentialType, permission: 'staff.invite' | 'staff.read',
): Promise<Authority> {
  const grants = await callerGrants(client, tenantId, staffMemberId);
  const tenantGrants = grants.filter((g) => g.scope === 'tenant');
  const tenantWide = resolvePermissions(tenantGrants, credentialType).permissions.includes(permission);
  const atProperty = new Set<string>();
  for (const propertyId of new Set(grants.map((g) => g.propertyId).filter((p): p is string => p !== null))) {
    const inScope = grants.filter((g) => g.propertyId === null || g.propertyId === propertyId);
    if (resolvePermissions(inScope, credentialType).permissions.includes(permission)) {
      atProperty.add(propertyId);
    }
  }
  return { tenantWide, atProperty };
}

export interface InviteResultView {
  staffMember: StaffMemberView;
  /** Returned ONCE. Only for a PIN-only account, and never stored in plaintext. */
  pin?: string;
  invitationExpiresAt?: string;
}

export async function handleInviteStaffMember(
  client: PoolClient,
  actor: { tenantId: string; staffMemberId: string; credentialType: CredentialType },
  body: unknown,
  now: Date,
): Promise<InviteResultView> {
  const tenant = await client.query<{ active: boolean }>(
    'SELECT active FROM control_plane.tenants WHERE id = $1', [actor.tenantId]);
  if (!tenant.rows[0]) throw new NotFound('no such Tenant');
  if (!tenant.rows[0].active) throw new ConflictError('this Tenant is deactivated');

  const catalogue = await client.query<{ key: string; assignable_at_tenant_scope: boolean }>(
    'SELECT key, assignable_at_tenant_scope FROM control_plane.roles WHERE tenant_id = $1',
    [actor.tenantId]);

  // The aggregate validates the request - names, language, DG-5 refusals, role keys,
  // Tenant-wide assignability - before anything is authorised or written.
  const invited = inviteStaffMember(
    body,
    catalogue.rows.map((r) => ({ key: r.key, assignableAtTenantScope: r.assignable_at_tenant_scope })),
    actor.staffMemberId, actor.tenantId, now);

  // ---- AC-4, per pair ----
  const propertiesInTenant = new Set(
    (await client.query<{ id: string }>(
      'SELECT id FROM control_plane.properties WHERE tenant_id = $1', [actor.tenantId])).rows.map((r) => r.id));
  const authority = await authorityFor(
    client, actor.tenantId, actor.staffMemberId, actor.credentialType, 'staff.invite');

  const verdicts: PairVerdict[] = invited.roles.map((pair) => verdictForPair(pair, {
    propertiesInTenant,
    mayInviteAtProperty: authority.atProperty,
    mayInviteTenantWide: authority.tenantWide,
  }));
  // `not_found` first, because it is the less informative answer and a crafted payload
  // that mixes a real Property with one from another Tenant should learn nothing about
  // either.
  if (verdicts.includes('not_found')) throw new NotFound('no such Property in this Tenant');
  if (verdicts.includes('forbidden')) {
    throw new Forbidden(
      'you may only assign roles at Properties you administer, and only a Tenant-wide '
      + 'administrator may grant Tenant-wide authority');
  }

  // ---- the row ----
  if (invited.email) {
    const clash = await client.query<{ id: string }>(
      'SELECT id FROM control_plane.staff_members WHERE tenant_id = $1 AND lower(email) = lower($2)',
      [actor.tenantId, invited.email]);
    // Scoped to the Tenant, which is why it is safe to say: an address unique across
    // Tenants would make this 409 reveal that the person has an account somewhere
    // else, and FR-1 exists to prevent exactly that.
    if (clash.rows[0]) throw new ConflictError('this email address already belongs to a Staff Member in this Tenant');
  }

  await client.query(
    `INSERT INTO control_plane.staff_members (id, tenant_id, name, email, language_tag, invited_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [invited.staffMemberId, actor.tenantId, invited.name, invited.email,
     invited.languageTag, actor.staffMemberId, now.toISOString()]);

  for (const role of invited.roles) {
    await client.query(
      `INSERT INTO control_plane.staff_roles (tenant_id, staff_member_id, property_id, role_key, granted_at, granted_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actor.tenantId, invited.staffMemberId, role.propertyId, role.roleKey, now.toISOString(), actor.staffMemberId]);
  }

  for (const event of invited.events) {
    await appendStaffEvent(client, {
      eventId: event.eventId, type: event.type, tenantId: actor.tenantId,
      occurredAt: event.occurredAt, recordedAt: event.recordedAt, payload: event.payload,
    });
  }

  // ---- the two credential paths (AC-1) ----
  let pin: string | undefined;
  let invitationExpiresAt: string | undefined;
  if (invited.credentialPath === 'set_up_link') {
    const token = generateOneTimeToken();
    const expiresAt = new Date(now.getTime() + invitationTtlMs);
    invitationExpiresAt = expiresAt.toISOString();
    // Through a SECURITY DEFINER function, because the cell role holds no privilege on
    // `control_plane.invitations`. The function hard-codes the scope to
    // 'staff_member', so a cell can never mint a `tenant_administrator` invitation
    // however it is called - only Jazzware's own surface can, which is FR-1.
    await client.query(
      'SELECT control_plane.issue_staff_invitation($1, $2, $3, $4, $5, $6, $7)',
      [`01I${ulid(now).slice(3)}`, actor.tenantId, invited.email, hashOneTimeToken(token),
       expiresAt.toISOString(), now.toISOString(), invited.staffMemberId]);
    // Plaintext to the outbox, on which the cell holds INSERT and nothing else. The
    // token travels in the link's FRAGMENT so it reaches no access log.
    await client.query(
      `INSERT INTO control_plane.outbox (id, kind, tenant_id, payload) VALUES ($1, 'staff_invitation', $2, $3)`,
      [ulid(now), actor.tenantId, JSON.stringify({
        email: invited.email, staffMemberId: invited.staffMemberId, token,
        expiresAt: expiresAt.toISOString(),
      })]);
  } else {
    // A PIN-ONLY ACCOUNT for a Shared Device. The PIN is returned in the response and
    // nowhere else: there is no mailbox to send it to, so the inviting administrator
    // is the only channel. Only its hash is stored, and it is never logged.
    pin = generatePin(PIN_LENGTH);
    const { hash, salt } = hashCredential(pin);
    await client.query(
      `INSERT INTO control_plane.staff_credentials (staff_member_id, kind, hash, salt, set_at)
       VALUES ($1, 'pin', $2, $3, $4)`,
      [invited.staffMemberId, hash, salt, now.toISOString()]);
    await appendStaffEvent(client, {
      eventId: ulid(now), type: 'CredentialSet', tenantId: actor.tenantId,
      occurredAt: now.toISOString(), recordedAt: now.toISOString(),
      payload: { staffMemberId: invited.staffMemberId, kind: 'pin', via: 'invitation' },
    });
  }

  await appendTenantAudit(client, actor.tenantId, actor.staffMemberId, 'staff_member',
    'staff_member.invited', {
      staffMemberId: invited.staffMemberId,
      credentialPath: invited.credentialPath,
      roles: invited.roles.map((r) => ({ propertyId: r.propertyId, roleKey: r.roleKey })),
    });

  return {
    staffMember: await staffMemberView(client, actor.tenantId, invited.staffMemberId),
    ...(pin ? { pin } : {}),
    ...(invitationExpiresAt ? { invitationExpiresAt } : {}),
  };
}

async function credentialStatus(
  client: PoolClient, staffMemberId: string,
): Promise<StaffMemberView['credentialStatus']> {
  const res = await client.query<{ kind: string }>(
    'SELECT kind FROM control_plane.staff_credentials WHERE staff_member_id = $1', [staffMemberId]);
  const kinds = res.rows.map((r) => r.kind);
  if (kinds.includes('password')) return 'password_set';
  if (kinds.includes('pin')) return 'pin_only';
  // Invited and not yet redeemed - which is where Story 1.1 leaves a Tenant's first
  // administrator until this story's set-up endpoint is used.
  return 'invited';
}

export async function staffMemberView(
  client: PoolClient, tenantId: string, staffMemberId: string,
): Promise<StaffMemberView> {
  const res = await client.query<{
    id: string; tenant_id: string; name: string; email: string | null;
    language_tag: string; active: boolean; created_at: Date;
  }>(
    'SELECT * FROM control_plane.staff_members WHERE id = $1 AND tenant_id = $2',
    [staffMemberId, tenantId]);
  const row = res.rows[0];
  if (!row) throw new NotFound('no such Staff Member in this Tenant');
  const roles = await client.query<{ property_id: string | null; role_key: string }>(
    `SELECT property_id, role_key FROM control_plane.staff_roles
      WHERE tenant_id = $1 AND staff_member_id = $2 ORDER BY property_id NULLS FIRST, role_key`,
    [tenantId, staffMemberId]);
  return {
    staffMemberId: row.id, tenantId: row.tenant_id, name: row.name,
    ...(row.email ? { email: row.email } : {}),
    languageTag: row.language_tag,
    roles: roles.rows.map((r) => ({ ...(r.property_id ? { propertyId: r.property_id } : {}), roleKey: r.role_key })),
    credentialStatus: await credentialStatus(client, row.id),
    active: row.active,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * AC-5 on a real read. The Tenant predicate is unconditional; `propertyId` NARROWS
 * and can never widen, and a caller without Tenant-wide authority sees only Staff
 * Members holding a role at a Property they themselves administer.
 */
export async function listStaffMembers(
  client: PoolClient,
  actor: { tenantId: string; staffMemberId: string; credentialType: CredentialType },
  filter: { propertyId?: string },
  now: Date,
): Promise<StaffMemberView[]> {
  const authority = await authorityFor(
    client, actor.tenantId, actor.staffMemberId, actor.credentialType, 'staff.read');

  let visible: string[] | undefined;   // undefined means "every Property in the Tenant"
  if (!authority.tenantWide) visible = [...authority.atProperty];
  if (filter.propertyId) {
    // FIRST, is it even ours? Found by running the suite, not by reading it: a
    // Tenant-wide caller has `visible === undefined`, so the authority check below
    // could not fire, and the query's `property_id IS NULL` branch then returned
    // every Tenant-wide Staff Member for a filter naming ANOTHER Tenant's Property.
    // No other Tenant's records ever came back - but the answer was wider than what
    // the caller asked for, which is the thing this function's own comment promised
    // could not happen. A filter must never widen an answer.
    const ours = await client.query<{ one: number }>(
      'SELECT 1 AS one FROM control_plane.properties WHERE id = $1 AND tenant_id = $2',
      [filter.propertyId, actor.tenantId]);
    // Empty, not an error: it says nothing about whether that Property exists
    // somewhere else, which is the same reason a context switch answers not_found.
    if (!ours.rows[0]) return [];
    if (visible !== undefined && !visible.includes(filter.propertyId)) {
      // Narrowing to somewhere in this Tenant that the caller cannot see returns
      // NOTHING, rather than falling back to everything they can.
      return [];
    }
    visible = [filter.propertyId];
  }

  const rows = visible === undefined
    ? await client.query<{ id: string }>(
      'SELECT id FROM control_plane.staff_members WHERE tenant_id = $1 ORDER BY created_at', [actor.tenantId])
    : await client.query<{ id: string }>(
      // `property_id IS NULL` is included on purpose: a Tenant-wide grant IS authority
      // at every Property in the Tenant, so its holder belongs in a list narrowed to
      // one of them. That is only true once the Property has been confirmed to be in
      // this Tenant, which is what the check above now does.
      `SELECT DISTINCT s.id, s.created_at FROM control_plane.staff_members s
         JOIN control_plane.staff_roles r ON r.staff_member_id = s.id AND r.tenant_id = s.tenant_id
        WHERE s.tenant_id = $1 AND (r.property_id = ANY($2::text[]) OR r.property_id IS NULL)
        ORDER BY s.created_at`,
      [actor.tenantId, visible]);

  const out: StaffMemberView[] = [];
  for (const r of rows.rows) out.push(await staffMemberView(client, actor.tenantId, r.id));
  void now;
  return out;
}

export { ValidationError, TENANT_ASSIGNABLE_ROLES };
export type { NormalisedRole };
