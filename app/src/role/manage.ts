import type { PoolClient } from 'pg';
import {
  duplicateRole, editRole, permissionCatalogue,
  ShippedRoleImmutable, RoleKeyTaken, Escalation, DependencyUnmet,
  type RoleState,
} from '../../../core/src/role/define';
import { type CredentialType } from '../../../core/src/staff/roles';
import { tenantWidePermissions, appendStaffEvent, NotFound } from '../staff/sessions';
import { appendTenantAudit } from '../tenant/provision-tenant';

/**
 * Defining and duplicating roles (Story 1.4). The guards are in `core/src/role`; this
 * file is the transaction, the audit trail and nothing else.
 *
 * FR-6 is the reason every write here is one transaction with its audit entry: an
 * audit trail that can disagree with the thing it describes is worse than none,
 * because it will be believed.
 */

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

interface RoleRow {
  key: string; name: string; is_shipped: boolean; permissions: string[] | null;
  assignable_at_tenant_scope: boolean; duplicated_from: string | null;
  recovery_approval_threshold: number | null; updated_at: Date | null;
}

const view = (r: RoleRow): RoleView => ({
  key: r.key,
  name: r.name,
  isShipped: r.is_shipped,
  // The inverse of isShipped today, and its own field so a later reason for a role to
  // be locked does not mean every screen relearns the rule.
  editable: !r.is_shipped,
  assignableAtTenantScope: r.assignable_at_tenant_scope,
  permissions: [...(r.permissions ?? [])].sort(),
  ...(r.duplicated_from ? { duplicatedFrom: r.duplicated_from } : {}),
  // Stated in every representation on purpose, exactly like Property.regionImmutable:
  // AC-1 requires the interface to say, BEFORE a copy is made, that the duplicate will
  // not inherit later changes to its source, and a client asked to remember that rule
  // on its own will eventually forget it.
  independentOfSource: true,
  ...(r.recovery_approval_threshold !== null ? { recoveryApprovalThreshold: r.recovery_approval_threshold } : {}),
  ...(r.updated_at ? { updatedAt: r.updated_at.toISOString() } : {}),
});

const toState = (r: RoleRow): RoleState => ({
  key: r.key,
  name: r.name,
  isShipped: r.is_shipped,
  permissions: [...(r.permissions ?? [])].sort(),
  assignableAtTenantScope: r.assignable_at_tenant_scope,
  recoveryApprovalThreshold: r.recovery_approval_threshold,
  duplicatedFrom: r.duplicated_from,
});

const SELECT_ROLE = `SELECT key, name, is_shipped, permissions, assignable_at_tenant_scope,
                            duplicated_from, recovery_approval_threshold, updated_at
                       FROM control_plane.roles WHERE tenant_id = $1 AND key = $2`;

export const listPermissions = (): ReturnType<typeof permissionCatalogue> => permissionCatalogue();

async function readRole(client: PoolClient, tenantId: string, key: string): Promise<RoleRow> {
  const res = await client.query<RoleRow>(SELECT_ROLE, [tenantId, key]);
  const row = res.rows[0];
  if (!row) throw new NotFound('no such role in this Tenant');
  return row;
}

async function existingKeys(client: PoolClient, tenantId: string): Promise<Set<string>> {
  const res = await client.query<{ key: string }>(
    'SELECT key FROM control_plane.roles WHERE tenant_id = $1', [tenantId]);
  return new Set(res.rows.map((r) => r.key));
}

export async function handleDuplicateRole(
  client: PoolClient,
  actor: { tenantId: string; staffMemberId: string; credentialType: CredentialType },
  sourceKey: string,
  body: unknown,
  now: Date,
): Promise<RoleView> {
  const source = toState(await readRole(client, actor.tenantId, sourceKey));
  // The escalation guard's comparison set: what the ACTOR holds Tenant-wide. Read
  // here rather than taken from the session, so a Property-scoped permission cannot
  // become a Tenant-wide capability by being written into a definition.
  const actorHolds = await tenantWidePermissions(
    client, actor.tenantId, actor.staffMemberId, actor.credentialType);

  const { role, event } = duplicateRole(
    source, body, actorHolds, await existingKeys(client, actor.tenantId), now);

  await client.query(
    `INSERT INTO control_plane.roles
       (tenant_id, key, name, is_shipped, permissions, assignable_at_tenant_scope,
        duplicated_from, recovery_approval_threshold, created_by, updated_at)
     VALUES ($1, $2, $3, false, $4, $5, $6, $7, $8, $9)`,
    [actor.tenantId, role.key, role.name, role.permissions, role.assignableAtTenantScope,
     role.duplicatedFrom, role.recoveryApprovalThreshold, actor.staffMemberId, now.toISOString()]);

  await appendStaffEvent(client, { ...event, tenantId: actor.tenantId });
  // FR-6: actor, timestamp and previous value. A duplication has no previous value for
  // the role it creates, so what it records instead is what it was copied FROM - which
  // is the question anybody reading this entry a year later is actually asking.
  await appendTenantAudit(client, actor.tenantId, actor.staffMemberId, 'staff_member',
    'role.duplicated', {
      roleKey: role.key,
      duplicatedFrom: source.key,
      sourceWasShipped: source.isShipped,
      before: null,
      after: {
        name: role.name, permissions: role.permissions,
        assignableAtTenantScope: role.assignableAtTenantScope,
        recoveryApprovalThreshold: role.recoveryApprovalThreshold,
      },
    });

  return view(await readRole(client, actor.tenantId, role.key));
}

export async function handleUpdateRole(
  client: PoolClient,
  actor: { tenantId: string; staffMemberId: string; credentialType: CredentialType },
  key: string,
  body: unknown,
  now: Date,
): Promise<RoleView> {
  const existing = toState(await readRole(client, actor.tenantId, key));
  const actorHolds = await tenantWidePermissions(
    client, actor.tenantId, actor.staffMemberId, actor.credentialType);

  const { role, before, event, changed } = editRole(existing, body, actorHolds, now);

  // Nothing changed is not an error - a caller re-sending the same set is idempotent -
  // but it must not write an audit entry claiming a change that did not happen.
  if (changed.length === 0) return view(await readRole(client, actor.tenantId, key));

  await client.query(
    `UPDATE control_plane.roles
        SET name = $3, permissions = $4, assignable_at_tenant_scope = $5,
            recovery_approval_threshold = $6, updated_at = $7
      WHERE tenant_id = $1 AND key = $2`,
    [actor.tenantId, key, role.name, role.permissions, role.assignableAtTenantScope,
     role.recoveryApprovalThreshold, now.toISOString()]);

  await appendStaffEvent(client, { ...event, tenantId: actor.tenantId });
  await appendTenantAudit(client, actor.tenantId, actor.staffMemberId, 'staff_member',
    'role.changed', {
      roleKey: key,
      changed,
      // FR-6's "previous value", read rather than reconstructed - which is why the
      // permission set is sent and stored whole rather than as a delta.
      before: {
        name: before.name, permissions: before.permissions,
        assignableAtTenantScope: before.assignableAtTenantScope,
        recoveryApprovalThreshold: before.recoveryApprovalThreshold,
      },
      after: {
        name: role.name, permissions: role.permissions,
        assignableAtTenantScope: role.assignableAtTenantScope,
        recoveryApprovalThreshold: role.recoveryApprovalThreshold,
      },
    });

  return view(await readRole(client, actor.tenantId, key));
}

export { ShippedRoleImmutable, RoleKeyTaken, Escalation, DependencyUnmet };
export type { RoleState };
