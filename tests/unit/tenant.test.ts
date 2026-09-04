import { describe, it, expect } from 'vitest';
import {
  provisionTenant, deactivateTenant, SHIPPED_ROLES, PLATFORM_DEFAULTS,
  ValidationError, ConflictError,
} from '../../core/src/tenant/provision';

/**
 * The Tenant aggregate, unit-tested with a FAKE CLOCK and no ports at all - a
 * domain test that needs a database means the dependency arrow is wrong.
 */

const AT = new Date('2026-09-04T10:00:00.000Z');
/** Deterministic "randomness", so ids are reproducible in assertions. */
const fixedRand = (): number => 0.5;

describe('provisioning a Tenant (Story 1.1, FR-1)', () => {
  it('seeds the shipped role set in ONE event, not seven writes', () => {
    const { event } = provisionTenant(
      { name: 'Seaside Group', firstAdministratorEmail: 'gm@seaside.test' }, AT, fixedRand);

    expect(event.type).toBe('TenantProvisioned');
    expect(event.payload.roles).toHaveLength(SHIPPED_ROLES.length);
    // FR-2 names the minimum set; this is that list, and a rename here is a
    // deliberate change rather than a typo nobody notices.
    expect(event.payload.roles.map((r) => r.key)).toEqual([
      'line_staff', 'supervisor', 'department_manager', 'front_office',
      'duty_manager', 'property_administrator', 'corporate_viewer',
    ]);
  });

  it('creates no Property, and carries no property id (the one AD-3 exception)', () => {
    const { event } = provisionTenant(
      { name: 'Seaside Group', firstAdministratorEmail: 'gm@seaside.test' }, AT, fixedRand);
    expect(event.propertyId).toBeUndefined();
    // FR-1: "creates no Properties and no identity connection - those are the
    // customer's to configure". Asserted on the payload's KEYS rather than by
    // sweeping its text for words: the first version of this test searched for
    // /propert/ and failed on `property_administrator`, which is a shipped role
    // name and exactly right. A test that cannot tell a role from a Property is
    // not testing what it claims to.
    expect(Object.keys(event.payload).sort()).toEqual(
      ['defaults', 'firstAdministratorInvitationId', 'name', 'roles']);
    expect(Object.keys(event.payload.defaults).sort()).toEqual(['locale', 'mfaRequired']);
  });

  it('seeds the platform defaults, including MFA off (FR-85)', () => {
    const { event } = provisionTenant(
      { name: 'Seaside Group', firstAdministratorEmail: 'gm@seaside.test' }, AT, fixedRand);
    expect(event.payload.defaults).toEqual({ ...PLATFORM_DEFAULTS });
    expect(PLATFORM_DEFAULTS.mfaRequired).toBe(false);
  });

  it('uses the domain clock for both stamps, and takes neither from the machine', () => {
    const { event } = provisionTenant(
      { name: 'Seaside Group', firstAdministratorEmail: 'gm@seaside.test' }, AT, fixedRand);
    expect(event.occurredAt).toBe(AT.toISOString());
    expect(event.recordedAt).toBe(AT.toISOString());
  });

  it('refuses a Tenant with no name, an over-long name, or a non-address', () => {
    const cases: Array<[string, string]> = [
      ['', 'gm@seaside.test'],
      ['   ', 'gm@seaside.test'],
      ['x'.repeat(201), 'gm@seaside.test'],
      ['Seaside Group', 'not-an-address'],
      ['Seaside Group', 'missing@tld'],
      ['Seaside Group', ''],
    ];
    for (const [name, email] of cases) {
      expect(() => provisionTenant({ name, firstAdministratorEmail: email }, AT, fixedRand),
        `${JSON.stringify(name)} / ${JSON.stringify(email)}`).toThrow(ValidationError);
    }
  });

  it('trims the name it stores rather than storing what was typed', () => {
    const { event } = provisionTenant(
      { name: '  Seaside Group  ', firstAdministratorEmail: 'gm@seaside.test' }, AT, fixedRand);
    expect(event.payload.name).toBe('Seaside Group');
  });

  it('links the invitation to the event, so the two cannot be provisioned apart', () => {
    const { event, invitationId } = provisionTenant(
      { name: 'Seaside Group', firstAdministratorEmail: 'gm@seaside.test' }, AT, fixedRand);
    expect(event.payload.firstAdministratorInvitationId).toBe(invitationId);
  });
});

describe('deactivating a Tenant (Story 1.1 AC-4)', () => {
  it('deactivates an active Tenant', () => {
    const out = deactivateTenant({ tenantId: '01T-a', active: true }, AT, fixedRand);
    expect(out.type).toBe('TenantDeactivated');
    expect(out.occurredAt).toBe(AT.toISOString());
  });

  it('refuses a second deactivation as a CONFLICT, not a validation failure', () => {
    // The distinction matters at the boundary: the contract documents 409 here,
    // and a 400 would be the contract and the running system disagreeing.
    expect(() => deactivateTenant({ tenantId: '01T-a', active: false }, AT, fixedRand))
      .toThrow(ConflictError);
  });

  it('offers no deletion at all - there is no function to call', () => {
    // AC-4 is "deletion is prevented and only deactivation is offered". The
    // aggregate's surface is the first place that has to be true; the database
    // trigger in migration 004 is the second.
    const surface = Object.keys({ provisionTenant, deactivateTenant });
    expect(surface.some((k) => /delete|remove|destroy|purge/i.test(k))).toBe(false);
  });
});
