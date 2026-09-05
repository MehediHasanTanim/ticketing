import { randomBytes, createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { provisionTenant, deactivateTenant, ValidationError } from '../../../core/src/tenant/provision';
import { ulid } from '../../../core/src/ids';

/**
 * Provisioning handler (Story 1.1). Everything below commits in ONE transaction:
 * the Tenant, its shipped role set, its platform defaults, the first
 * administrator's invitation, the outbox row that will deliver it, the
 * control-plane event, the operator audit entry and the Tenant's own audit entry.
 * A half-provisioned Tenant - roles but no invitation, or an audit trail claiming
 * something that did not happen - is worse than a failed request.
 */

export interface ProvisionResult {
  tenantId: string;
  name: string;
  active: boolean;
  createdAt: string;
  invitationId: string;
  invitationExpiresAt: string;
}

/** 14 days. Long enough for a real onboarding, short enough to expire. */
const INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const sha256 = (s: string): Buffer => createHash('sha256').update(s).digest();

export async function handleProvisionTenant(
  client: PoolClient,
  operatorId: string,
  cmd: { name: string; firstAdministratorEmail: string },
  now: Date,
): Promise<ProvisionResult> {
  const { event, tenantId, invitationId } = provisionTenant(cmd, now);

  await client.query(
    'INSERT INTO control_plane.tenants (id, name, created_at) VALUES ($1, $2, $3)',
    [tenantId, event.payload.name, now.toISOString()],
  );

  // FR-1: creating a Tenant seeds the shipped role set and platform defaults, and
  // creates NO Properties and NO identity connection - those are the customer's to
  // configure (Story 1.5 connects one). Nothing below writes a property row.
  for (const role of event.payload.roles) {
    // The permission set is written HERE from Story 1.4 onwards: it lives per Tenant
    // in `control_plane.roles`, and migration 009 backfilled every Tenant that already
    // existed. `core/src/staff/roles.ts` stays the authority for what a NEW Tenant is
    // seeded with; `tests/unit/role.test.ts` asserts it agrees with what 009 wrote,
    // because drift between a constant and a migration surprises one Tenant and not
    // the others.
    await client.query(
      `INSERT INTO control_plane.roles
         (tenant_id, key, name, is_shipped, permissions, assignable_at_tenant_scope, created_by)
       VALUES ($1, $2, $3, true, $4, $5, 'jazzware_operator')`,
      [tenantId, role.key, role.name, role.permissions, role.assignableAtTenantScope],
    );
  }
  await client.query(
    'INSERT INTO control_plane.tenant_settings (tenant_id, defaults) VALUES ($1, $2)',
    [tenantId, JSON.stringify(event.payload.defaults)],
  );

  // The invitation. THE PLAINTEXT TOKEN NEVER TOUCHES A ROW THE OPERATOR CAN READ:
  // only its hash is stored here, and the token itself goes to the outbox, on which
  // `jt_control` holds INSERT and nothing else. Returning it to the operator would
  // hand Jazzware a way into the customer's first administrator account - exactly
  // what FR-1's "no standing access" forbids.
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);
  await client.query(
    `INSERT INTO control_plane.invitations (id, tenant_id, email, scope, token_hash, expires_at, created_at)
     VALUES ($1, $2, $3, 'tenant_administrator', $4, $5, $6)`,
    [invitationId, tenantId, cmd.firstAdministratorEmail.trim(), sha256(token), expiresAt.toISOString(), now.toISOString()],
  );
  await client.query(
    `INSERT INTO control_plane.outbox (id, kind, tenant_id, payload) VALUES ($1, 'tenant_administrator_invitation', $2, $3)`,
    [ulid(now), tenantId, JSON.stringify({
      email: cmd.firstAdministratorEmail.trim(),
      invitationId,
      // The token travels in the link's FRAGMENT, never its query string, so it
      // reaches no access log and no Referer header (ADR 0002, Story 1.3).
      token,
      expiresAt: expiresAt.toISOString(),
    })],
  );

  await appendControlPlaneEvent(client, {
    eventId: event.eventId, type: event.type, tenantId, operatorId,
    occurredAt: event.occurredAt, recordedAt: event.recordedAt, payload: event.payload,
  });

  // Both trails (Story 11.3). The operator trail is Jazzware's; the Tenant trail is
  // the customer's, and it exists from the Tenant's first moment so that nothing
  // Jazzware does to them is invisible to them.
  await appendOperatorAudit(client, operatorId, 'tenant.provisioned', tenantId, { name: event.payload.name });
  await appendTenantAudit(client, tenantId, operatorId, 'jazzware_operator', 'tenant.provisioned', {
    name: event.payload.name,
    seededRoles: event.payload.roles.length,
    propertiesCreated: 0,
    identityConnectionCreated: false,
  });

  return {
    tenantId, name: event.payload.name, active: true,
    createdAt: now.toISOString(), invitationId,
    invitationExpiresAt: expiresAt.toISOString(),
  };
}

/** Story 1.1 AC-4 / T4: deactivation, recorded as an event. Deletion is refused. */
export async function handleDeactivateTenant(
  client: PoolClient,
  operatorId: string,
  tenantId: string,
  now: Date,
): Promise<{ tenantId: string; name: string; active: false; createdAt: string }> {
  const found = await client.query<{ active: boolean; name: string; created_at: Date }>(
    'SELECT active, name, created_at FROM control_plane.tenants WHERE id = $1', [tenantId]);
  const row = found.rows[0];
  if (!row) throw new NotFound('no such Tenant');

  const event = deactivateTenant({ tenantId, active: row.active }, now);
  await client.query('UPDATE control_plane.tenants SET active = false WHERE id = $1', [tenantId]);
  await appendControlPlaneEvent(client, {
    eventId: event.eventId, type: event.type, tenantId, operatorId,
    occurredAt: event.occurredAt, recordedAt: event.recordedAt, payload: {},
  });
  await appendOperatorAudit(client, operatorId, 'tenant.deactivated', tenantId, {});
  await appendTenantAudit(client, tenantId, operatorId, 'jazzware_operator', 'tenant.deactivated', {});
  return { tenantId, name: row.name, active: false, createdAt: row.created_at.toISOString() };
}

/**
 * Story 1.1 AC-3 / T3. A request, not a capability: recorded, time-boxed, and
 * written to the TENANT'S OWN audit trail as well as the operator trail, because a
 * grant visible only to Jazzware is precisely the failure FR-1 exists to prevent.
 *
 * Returned as `requested`, never `approved`. Provisioning grants no standing
 * access, and neither does asking for it.
 */
export async function handleRequestSupportAccess(
  client: PoolClient,
  operatorId: string,
  tenantId: string,
  cmd: { reason: string; requestedMinutes: number },
  now: Date,
): Promise<{ grantId: string; tenantId: string; status: 'requested'; requestedAt: string; requestedMinutes: number }> {
  const reason = cmd.reason?.trim() ?? '';
  if (!reason) throw new ValidationError('a support-access request needs a reason the customer can read');
  if (!Number.isInteger(cmd.requestedMinutes) || cmd.requestedMinutes < 1 || cmd.requestedMinutes > 1440) {
    throw new ValidationError('requestedMinutes must be a whole number of minutes between 1 and 1440');
  }
  const found = await client.query<{ id: string }>('SELECT id FROM control_plane.tenants WHERE id = $1', [tenantId]);
  if (!found.rows[0]) throw new NotFound('no such Tenant');

  const grantId = ulid(now);
  await client.query(
    `INSERT INTO control_plane.support_grants (id, tenant_id, operator_id, reason, requested_minutes, status, requested_at)
     VALUES ($1, $2, $3, $4, $5, 'requested', $6)`,
    [grantId, tenantId, operatorId, reason, cmd.requestedMinutes, now.toISOString()],
  );
  await appendControlPlaneEvent(client, {
    eventId: ulid(now), type: 'SupportAccessRequested', tenantId, operatorId,
    occurredAt: now.toISOString(), recordedAt: now.toISOString(),
    payload: { grantId, requestedMinutes: cmd.requestedMinutes },
  });
  await appendOperatorAudit(client, operatorId, 'support_access.requested', tenantId, { grantId, requestedMinutes: cmd.requestedMinutes });
  await appendTenantAudit(client, tenantId, operatorId, 'jazzware_operator', 'support_access.requested', {
    grantId, reason, requestedMinutes: cmd.requestedMinutes,
  });

  return { grantId, tenantId, status: 'requested', requestedAt: now.toISOString(), requestedMinutes: cmd.requestedMinutes };
}

export class NotFound extends Error {}

// ------------------------------------------------------------------ append-only

async function appendControlPlaneEvent(
  client: PoolClient,
  e: { eventId: string; type: string; tenantId: string; operatorId: string; occurredAt: string; recordedAt: string; payload: unknown },
): Promise<void> {
  // property_id stays NULL: no Property exists (FR-1). Migration 004's CHECK names
  // the event types allowed to omit it, so the exception is explicit rather than
  // incidental - Story 1.1's implementation notes require exactly that.
  await client.query(
    `INSERT INTO control_plane.events (event_id, type, tenant_id, property_id, operator_id, occurred_at, recorded_at, payload)
     VALUES ($1, $2, $3, NULL, $4, $5, $6, $7)`,
    [e.eventId, e.type, e.tenantId, e.operatorId, e.occurredAt, e.recordedAt, JSON.stringify(e.payload)],
  );
}

export async function appendOperatorAudit(
  client: PoolClient, operatorId: string, action: string, tenantId: string | null, details: unknown,
): Promise<void> {
  await client.query(
    'INSERT INTO control_plane.operator_audit (operator_id, action, tenant_id, details) VALUES ($1, $2, $3, $4)',
    [operatorId, action, tenantId, JSON.stringify(details)],
  );
}

export async function appendTenantAudit(
  client: PoolClient, tenantId: string, actor: string, actorKind: 'jazzware_operator' | 'staff_member' | 'system',
  action: string, details: unknown,
): Promise<void> {
  await client.query(
    'INSERT INTO control_plane.tenant_audit (tenant_id, actor, actor_kind, action, details) VALUES ($1, $2, $3, $4, $5)',
    [tenantId, actor, actorKind, action, JSON.stringify(details)],
  );
}
