import type { PoolClient } from 'pg';
import {
  createProperty, deactivateProperty, ValidationError, ConflictError, RegionImmutable,
} from '../../../core/src/property/create';
import { outstandingSetupSteps, isSetupComplete, type PropertySetupSnapshot } from '../../../core/src/property/setup-steps';
import { appendTenantAudit } from '../tenant/provision-tenant';
import { ulid } from '../../../core/src/ids';

/**
 * Property creation (Story 1.2). The actor is a hotel-side TENANT ADMINISTRATOR,
 * so this is a cell operation on the customer's own authority - unlike Tenant
 * creation, which FR-1 puts on the Jazzware-internal surface. The row it writes is
 * control-plane data (the property directory, AD-4), which is a deliberate
 * cross-boundary write and why migration 005 grants the cell role INSERT there.
 *
 * Tenant-scoped, not Property-scoped: creating the FIRST Property means acting with
 * no Property to be scoped to, which is the one operation AD-3's "every request
 * resolves to exactly one Property" cannot cover.
 */

export class NotFound extends Error {}

export interface PropertyView {
  propertyId: string;
  tenantId: string;
  name: string;
  region: string;
  regionImmutable: true;
  cellName: string;
  timezone: string;
  currency: string;
  active: boolean;
  setupIncomplete: boolean;
  createdAt: string;
}

const view = (r: {
  id: string; tenant_id: string; name: string; region: string; cell_name: string;
  timezone: string; currency: string; active: boolean; setup_incomplete: boolean; created_at: Date;
}): PropertyView => ({
  propertyId: r.id, tenantId: r.tenant_id, name: r.name, region: r.region,
  // Stated in every representation, because AC-1 requires the region to be
  // "displayed as immutable from this point forward" and a client that has to
  // remember that rule on its own will eventually forget it.
  regionImmutable: true,
  cellName: r.cell_name, timezone: r.timezone, currency: r.currency,
  active: r.active, setupIncomplete: r.setup_incomplete,
  createdAt: r.created_at.toISOString(),
});

export async function handleCreateProperty(
  client: PoolClient,
  actor: { tenantId: string; staffMemberId?: string },
  cmd: { name: string; region: string; timezone: string; currency: string },
  now: Date,
): Promise<PropertyView> {
  const tenant = await client.query<{ active: boolean }>(
    'SELECT active FROM control_plane.tenants WHERE id = $1', [actor.tenantId]);
  if (!tenant.rows[0]) throw new NotFound('no such Tenant');
  if (!tenant.rows[0].active) throw new ConflictError('this Tenant is deactivated');

  // AC-1: "the Property exists in the chosen region's cell". A region no cell
  // serves is refused HERE rather than recorded and quietly unroutable - the
  // failure mode of writing it anyway is a Property whose data has nowhere to
  // live, discovered by whoever first tries to use it.
  const cell = await client.query<{ name: string; region: string }>(
    'SELECT name, region FROM control_plane.cells WHERE region = $1 AND active ORDER BY name LIMIT 1',
    [cmd.region?.trim() ?? '']);
  const placement = cell.rows[0];
  if (!placement) {
    const available = await client.query<{ region: string }>(
      'SELECT DISTINCT region FROM control_plane.cells WHERE active ORDER BY region');
    throw new ValidationError(
      `no active cell serves region ${JSON.stringify(cmd.region)}. `
      + `Available: ${available.rows.map((r) => r.region).join(', ') || 'none'}. `
      + 'A Property cannot be created in a region it could never be served from (AD-4).');
  }

  // The version this Property LINKS TO. Read, not copied - Story 1.6 changes the
  // Tenant defaults and every inheriting Property must see it.
  const settings = await client.query<{ version: number }>(
    'SELECT version FROM control_plane.tenant_settings WHERE tenant_id = $1', [actor.tenantId]);
  const settingsVersion = settings.rows[0]?.version;
  if (settingsVersion === undefined) {
    throw new NotFound('this Tenant has no settings row; it was not provisioned by Story 1.1');
  }

  const { event, propertyId } = createProperty(
    { tenantId: actor.tenantId, name: cmd.name, region: cmd.region, timezone: cmd.timezone, currency: cmd.currency },
    { cellName: placement.name, region: placement.region },
    settingsVersion, now);

  await client.query(
    `INSERT INTO control_plane.properties
       (id, tenant_id, name, region, timezone, currency, cell_name, active, setup_incomplete, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, $8)`,
    [propertyId, actor.tenantId, event.payload.name, event.payload.region,
     event.payload.timezone, event.payload.currency, event.payload.cellName, now.toISOString()]);

  // The LINK, with no overrides yet. Story 1.6 adds keys here; nothing copies a
  // value in, which is the whole point of AD-9's inheritance-by-reference.
  await client.query(
    `INSERT INTO control_plane.property_settings (tenant_id, property_id, inherits_version, overrides)
     VALUES ($1, $2, $3, '{}')`,
    [actor.tenantId, propertyId, settingsVersion]);

  await client.query(
    `INSERT INTO control_plane.events
       (event_id, type, tenant_id, property_id, occurred_at, recorded_at, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [event.eventId, event.type, actor.tenantId, propertyId,
     event.occurredAt, event.recordedAt, JSON.stringify(event.payload)]);

  await appendTenantAudit(client, actor.tenantId, actor.staffMemberId ?? 'unknown', 'staff_member',
    'property.created', {
      propertyId, name: event.payload.name, region: event.payload.region,
      cellName: event.payload.cellName, inheritsSettingsVersion: settingsVersion,
    });

  const created = await client.query('SELECT * FROM control_plane.properties WHERE id = $1', [propertyId]);
  return view(created.rows[0]);
}

export async function listProperties(
  client: PoolClient, tenantId: string,
): Promise<PropertyView[]> {
  // FR-1: a caller receives only Properties within their own Tenant. The predicate
  // is explicit because control-plane tables carry no row-level security - the
  // cell's guest-bearing tables are what RLS protects (AD-4).
  const res = await client.query(
    'SELECT * FROM control_plane.properties WHERE tenant_id = $1 ORDER BY created_at', [tenantId]);
  return res.rows.map(view);
}

/**
 * AC-4. The list is DERIVED: the snapshot is gathered from whatever exists today,
 * and every step whose feature a later story builds simply counts zero. That is the
 * truth rather than a placeholder, and it means adding 1.7 changes the answer
 * without changing this code.
 */
export async function propertySetupState(
  client: PoolClient, tenantId: string, propertyId: string,
): Promise<{ property: PropertyView; outstanding: ReturnType<typeof outstandingSetupSteps>; complete: boolean }> {
  const res = await client.query(
    'SELECT * FROM control_plane.properties WHERE id = $1 AND tenant_id = $2', [propertyId, tenantId]);
  const row = res.rows[0];
  if (!row) throw new NotFound('no such Property in this Tenant');

  const snapshot: PropertySetupSnapshot = await gatherSnapshot(client, tenantId, propertyId);
  const outstanding = outstandingSetupSteps(snapshot);
  const complete = isSetupComplete(snapshot);

  // Keep the cheap-read flag honest with the derivation rather than beside it.
  if (row.setup_incomplete === complete) {
    await client.query(
      'UPDATE control_plane.properties SET setup_incomplete = $2 WHERE id = $1', [propertyId, !complete]);
    row.setup_incomplete = !complete;
  }
  return { property: view(row), outstanding, complete };
}

/**
 * Counts only what exists. Every table a later story introduces is absent, and an
 * absent count means the step is outstanding - so this function grows one line per
 * story instead of the step list growing a special case.
 */
async function gatherSnapshot(
  _client: PoolClient, _tenantId: string, _propertyId: string,
): Promise<PropertySetupSnapshot> {
  // Nothing in this snapshot exists yet: Departments, Locations and Rooms arrive in
  // 1.7, staff roles in 1.3, Catalog Entries and SLA Targets in 1.8, Escalation
  // chains in 1.9, the Jazz Core connection in 2.2. Returning an empty snapshot is
  // not a stub - it is the accurate state of a Property created today, and it makes
  // all eight steps outstanding, which is what a property administrator should see.
  return {};
}

export async function handleDeactivateProperty(
  client: PoolClient, actor: { tenantId: string; staffMemberId?: string }, propertyId: string, now: Date,
): Promise<PropertyView> {
  const found = await client.query<{ active: boolean }>(
    'SELECT active FROM control_plane.properties WHERE id = $1 AND tenant_id = $2',
    [propertyId, actor.tenantId]);
  const row = found.rows[0];
  if (!row) throw new NotFound('no such Property in this Tenant');

  const event = deactivateProperty({ propertyId, active: row.active }, now);
  await client.query(
    'UPDATE control_plane.properties SET active = false, deactivated_at = $2 WHERE id = $1',
    [propertyId, now.toISOString()]);
  await client.query(
    `INSERT INTO control_plane.events
       (event_id, type, tenant_id, property_id, occurred_at, recorded_at, payload)
     VALUES ($1, $2, $3, $4, $5, $6, '{}')`,
    [event.eventId, event.type, actor.tenantId, propertyId, event.occurredAt, event.recordedAt]);
  await appendTenantAudit(client, actor.tenantId, actor.staffMemberId ?? 'unknown', 'staff_member',
    'property.deactivated', { propertyId });

  const after = await client.query('SELECT * FROM control_plane.properties WHERE id = $1', [propertyId]);
  return view(after.rows[0]);
}

/**
 * AC-2, for the one caller that tries. There is no update route that accepts a
 * region, and the database refuses the change as well (migration 005) - this exists
 * so the refusal NAMES RESIDENCY, which the criterion requires, instead of
 * answering a bare validation error.
 */
export async function assertPropertyRegionUnchanged(
  client: PoolClient, tenantId: string, propertyId: string, requestedRegion: string | undefined,
): Promise<void> {
  if (requestedRegion === undefined) return;
  const res = await client.query<{ region: string }>(
    'SELECT region FROM control_plane.properties WHERE id = $1 AND tenant_id = $2', [propertyId, tenantId]);
  const row = res.rows[0];
  if (!row) throw new NotFound('no such Property in this Tenant');
  if (row.region !== requestedRegion) throw new RegionImmutable(row.region, requestedRegion);
}

export { ValidationError, ConflictError, RegionImmutable };
export const newRequestId = (now: Date): string => ulid(now);
