import type { PoolClient } from 'pg';
import {
  resolveEffective, validateTenantChange, validatePropertyOverride,
  TENANT_SETTINGS, SETTING_KEYS, specOf, isInheritable,
  type SettingChange, type SettingKey, type SettingSpec,
} from '../../../core/src/tenant/settings';
import { ulid } from '../../../core/src/ids';
import { appendStaffEvent, NotFound } from '../staff/sessions';
import { appendTenantAudit } from './provision-tenant';

/**
 * Tenant defaults, blast radius, and per-Property overrides (Story 1.6, FR-83).
 *
 * ONE RESOLUTION RULE, used by both surfaces. `resolveEffective` in `core/` decides what
 * is in force; this file reads rows and writes audit entries. The Tenant view and the
 * Property view calling different code is exactly how they come to disagree.
 */

export interface TenantSettingView {
  key: string;
  value: unknown;
  scope: 'inheritable' | 'tenant_only';
  inheritingPropertyCount: number;
  overriddenBy: Array<{ propertyId: string; name: string; value: unknown }>;
  governance?: string;
  maximum?: number;
}

export interface TenantSettingsView {
  settings: TenantSettingView[];
  propertyCount: number;
  regions: Array<{ propertyId: string; name: string; region: string; active: boolean }>;
  updatedAt?: string;
}

interface PropertyRow {
  id: string; name: string; region: string; active: boolean; overrides: Record<string, unknown> | null;
}

async function readTenant(
  client: PoolClient, tenantId: string,
): Promise<{ defaults: Record<string, unknown>; version: number; updatedAt: Date }> {
  const res = await client.query<{ defaults: Record<string, unknown>; version: number; updated_at: Date }>(
    'SELECT defaults, version, updated_at FROM control_plane.tenant_settings WHERE tenant_id = $1',
    [tenantId]);
  const row = res.rows[0];
  if (!row) throw new NotFound('this Tenant has no settings row; it was not provisioned by Story 1.1');
  return { defaults: row.defaults ?? {}, version: row.version, updatedAt: row.updated_at };
}

/**
 * Every Property in the Tenant with its override set, in ONE query.
 *
 * The blast radius is computed from these rows rather than by asking the database for a
 * count per key: a count per key is N round trips that can disagree with each other
 * inside one response, and the whole value of the number is that it describes the same
 * moment the administrator is looking at.
 */
async function propertiesWithOverrides(client: PoolClient, tenantId: string): Promise<PropertyRow[]> {
  const res = await client.query<PropertyRow>(
    `SELECT p.id, p.name, p.region, p.active, ps.overrides
       FROM control_plane.properties p
       LEFT JOIN control_plane.property_settings ps
         ON ps.tenant_id = p.tenant_id AND ps.property_id = p.id
      WHERE p.tenant_id = $1
      ORDER BY p.created_at`,
    [tenantId]);
  return res.rows;
}

export async function getTenantSettings(
  client: PoolClient, tenantId: string,
): Promise<TenantSettingsView> {
  const tenant = await readTenant(client, tenantId);
  const properties = await propertiesWithOverrides(client, tenantId);
  // ACTIVE Properties only carry a blast radius. A deactivated Property accepts no new
  // work (Story 1.2 AC-3), so counting it would overstate what a change reaches - and
  // the count's only job is to be the number somebody decides on.
  const live = properties.filter((p) => p.active);

  const settings: TenantSettingView[] = SETTING_KEYS.map((key) => {
    // Widened to the interface deliberately: the literal type of the catalogue is a
    // union in which only some members carry `governance` or `maximum`, and reading
    // them off the union is a compile error rather than a bug. `SettingSpec` is the
    // shape this code is entitled to assume.
    const spec: SettingSpec = TENANT_SETTINGS[key];
    const overriding = spec.scope === 'tenant_only'
      // A Tenant-only key cannot be overridden at all, so nothing declines it and its
      // blast radius is every Property. Saying so beats showing an empty list that
      // looks like a coincidence.
      ? []
      : live.filter((p) => Object.prototype.hasOwnProperty.call(p.overrides ?? {}, key));
    return {
      key,
      value: Object.prototype.hasOwnProperty.call(tenant.defaults, key)
        ? tenant.defaults[key] : spec.value,
      scope: spec.scope,
      inheritingPropertyCount: live.length - overriding.length,
      overriddenBy: overriding.map((p) => ({
        propertyId: p.id, name: p.name, value: (p.overrides ?? {})[key],
      })),
      ...(spec.governance ? { governance: spec.governance } : {}),
      ...(spec.maximum !== undefined ? { maximum: spec.maximum } : {}),
    };
  });

  return {
    settings,
    propertyCount: live.length,
    // AC-4: shown, never settable. Every Property including deactivated ones, because
    // residency is a fact about data that outlives the Property accepting work.
    regions: properties.map((p) => ({
      propertyId: p.id, name: p.name, region: p.region, active: p.active,
    })),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}

export async function handleUpdateTenantSettings(
  client: PoolClient,
  actor: { tenantId: string; staffMemberId: string },
  body: unknown,
  now: Date,
): Promise<TenantSettingsView> {
  const tenant = await readTenant(client, actor.tenantId);
  const changes = validateTenantChange(body, tenant.defaults);
  if (changes.length === 0) return getTenantSettings(client, actor.tenantId);

  const next = { ...tenant.defaults };
  for (const change of changes) next[change.key] = change.to;

  // ONE UPDATE, and the version bump with it. Nothing is rewritten per Property:
  // inheritance is by reference (AD-9), so every Property that has not taken a key over
  // sees the new value because it was never holding the old one. That is why "applies to
  // inheriting Properties and to no others" is true by construction rather than by a
  // filter somebody has to keep correct.
  await client.query(
    `UPDATE control_plane.tenant_settings
        SET defaults = $2, version = version + 1, updated_at = $3, updated_by = $4
      WHERE tenant_id = $1`,
    [actor.tenantId, JSON.stringify(next), now.toISOString(), actor.staffMemberId]);

  // The blast radius AT THE MOMENT OF THE CHANGE, recorded - so the audit trail answers
  // "how many Properties did this actually affect", which is the question anybody asks
  // afterwards and which cannot be reconstructed later once overrides have moved.
  const after = await getTenantSettings(client, actor.tenantId);
  const radius = Object.fromEntries(
    changes.map((c) => [c.key, after.settings.find((s) => s.key === c.key)?.inheritingPropertyCount ?? 0]));

  await appendStaffEvent(client, {
    eventId: ulid(now), type: 'TenantDefaultsChanged', tenantId: actor.tenantId,
    occurredAt: now.toISOString(), recordedAt: now.toISOString(),
    payload: {
      changed: changes.map((c) => c.key),
      before: Object.fromEntries(changes.map((c) => [c.key, c.from])),
      after: Object.fromEntries(changes.map((c) => [c.key, c.to])),
      propertiesAffected: radius,
    },
  });

  // AC-3 and FR-6: actor, timestamp and PREVIOUS VALUE. Governance keys are named as
  // such in the entry, so a later reader can find every change to cross-Tenant guest
  // history or retention without knowing which keys those were at the time.
  await appendTenantAudit(client, actor.tenantId, actor.staffMemberId, 'staff_member',
    'tenant_settings.changed', {
      changed: changes.map((c) => c.key),
      governanceKeys: changes.filter((c) => specOf(c.key)?.governance).map((c) => c.key),
      before: Object.fromEntries(changes.map((c) => [c.key, c.from])),
      after: Object.fromEntries(changes.map((c) => [c.key, c.to])),
      propertiesAffected: radius,
    });

  return after;
}

// ------------------------------------------------------------- the Property surface

export interface PropertySettingsView {
  propertyId: string;
  region: string;
  regionImmutable: true;
  settings: ReturnType<typeof resolveEffective>;
}

async function readProperty(
  client: PoolClient, tenantId: string, propertyId: string,
): Promise<{ region: string; overrides: Record<string, unknown> }> {
  const res = await client.query<{ region: string; overrides: Record<string, unknown> | null }>(
    `SELECT p.region, ps.overrides
       FROM control_plane.properties p
       LEFT JOIN control_plane.property_settings ps
         ON ps.tenant_id = p.tenant_id AND ps.property_id = p.id
      WHERE p.tenant_id = $1 AND p.id = $2`,
    [tenantId, propertyId]);
  const row = res.rows[0];
  if (!row) throw new NotFound('no such Property in this Tenant');
  return { region: row.region, overrides: row.overrides ?? {} };
}

export async function getPropertySettings(
  client: PoolClient, tenantId: string, propertyId: string,
): Promise<PropertySettingsView> {
  const tenant = await readTenant(client, tenantId);
  const property = await readProperty(client, tenantId, propertyId);
  return {
    propertyId,
    region: property.region,
    // Stated in every representation, as Story 1.2 established: a client asked to
    // remember that rule on its own will eventually forget it.
    regionImmutable: true,
    settings: resolveEffective(tenant.defaults, property.overrides),
  };
}

export async function handleOverridePropertySettings(
  client: PoolClient,
  actor: { tenantId: string; staffMemberId: string },
  propertyId: string,
  body: unknown,
  now: Date,
): Promise<PropertySettingsView> {
  const property = await readProperty(client, actor.tenantId, propertyId);
  const { defaults: tenantDefaults } = await readTenant(client, actor.tenantId);
  const changes: SettingChange[] = validatePropertyOverride(body, property.overrides);
  if (changes.length === 0) return getPropertySettings(client, actor.tenantId, propertyId);

  const next = { ...property.overrides };
  for (const change of changes) next[change.key] = change.to;

  // The KEY'S PRESENCE is what stops inheritance, and it is never removed here. There is
  // no "revert to inheriting" in this story and no implicit clearing anywhere: AC-2 says
  // permanently, and the only way a key leaves this map is a story that decides it should.
  await client.query(
    `INSERT INTO control_plane.property_settings (tenant_id, property_id, inherits_version, overrides, updated_at)
     VALUES ($1, $2, (SELECT version FROM control_plane.tenant_settings WHERE tenant_id = $1), $3, $4)
     ON CONFLICT (tenant_id, property_id) DO UPDATE SET overrides = $3, updated_at = $4`,
    [actor.tenantId, propertyId, JSON.stringify(next), now.toISOString()]);

  await appendStaffEvent(client, {
    eventId: ulid(now), type: 'PropertySettingOverridden', tenantId: actor.tenantId,
    propertyId,
    occurredAt: now.toISOString(), recordedAt: now.toISOString(),
    payload: {
      changed: changes.map((c) => c.key),
      before: Object.fromEntries(changes.map((c) => [c.key, c.from ?? null])),
      after: Object.fromEntries(changes.map((c) => [c.key, c.to])),
      // What they are DECLINING, recorded at the moment they decline it - so the trail
      // says what the Tenant held then rather than what it holds now, which is the
      // question anybody reading an override a year later is actually asking.
      tenantValueDeclined: Object.fromEntries(
        changes.map((c) => [c.key, tenantValueFor(tenantDefaults, c.key)])),
    },
  });
  await appendTenantAudit(client, actor.tenantId, actor.staffMemberId, 'staff_member',
    'property_settings.overridden', {
      propertyId,
      changed: changes.map((c) => c.key),
      before: Object.fromEntries(changes.map((c) => [c.key, c.from ?? null])),
      after: Object.fromEntries(changes.map((c) => [c.key, c.to])),
    });

  return getPropertySettings(client, actor.tenantId, propertyId);
}

const tenantValueFor = (defaults: Record<string, unknown>, key: SettingKey): unknown =>
  (Object.prototype.hasOwnProperty.call(defaults, key) ? defaults[key] : TENANT_SETTINGS[key].value);

export { isInheritable };
export type { SettingKey };
