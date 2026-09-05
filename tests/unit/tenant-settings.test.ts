import { describe, it, expect } from 'vitest';
import {
  TENANT_SETTINGS, SETTING_KEYS, specOf, isInheritable, platformDefaults,
  validateSetting, validateTenantChange, validatePropertyOverride, resolveEffective,
  ValidationError,
} from '../../core/src/tenant/settings';

/**
 * Story 1.6's pure half. The catalogue is data, so these run over ALL of it rather than
 * a sample - a setting added later is covered the moment it is declared.
 */

describe('the settings catalogue', () => {
  it('declares a type, a scope and a default for every setting', () => {
    expect(SETTING_KEYS.length).toBeGreaterThan(0);
    for (const key of SETTING_KEYS) {
      const spec = specOf(key)!;
      expect(['boolean', 'integer', 'string'], key).toContain(spec.type);
      expect(['inheritable', 'tenant_only'], key).toContain(spec.scope);
      // A default is what a Tenant holds until somebody changes it, so it must itself
      // be a value the catalogue would accept.
      expect(() => validateSetting(key, spec.value), key).not.toThrow();
    }
  });

  it('seeds a new Tenant from the catalogue, so no key exists for old Tenants only', () => {
    const defaults = platformDefaults();
    expect(Object.keys(defaults).sort()).toEqual([...SETTING_KEYS].sort());
    // The two that matter most, stated rather than implied.
    expect(defaults.crossTenantGuestHistory).toBe(false);
    expect(defaults.mfaRequired).toBe(false);
  });

  it('keeps the governance settings Tenant-only (AC-3)', () => {
    // FR-45 and DG-2 govern who may see whose data and for how long. A Property that
    // could opt out of either would make the Tenant's decision a suggestion.
    for (const key of ['crossTenantGuestHistory', 'guestDataRetentionDays', 'mfaRequired']) {
      expect(isInheritable(key), key).toBe(false);
    }
    // And every governance setting says which rule it exists for, so the audit trail can
    // mark a change as governance without a second list somebody keeps in step.
    for (const key of SETTING_KEYS) {
      const spec = specOf(key)!;
      if (spec.governance) expect(spec.scope, key).toBe('tenant_only');
    }
  });

  it('bounds retention by a platform maximum a Tenant cannot raise (DG-2)', () => {
    const spec = specOf('guestDataRetentionDays')!;
    expect(spec.maximum).toBeGreaterThan(0);
    expect(validateSetting('guestDataRetentionDays', spec.maximum!)).toBe(spec.maximum);
    expect(() => validateSetting('guestDataRetentionDays', spec.maximum! + 1))
      .toThrow(/platform maximum/);
    for (const bad of [0, -1, 1.5, '365', null]) {
      expect(() => validateSetting('guestDataRetentionDays', bad), String(bad)).toThrow(ValidationError);
    }
  });

  it('refuses a setting nobody implements, and a value of the wrong shape', () => {
    // A setting that changes nothing still LOOKS like configuration.
    expect(() => validateSetting('quietHours', '22:00')).toThrow(/not a Tenant setting/);
    expect(() => validateSetting('mfaRequired', 'true')).toThrow(ValidationError);
    expect(() => validateSetting('locale', 'fr')).toThrow(/must be one of/);
    expect(validateSetting('locale', 'ar')).toBe('ar');
  });
});

describe('changing a Tenant default', () => {
  const held = { locale: 'en', mfaRequired: false, crossTenantGuestHistory: false, guestDataRetentionDays: 365 };

  it('reports the PREVIOUS VALUE of each real change (FR-6)', () => {
    const changes = validateTenantChange({ locale: 'ar', guestDataRetentionDays: 90 }, held);
    expect(changes).toEqual([
      { key: 'locale', from: 'en', to: 'ar' },
      { key: 'guestDataRetentionDays', from: 365, to: 90 },
    ]);
  });

  it('treats re-sending the same value as no change at all', () => {
    // An audit trail that records changes which did not happen is one nobody can read
    // for the ones that did.
    expect(validateTenantChange({ locale: 'en', mfaRequired: false }, held)).toEqual([]);
  });

  it('falls back to the catalogue when a Tenant row predates a setting', () => {
    // The case migration 011 backfills: a row written before a key existed must not
    // report `undefined` as its previous value.
    const old = { locale: 'en' };
    expect(validateTenantChange({ crossTenantGuestHistory: true }, old))
      .toEqual([{ key: 'crossTenantGuestHistory', from: false, to: true }]);
  });

  it('refuses an empty change', () => {
    for (const body of [{}, null, [], 'locale']) {
      expect(() => validateTenantChange(body, held), JSON.stringify(body)).toThrow(ValidationError);
    }
  });
});

describe('overriding at a Property (AC-2, AC-3)', () => {
  it('REFUSES a Tenant-only setting rather than ignoring it', () => {
    // Silently dropping it would leave a property administrator believing their
    // Property had opted out of the Tenant's retention policy - which is exactly the
    // belief that makes a governance setting worthless.
    for (const key of ['crossTenantGuestHistory', 'guestDataRetentionDays', 'mfaRequired']) {
      try {
        validatePropertyOverride({ [key]: key === 'guestDataRetentionDays' ? 30 : true }, {});
        expect.unreachable(`${key} should have been refused`);
      } catch (err) {
        expect(err, key).toBeInstanceOf(ValidationError);
        expect((err as Error).message).toMatch(/only at Tenant level/);
        expect((err as Error).message).toMatch(/refused rather than ignored/);
      }
    }
  });

  it('accepts an inheritable one, and reports no previous value the first time', () => {
    // `from: undefined` is the honest previous value: the Property had none of its own.
    expect(validatePropertyOverride({ locale: 'ar' }, {}))
      .toEqual([{ key: 'locale', from: undefined, to: 'ar' }]);
    expect(validatePropertyOverride({ locale: 'en' }, { locale: 'ar' }))
      .toEqual([{ key: 'locale', from: 'ar', to: 'en' }]);
  });
});

describe('what is in force at a Property (T2)', () => {
  const defaults = { locale: 'en', mfaRequired: false, crossTenantGuestHistory: false, guestDataRetentionDays: 365 };

  it('inherits every key when nothing is overridden', () => {
    const resolved = resolveEffective(defaults, {});
    expect(resolved.every((s) => s.inherited)).toBe(true);
    expect(resolved.find((s) => s.key === 'locale')?.value).toBe('en');
  });

  it('shows an override AND the Tenant value it declined, side by side', () => {
    const resolved = resolveEffective(defaults, { locale: 'ar' });
    const locale = resolved.find((s) => s.key === 'locale')!;
    expect(locale.value).toBe('ar');
    expect(locale.inherited).toBe(false);
    // AC-2: the override is visible from the Property surface, and so is what it is
    // declining - otherwise "why is this different" needs two screens.
    expect(locale.tenantValue).toBe('en');
  });

  it('does NOT re-inherit when the Tenant value later changes', () => {
    // The failure this guards is modelling an override as "until the Tenant value
    // changes". Presence of the key is what stops inheritance, never a comparison.
    const overridden = { locale: 'ar' };
    expect(resolveEffective({ ...defaults, locale: 'ar' }, overridden)
      .find((s) => s.key === 'locale')?.inherited).toBe(false);
    // Even when the Tenant moves TO the same value the Property chose, and then away
    // again, the Property is still not inheriting.
    expect(resolveEffective({ ...defaults, locale: 'en' }, overridden)
      .find((s) => s.key === 'locale')?.value).toBe('ar');
  });

  it('never treats a Tenant-only setting as overridden, whatever a row says', () => {
    // Defence against a row written before the rule was: a tenant_only key present in
    // an override map confers nothing.
    const resolved = resolveEffective(defaults, { crossTenantGuestHistory: true });
    const governance = resolved.find((s) => s.key === 'crossTenantGuestHistory')!;
    expect(governance.inherited).toBe(true);
    expect(governance.value).toBe(false);
  });

  it('resolves every catalogue key, so neither surface can be missing one', () => {
    expect(resolveEffective({}, {}).map((s) => s.key).sort()).toEqual([...SETTING_KEYS].sort());
  });
});

describe('region', () => {
  it('is not a Tenant setting at all (AC-4, DG-4)', () => {
    // The strongest form of "not settable here": there is no key to set. Region is
    // chosen at Property creation and immutable thereafter, so a settings surface that
    // offered one would be offering something the system refuses in three places.
    expect(SETTING_KEYS).not.toContain('region');
    expect(specOf('region')).toBeUndefined();
    expect(() => validateSetting('region', 'us-east-1')).toThrow(/not a Tenant setting/);
    expect(() => validatePropertyOverride({ region: 'us-east-1' }, {})).toThrow(/not a Tenant setting/);
  });
});
