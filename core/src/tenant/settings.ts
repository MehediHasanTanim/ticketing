import { ValidationError } from '../validation';

export { ValidationError };

/**
 * TENANT DEFAULTS, AS A DECLARED CATALOGUE (Story 1.6, FR-83).
 *
 * The catalogue is data for the same reason the permission graph is (Story 1.4): the
 * Tenant surface, the Property surface and the server all have to agree about what a
 * setting IS, and three places that each know it separately are three places that
 * drift. The structure note says it outright - "one settings-resolution function serves
 * both surfaces - the Property view and the Tenant view must never disagree about what
 * is in force" - and a shared catalogue is what makes one function possible.
 *
 * Pure: no I/O, no clock, no store. The counts come from the database; the meaning
 * comes from here.
 */

/**
 * `inheritable` - a Property may take it over, permanently (AD-9, AC-2).
 * `tenant_only` - settable ONLY at Tenant level, and an attempt to override it at a
 *   Property is REFUSED rather than ignored. Cross-Tenant guest history and retention
 *   are here because AC-3 puts them here: they govern who may see whose data and for
 *   how long, which is not a per-Property decision.
 */
export type SettingScope = 'inheritable' | 'tenant_only';

export interface SettingSpec {
  readonly type: 'boolean' | 'integer' | 'string';
  readonly scope: SettingScope;
  /** The platform default: what a Tenant holds until somebody changes it. */
  readonly value: boolean | number | string;
  /**
   * Present on the settings AC-3 calls governance. Naming the rule in the catalogue is
   * what lets the audit trail mark a change as governance without a second list
   * somebody has to keep in step.
   */
  readonly governance?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly allowed?: readonly string[];
}

/**
 * EVERY Tenant default this product has today, and no more.
 *
 * There is exactly ONE inheritable default at this point, and that is the honest state
 * of the system rather than a thin implementation: SLA targets arrive in Story 1.8 and
 * escalation in 1.9, and inventing placeholder defaults now would be designing those
 * stories from inside this one. What matters is that the MECHANISM is general - adding
 * a default is a line here, and the blast radius, the override path, the validation and
 * both surfaces pick it up without another edit.
 */
export const TENANT_SETTINGS = {
  locale: {
    type: 'string',
    scope: 'inheritable',
    value: 'en',
    allowed: ['en', 'ar'],
  },
  mfaRequired: {
    type: 'boolean',
    // FR-85 makes this a TENANT-WIDE enforcement decision, so it is not inheritable: a
    // Property that could opt out would make the Tenant's requirement a suggestion.
    scope: 'tenant_only',
    value: false,
  },
  crossTenantGuestHistory: {
    type: 'boolean',
    scope: 'tenant_only',
    value: false,
    governance:
      'FR-45: whether one guest\'s history is visible across the Properties of this '
      + 'Tenant. Off until somebody decides otherwise, because a default that widened '
      + 'who can see a guest would be a decision nobody made.',
  },
  guestDataRetentionDays: {
    type: 'integer',
    scope: 'tenant_only',
    value: 365,
    minimum: 1,
    maximum: 730,
    governance:
      'DG-2: how long guest data is kept, Tenant-configurable within a platform '
      + 'maximum. The PRD states neither figure, so 365 and 730 are PROPOSED rather '
      + 'than settled. And NOTHING ENFORCES THEM YET - no purge exists until the story '
      + 'that owns erasure - so this is a stored commitment, not a running one.',
  },
} as const satisfies Record<string, SettingSpec>;

export type SettingKey = keyof typeof TENANT_SETTINGS;

export const SETTING_KEYS = Object.keys(TENANT_SETTINGS) as SettingKey[];

/**
 * Widened to `SettingSpec` on the way out, deliberately: the catalogue's literal type
 * is a union in which only some members carry `governance` or `maximum`, and reading
 * those off the union is a compile error rather than a bug. This is the shape a caller
 * is entitled to assume.
 */
export const specOf = (key: string): SettingSpec | undefined =>
  (TENANT_SETTINGS as Record<string, SettingSpec | undefined>)[key];

export const isInheritable = (key: string): boolean => specOf(key)?.scope === 'inheritable';

/**
 * What a new Tenant is seeded with, DERIVED from the catalogue rather than restated -
 * so a key added here reaches new Tenants without a second edit somebody has to
 * remember. That second edit is exactly how a setting comes to exist for old Tenants
 * and not new ones, or the reverse.
 */
export const platformDefaults = (): Record<string, boolean | number | string> =>
  Object.fromEntries(SETTING_KEYS.map((k) => [k, TENANT_SETTINGS[k].value]));

/** One field of a change, with what it was - FR-6 wants the previous value. */
export interface SettingChange {
  key: SettingKey;
  from: unknown;
  to: boolean | number | string;
}

/** One value, checked against its own declaration. */
export function validateSetting(key: string, value: unknown): boolean | number | string {
  const spec = specOf(key);
  if (!spec) {
    throw new ValidationError(
      `${JSON.stringify(key)} is not a Tenant setting. Read the catalogue at `
      + 'GET /v1/tenant-settings rather than inventing a key: a setting nobody reads '
      + 'changes nothing and looks like configuration.');
  }
  if (spec.type === 'boolean') {
    if (typeof value !== 'boolean') throw new ValidationError(`${key} must be true or false`);
    return value;
  }
  if (spec.type === 'integer') {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new ValidationError(`${key} must be a whole number of days`);
    }
    if (spec.minimum !== undefined && value < spec.minimum) {
      throw new ValidationError(`${key} must be at least ${spec.minimum}`);
    }
    if (spec.maximum !== undefined && value > spec.maximum) {
      // The platform maximum is a ceiling the Tenant cannot raise: DG-2 is a platform
      // commitment, and a Tenant that could set it to a decade would be making one on
      // Jazzware's behalf.
      throw new ValidationError(`${key} must be at most ${spec.maximum}, which is the platform maximum`);
    }
    return value;
  }
  if (typeof value !== 'string') throw new ValidationError(`${key} must be text`);
  if (spec.allowed && !spec.allowed.includes(value)) {
    throw new ValidationError(`${key} must be one of ${spec.allowed.join(', ')}`);
  }
  return value;
}

const currentValue = (held: Record<string, unknown>, key: SettingKey): unknown =>
  (Object.prototype.hasOwnProperty.call(held, key) ? held[key] : undefined);

const changesFrom = (
  input: unknown, held: Record<string, unknown>, fallbackToCatalogue: boolean,
): SettingChange[] => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('a settings change needs at least one setting');
  }
  const body = input as Record<string, unknown>;
  const entries = Object.entries(body);
  if (entries.length === 0) throw new ValidationError('a settings change needs at least one setting');

  const changes: SettingChange[] = [];
  for (const [key, raw] of entries) {
    const to = validateSetting(key, raw);
    const from = fallbackToCatalogue
      ? currentValue(held, key as SettingKey) ?? TENANT_SETTINGS[key as SettingKey].value
      : currentValue(held, key as SettingKey);
    // Re-sending the same value is IDEMPOTENT, not a change: an audit trail that
    // records changes which did not happen is one nobody can read for the ones that did.
    if (from === to) continue;
    changes.push({ key: key as SettingKey, from, to });
  }
  return changes;
};

/** A whole patch of Tenant defaults, validated together and reduced to real changes. */
export const validateTenantChange = (
  input: unknown, current: Record<string, unknown>,
): SettingChange[] => changesFrom(input, current, true);

/**
 * A Property override, which is a narrower thing than a Tenant change.
 *
 * REFUSED for a `tenant_only` setting rather than ignored (AC-3). Silently dropping it
 * would leave a property administrator believing their Property had opted out of the
 * Tenant's retention policy - which is precisely the belief that makes a governance
 * setting worthless.
 *
 * `from` is `undefined` when the Property was still inheriting, and that is the honest
 * previous value: it had none of its own.
 */
export function validatePropertyOverride(
  input: unknown, currentOverrides: Record<string, unknown>,
): SettingChange[] {
  const changes = changesFrom(input, currentOverrides, false);
  for (const change of changes) {
    // Through `specOf`, which widens the catalogue's literal union: reading an optional
    // member off the union itself is a compile error rather than a bug.
    const spec = specOf(change.key)!;
    if (spec.scope === 'tenant_only') {
      throw new ValidationError(
        `${change.key} is settable only at Tenant level. `
        + (spec.governance ?? 'It applies to the whole Tenant by design.')
        + ' A Property cannot opt out of it, and this is refused rather than ignored so '
        + 'nobody believes it was applied.');
    }
  }
  return changes;
}

/**
 * WHAT IS IN FORCE at one Property. The single resolution the structure note demands:
 * the Tenant surface and the Property surface both render from this, so they cannot
 * disagree about what a Property is actually running.
 *
 * An override is PERMANENT, and it is the KEY'S PRESENCE that records it - never a
 * comparison of values. A Property that overrode a key to the same value the Tenant
 * happened to hold has still declined it, and a later Tenant change must not reach it.
 * There is deliberately no "re-inherit" operation in this story; adding one would be a
 * deliberate act with its own audit entry, not a side effect of a Tenant change.
 */
export interface ResolvedSetting {
  key: SettingKey;
  value: boolean | number | string;
  /** False when this Property has taken the setting over. */
  inherited: boolean;
  scope: SettingScope;
  /** The Tenant's value, shown beside an override so the difference is visible (AC-2). */
  tenantValue: boolean | number | string;
}

export function resolveEffective(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>,
): ResolvedSetting[] {
  return SETTING_KEYS.map((key) => {
    const spec = TENANT_SETTINGS[key];
    const tenantValue = (Object.prototype.hasOwnProperty.call(defaults, key)
      ? defaults[key] : spec.value) as boolean | number | string;
    // A tenant_only setting can never have been overridden, so it is always inherited -
    // asserted here rather than assumed, in case a row was written before the rule was.
    const overridden = spec.scope === 'inheritable'
      && Object.prototype.hasOwnProperty.call(overrides, key);
    return {
      key,
      value: overridden ? overrides[key] as boolean | number | string : tenantValue,
      inherited: !overridden,
      scope: spec.scope,
      tenantValue,
    };
  });
}
