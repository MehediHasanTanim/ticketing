import type { PoolClient } from 'pg';
import {
  validateConnection, SAML_UNAVAILABLE_REASON, type ConnectionState,
} from '../../../core/src/identity/connection';
import { ulid } from '../../../core/src/ids';
import { appendStaffEvent, revokeSessions, NotFound } from '../staff/sessions';
import { appendTenantAudit } from '../tenant/provision-tenant';

/**
 * Connecting a Tenant's identity provider (Story 1.5, FR-3, FR-83).
 *
 * PER TENANT, NEVER GLOBAL - and that is a property of the schema rather than of this
 * file: `identity_connections` is keyed by `tenant_id`, so there is no row a handler
 * could read that belongs to nobody.
 */

export interface ConnectionView {
  connected: boolean;
  protocol?: 'oidc' | 'saml';
  issuer?: string;
  clientId?: string;
  justInTimeProvisioning: boolean;
  signInUrl?: string;
  signInAvailable?: boolean;
  unavailableReason?: string;
  active?: boolean;
  updatedAt?: string;
}

interface ConnectionRow {
  tenant_id: string; protocol: 'oidc' | 'saml'; issuer: string; client_id: string;
  client_secret_ref: string; jit_provisioning: boolean; active: boolean; updated_at: Date;
}

const signInUrl = (slug: string): string => `/v1/auth/sso/start?tenantSlug=${encodeURIComponent(slug)}`;

const view = (row: ConnectionRow | undefined, slug: string): ConnectionView => {
  if (!row) {
    // FR-83 stated even in the absence of a connection: the default a Tenant would get
    // is visible before they connect anything, not discovered afterwards.
    return { connected: false, justInTimeProvisioning: false };
  }
  const available = row.protocol === 'oidc';
  return {
    connected: true,
    protocol: row.protocol,
    issuer: row.issuer,
    clientId: row.client_id,
    justInTimeProvisioning: row.jit_provisioning,
    signInUrl: signInUrl(slug),
    signInAvailable: available,
    // Told at CONNECT time rather than at sign-in time, so an administrator finds out
    // when they configure it and not when their people cannot get in.
    ...(available ? {} : { unavailableReason: SAML_UNAVAILABLE_REASON }),
    active: row.active,
    updatedAt: row.updated_at.toISOString(),
  };
};

export async function readConnection(
  client: PoolClient, tenantId: string,
): Promise<{ row?: ConnectionRow; slug: string }> {
  const tenant = await client.query<{ slug: string }>(
    'SELECT slug FROM control_plane.tenants WHERE id = $1', [tenantId]);
  if (!tenant.rows[0]) throw new NotFound('no such Tenant');
  const res = await client.query<ConnectionRow>(
    'SELECT * FROM control_plane.identity_connections WHERE tenant_id = $1', [tenantId]);
  return { ...(res.rows[0] ? { row: res.rows[0] } : {}), slug: tenant.rows[0].slug };
}

export async function getIdentityProvider(client: PoolClient, tenantId: string): Promise<ConnectionView> {
  const { row, slug } = await readConnection(client, tenantId);
  return view(row, slug);
}

export async function handleConnectIdentityProvider(
  client: PoolClient,
  actor: { tenantId: string; staffMemberId: string },
  body: unknown,
  now: Date,
): Promise<ConnectionView> {
  const wanted: ConnectionState = validateConnection(body);
  const { row: before, slug } = await readConnection(client, actor.tenantId);

  await client.query(
    `INSERT INTO control_plane.identity_connections
       (tenant_id, protocol, issuer, client_id, client_secret_ref, jit_provisioning,
        active, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $8)
     ON CONFLICT (tenant_id) DO UPDATE SET
       protocol = $2, issuer = $3, client_id = $4, client_secret_ref = $5,
       jit_provisioning = $6, active = true, updated_at = $8`,
    [actor.tenantId, wanted.protocol, wanted.issuer, wanted.clientId,
     wanted.clientSecretRef, wanted.justInTimeProvisioning, actor.staffMemberId, now.toISOString()]);

  await appendStaffEvent(client, {
    eventId: ulid(now), type: 'IdentityProviderConnected', tenantId: actor.tenantId,
    occurredAt: now.toISOString(), recordedAt: now.toISOString(),
    payload: {
      protocol: wanted.protocol, issuer: wanted.issuer,
      justInTimeProvisioning: wanted.justInTimeProvisioning,
      // The REFERENCE, never the secret - the secret never entered this system.
      clientSecretRef: wanted.clientSecretRef,
      reconfigured: before !== undefined,
    },
  });
  // FR-6, with the previous value: changing where a Tenant's people authenticate is
  // among the most consequential things an administrator can do, and enabling
  // just-in-time provisioning is a security decision that must be visible afterwards.
  await appendTenantAudit(client, actor.tenantId, actor.staffMemberId, 'staff_member',
    'identity_provider.connected', {
      before: before
        ? {
          protocol: before.protocol, issuer: before.issuer, clientId: before.client_id,
          justInTimeProvisioning: before.jit_provisioning, active: before.active,
        }
        : null,
      after: {
        protocol: wanted.protocol, issuer: wanted.issuer, clientId: wanted.clientId,
        justInTimeProvisioning: wanted.justInTimeProvisioning, active: true,
      },
    });

  const { row } = await readConnection(client, actor.tenantId);
  return view(row, slug);
}

/**
 * Disconnecting REVOKES every session opened through the provider, and leaves password
 * and PIN credentials alone.
 *
 * Letting SSO sessions run to their natural expiry would mean a Tenant that
 * disconnected a compromised provider still had people signed in through it - which is
 * the one thing disconnecting is for.
 */
export async function handleDisconnectIdentityProvider(
  client: PoolClient,
  actor: { tenantId: string; staffMemberId: string },
  now: Date,
): Promise<ConnectionView & { sessionsRevoked: number }> {
  const { row: before, slug } = await readConnection(client, actor.tenantId);
  if (!before) throw new NotFound('this Tenant has no identity connection');

  // Marked inactive, not deleted: the audit trail still has to resolve what a past
  // session authenticated against.
  await client.query(
    'UPDATE control_plane.identity_connections SET active = false, updated_at = $2 WHERE tenant_id = $1',
    [actor.tenantId, now.toISOString()]);

  const revoked = await client.query(
    `UPDATE control_plane.sessions SET revoked_at = $2, revoked_reason = 'identity_provider_disconnected'
      WHERE tenant_id = $1 AND credential_type = 'sso' AND revoked_at IS NULL`,
    [actor.tenantId, now.toISOString()]);
  // Their refresh chains die with them, or the next refresh would mint a new access
  // token for a session nobody can any longer authenticate.
  await client.query(
    `UPDATE control_plane.refresh_tokens SET used_at = $2
      WHERE tenant_id = $1 AND used_at IS NULL
        AND session_id IN (SELECT id FROM control_plane.sessions
                            WHERE tenant_id = $1 AND credential_type = 'sso')`,
    [actor.tenantId, now.toISOString()]);

  await appendStaffEvent(client, {
    eventId: ulid(now), type: 'IdentityProviderDisconnected', tenantId: actor.tenantId,
    occurredAt: now.toISOString(), recordedAt: now.toISOString(),
    payload: { issuer: before.issuer, sessionsRevoked: revoked.rowCount ?? 0 },
  });
  await appendTenantAudit(client, actor.tenantId, actor.staffMemberId, 'staff_member',
    'identity_provider.disconnected', {
      before: { protocol: before.protocol, issuer: before.issuer, active: before.active },
      after: null,
      sessionsRevoked: revoked.rowCount ?? 0,
    });

  const { row } = await readConnection(client, actor.tenantId);
  return { ...view(row, slug), sessionsRevoked: revoked.rowCount ?? 0 };
}

export { SAML_UNAVAILABLE_REASON };
export type { ConnectionRow };
