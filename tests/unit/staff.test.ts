import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS, ALL_PERMISSIONS, ROLE_PERMISSIONS, TENANT_ASSIGNABLE_ROLES,
  CREDENTIAL_CLASSES, resolvePermissions, shippedRoleAssignableAtScope,
  type Grant, type Permission,
} from '../../core/src/staff/roles';
import {
  inviteStaffMember, verdictForPair, SUPPORTED_LANGUAGES, ValidationError,
} from '../../core/src/staff/invite';
import { SHIPPED_ROLES } from '../../core/src/tenant/provision';

const AT = new Date('2026-09-04T12:00:00.000Z');
const fixedRand = (): number => 0.5;
/**
 * The Tenant's catalogue as `control_plane.roles` holds it, which since Story 1.4
 * carries whether each role may be held Tenant-wide - a stored fact per Tenant, not a
 * constant, because a hotel can define a role and decide that question for it.
 */
const CATALOGUE = SHIPPED_ROLES.map((r) => ({
  key: r.key,
  assignableAtTenantScope: TENANT_ASSIGNABLE_ROLES.includes(r.key),
}));
const OK = {
  name: 'Amara Okafor', languageTag: 'en',
  roles: [{ propertyId: '01P-harbour', roleKey: 'supervisor' }],
};

/**
 * Story 1.4 moved permission sets out of the build and into `control_plane.roles`, so
 * a grant now CARRIES the set the database holds. These helpers stand in for that
 * join using the shipped baseline, which is what those rows contain.
 */
const p = (roleKey: string): Grant =>
  ({ roleKey, scope: 'property', permissions: ROLE_PERMISSIONS[roleKey] ?? [] });
const t = (roleKey: string): Grant =>
  ({ roleKey, scope: 'tenant', permissions: ROLE_PERMISSIONS[roleKey] ?? [] });

describe('the shipped role set (AC-2, FR-2)', () => {
  it('offers the seven roles the criterion names, and maps every one of them', () => {
    // AC-2 says "at minimum" and this is that minimum, verbatim.
    expect(SHIPPED_ROLES.map((r) => r.key)).toEqual([
      'line_staff', 'supervisor', 'department_manager', 'front_office',
      'duty_manager', 'property_administrator', 'corporate_viewer',
    ]);
    // The two lists live in different files - Story 1.1 seeds one, this story
    // interprets the other - so a role seeded with no permissions would grant a
    // Staff Member a role that silently does nothing.
    for (const role of SHIPPED_ROLES) {
      expect(ROLE_PERMISSIONS[role.key], `${role.key} has no permission mapping`).toBeDefined();
    }
  });

  it('classifies every permission, and every class is one a credential can carry', () => {
    // PERMISSIONS is exhaustively typed, so a permission with no class is a compile
    // error; this catches the other half - a CLASS no credential type allows, which
    // would make the permission unreachable for everyone.
    const reachable = new Set(Object.values(CREDENTIAL_CLASSES).flatMap((c) => [...c]));
    for (const [key, spec] of Object.entries(PERMISSIONS)) {
      expect(reachable.has(spec.class), `${key} is classed ${spec.class}, which no credential carries`).toBe(true);
      expect(['property', 'tenant']).toContain(spec.minimumScope);
    }
  });

  it('lets only the two roles that need it be held Tenant-wide', () => {
    expect(TENANT_ASSIGNABLE_ROLES).toEqual(['property_administrator', 'corporate_viewer']);
    for (const role of SHIPPED_ROLES) {
      // A line staff role granted Tenant-wide applies at every Property in the
      // Tenant - a privilege grant nobody asked for and no screen would show.
      expect(shippedRoleAssignableAtScope(role.key, 'property'), role.key).toBe(true);
      expect(shippedRoleAssignableAtScope(role.key, 'tenant'), role.key)
        .toBe(TENANT_ASSIGNABLE_ROLES.includes(role.key));
    }
  });
});

describe('the permission decision (AC-4, AD-11)', () => {
  it('gives a Property-scoped administrator no Tenant-wide power', () => {
    const at = resolvePermissions([p('property_administrator')], 'password').permissions;
    expect(at).toContain('staff.invite');
    expect(at).toContain('property.read');
    // The refusal AC-4 is about: the Harbour's administrator cannot create - or
    // retire - a Property somewhere else in the estate.
    expect(at).not.toContain('property.create');
    expect(at).not.toContain('property.deactivate');

    const tenantWide = resolvePermissions([t('property_administrator')], 'password').permissions;
    expect(tenantWide).toContain('property.create');
    expect(tenantWide).toContain('property.deactivate');
  });

  it('LIMITS A PIN by credential type, not by role (FR-4)', () => {
    // The failure this guards is named in the story: "a PIN alone must never
    // authorise configuration or reporting surfaces - encode that as a property of
    // the credential type, not of the role, or a PIN-holding administrator becomes a
    // hole." So the same grant, twice, with only the credential changing.
    const grants = [t('property_administrator')];
    const withPassword = resolvePermissions(grants, 'password').permissions;
    const withPin = resolvePermissions(grants, 'pin').permissions;

    expect(withPassword).toContain('staff.invite');
    expect(withPassword).toContain('property.create');
    // A PIN-holding administrator gets their operational permissions and nothing else.
    expect(withPin).toEqual(['property.read']);
    expect(withPassword).toContain('role.define');
    for (const permission of withPin) {
      expect(PERMISSIONS[permission as Permission].class).toBe('operational');
    }
    // A badge is a card that can be lifted from a jacket: same limit.
    expect(resolvePermissions(grants, 'badge').permissions).toEqual(['property.read']);
  });

  it('adds nothing for a grant at another Property, because such a grant is never in scope', () => {
    // The caller passes only Tenant-wide grants plus grants at the CURRENT Property,
    // so this asserts the shape the loader guarantees: an empty set answers nothing.
    expect(resolvePermissions([], 'password').permissions).toEqual([]);
  });

  it('FAILS CLOSED on a credential type it does not know', () => {
    // A typo in a token must not become an escalation.
    const out = resolvePermissions([t('property_administrator')], 'wat' as never);
    expect(out.permissions).toEqual([]);
    expect(out.unknownPermissions).toEqual([]);
  });

  it('reports a stored permission this build does not know, rather than dropping it', () => {
    // Story 1.4's replacement for the unmapped-role diagnostic, which stopped meaning
    // anything once a Tenant could define its own roles. The hazard now is a stored
    // permission the code has never heard of - a role written by a newer build, or a
    // permission retired from the catalogue while roles still name it. It confers
    // NOTHING and it is reported, because a permission model that fails quietly is one
    // nobody finds out about until a shift cannot work.
    const out = resolvePermissions(
      [{ roleKey: 'night_auditor', scope: 'tenant', permissions: ['audit.run', 'property.read'] }],
      'password');
    expect(out.permissions).toEqual(['property.read']);
    expect(out.unknownPermissions).toEqual(['audit.run']);
  });

  it('confers a CUSTOM role\'s own set, which is the whole point of Story 1.4', () => {
    // A role nobody else's Tenant can see cannot be a constant in a shared build.
    const custom: Grant = {
      roleKey: 'night_auditor', scope: 'property',
      permissions: ['property.read', 'staff.read'],
    };
    expect(resolvePermissions([custom], 'password').permissions)
      .toEqual(['property.read', 'staff.read']);
    // And the credential still has the last word (FR-4).
    expect(resolvePermissions([custom], 'pin').permissions).toEqual(['property.read']);
  });

  it('unions the permissions of two roles at one Property', () => {
    const out = resolvePermissions([p('front_office'), p('duty_manager')], 'password').permissions;
    expect(out).toContain('property.read');
  });

  it('gives a corporate viewer reads across the Tenant and no writes', () => {
    const out = resolvePermissions([t('corporate_viewer')], 'password').permissions;
    expect(out).toContain('staff.read');
    expect(out).toContain('property.read');
    expect(out).not.toContain('staff.invite');
    expect(out).not.toContain('property.create');
    expect(out).not.toContain('property.deactivate');
  });

  it('returns a sorted, duplicate-free answer', () => {
    const out = resolvePermissions([t('property_administrator'), p('property_administrator')], 'password').permissions;
    expect(out).toEqual([...new Set(out)].sort());
    expect(out.length).toBeLessThanOrEqual(ALL_PERMISSIONS.length);
  });
});

describe('inviting a Staff Member (AC-1)', () => {
  it('creates the Staff Member with exactly the pairs requested', () => {
    const out = inviteStaffMember({
      ...OK,
      roles: [
        { propertyId: '01P-harbour', roleKey: 'supervisor' },
        { propertyId: '01P-quay', roleKey: 'line_staff' },
      ],
    }, CATALOGUE, 'admin-1', '01T-a', AT, fixedRand);
    // "exactly those roles at exactly those Properties" - nothing added, nothing
    // dropped, and one row per pair so different roles at different Properties is
    // expressible at all (AC-3 depends on it).
    expect(out.roles).toEqual([
      { propertyId: '01P-harbour', roleKey: 'supervisor', scope: 'property' },
      { propertyId: '01P-quay', roleKey: 'line_staff', scope: 'property' },
    ]);
    expect(out.events.map((e) => e.type)).toEqual(['StaffMemberInvited', 'RolesAssigned']);
    // Both events name no Property, which is AD-3's exception and why migration 008
    // adds them to the CHECK that lists the permitted ones.
    expect(out.events.every((e) => e.propertyId === undefined)).toBe(true);
  });

  it('decides the credential path from ONE field (AC-1)', () => {
    expect(inviteStaffMember({ ...OK, email: 'amara@hotel.example' }, CATALOGUE, 'a', '01T-a', AT, fixedRand)
      .credentialPath).toBe('set_up_link');
    // No address means a PIN-only account for a Shared Device.
    expect(inviteStaffMember(OK, CATALOGUE, 'a', '01T-a', AT, fixedRand).credentialPath).toBe('pin');
    expect(inviteStaffMember({ ...OK, email: '' }, CATALOGUE, 'a', '01T-a', AT, fixedRand)
      .credentialPath).toBe('pin');
  });

  it('keeps the email address OUT of the append-only event log', () => {
    const out = inviteStaffMember({ ...OK, email: 'amara@hotel.example' }, CATALOGUE, 'a', '01T-a', AT, fixedRand);
    const serialised = JSON.stringify(out.events);
    // DG-5: an address in an append-only log can never be corrected or erased. The
    // event records WHETHER there was one; the row and the outbox hold the value.
    expect(serialised).not.toContain('amara@hotel.example');
    expect(out.events[0].payload.hasEmail).toBe(true);
  });

  it('REFUSES payroll identifiers and dates of birth rather than ignoring them (DG-5)', () => {
    for (const field of ['payrollId', 'employeeNumber', 'dateOfBirth', 'dob', 'nationalId', 'salary']) {
      try {
        inviteStaffMember({ ...OK, [field]: 'x' }, CATALOGUE, 'a', '01T-a', AT, fixedRand);
        expect.unreachable(`${field} should have been refused`);
      } catch (err) {
        expect(err, field).toBeInstanceOf(ValidationError);
        // Silently dropping it is the worst of the three outcomes: the caller
        // believes it was stored and nothing holds it.
        expect((err as Error).message, field).toMatch(/DG-5/);
      }
    }
    // And anything else unexpected is refused too, which is what makes the above a
    // better message rather than the only defence.
    expect(() => inviteStaffMember({ ...OK, nickname: 'Am' }, CATALOGUE, 'a', '01T-a', AT, fixedRand))
      .toThrow(ValidationError);
  });

  it('refuses a language the product cannot render (AD-12)', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'ar']);
    for (const languageTag of ['fr', 'en-GB', '', 'EN', 'xx']) {
      expect(() => inviteStaffMember({ ...OK, languageTag }, CATALOGUE, 'a', '01T-a', AT, fixedRand), languageTag)
        .toThrow(ValidationError);
    }
    // Arabic ships in R1, so it must be acceptable here from the start.
    expect(inviteStaffMember({ ...OK, languageTag: 'ar' }, CATALOGUE, 'a', '01T-a', AT, fixedRand)
      .languageTag).toBe('ar');
  });

  it('refuses a role that is not in THIS Tenant\'s catalogue', () => {
    // Validated against the Tenant's own roles, not a constant, so Story 1.4's custom
    // roles work and another Tenant's role key does not.
    expect(() => inviteStaffMember({ ...OK, roles: [{ propertyId: '01P-a', roleKey: 'night_auditor' }] },
      CATALOGUE, 'a', '01T-a', AT, fixedRand)).toThrow(ValidationError);
    expect(() => inviteStaffMember({ ...OK, roles: [] }, CATALOGUE, 'a', '01T-a', AT, fixedRand))
      .toThrow(ValidationError);
  });

  it('reads Tenant-wide assignability from the CATALOGUE, so a custom role works too', () => {
    // The defect this covers: Story 1.3 checked a hard-coded list of the two shipped
    // roles that may be held Tenant-wide, and Story 1.4 let a hotel define one - which
    // that list could never contain. Both are `string`, so nothing but running the two
    // stories together would have found it.
    const withCustom = [...CATALOGUE, { key: 'group_auditor', assignableAtTenantScope: true }];
    expect(inviteStaffMember({ ...OK, roles: [{ roleKey: 'group_auditor' }] },
      withCustom, 'a', '01T-a', AT, fixedRand).roles).toEqual([
      { propertyId: null, roleKey: 'group_auditor', scope: 'tenant' },
    ]);
    // And a custom role that is NOT marked assignable Tenant-wide is still refused.
    expect(() => inviteStaffMember({ ...OK, roles: [{ roleKey: 'night_auditor' }] },
      [...CATALOGUE, { key: 'night_auditor', assignableAtTenantScope: false }],
      'a', '01T-a', AT, fixedRand)).toThrow(/must be assigned at a Property/);
  });

  it('refuses an operational role granted Tenant-wide, and allows the two that may be', () => {
    expect(() => inviteStaffMember({ ...OK, roles: [{ roleKey: 'line_staff' }] },
      CATALOGUE, 'a', '01T-a', AT, fixedRand)).toThrow(/must be assigned at a Property/);
    expect(inviteStaffMember({ ...OK, roles: [{ roleKey: 'corporate_viewer' }] },
      CATALOGUE, 'a', '01T-a', AT, fixedRand).roles).toEqual([
      { propertyId: null, roleKey: 'corporate_viewer', scope: 'tenant' },
    ]);
  });

  it('collapses an exact duplicate pair but keeps two roles at one Property', () => {
    const dupe = inviteStaffMember({ ...OK, roles: [
      { propertyId: '01P-a', roleKey: 'supervisor' },
      { propertyId: '01P-a', roleKey: 'supervisor' },
    ] }, CATALOGUE, 'a', '01T-a', AT, fixedRand);
    expect(dupe.roles).toHaveLength(1);
    // Holding both front office and duty manager at one Property is ordinary.
    const two = inviteStaffMember({ ...OK, roles: [
      { propertyId: '01P-a', roleKey: 'front_office' },
      { propertyId: '01P-a', roleKey: 'duty_manager' },
    ] }, CATALOGUE, 'a', '01T-a', AT, fixedRand);
    expect(two.roles).toHaveLength(2);
  });

  it('trims the name and refuses an empty or over-long one', () => {
    expect(inviteStaffMember({ ...OK, name: '  Amara  ' }, CATALOGUE, 'a', '01T-a', AT, fixedRand).name)
      .toBe('Amara');
    for (const name of ['', '   ', 'x'.repeat(201)]) {
      expect(() => inviteStaffMember({ ...OK, name }, CATALOGUE, 'a', '01T-a', AT, fixedRand)).toThrow(ValidationError);
    }
  });
});

describe('the per-pair verdict (AC-4)', () => {
  const context = {
    propertiesInTenant: new Set(['01P-harbour', '01P-quay']),
    mayInviteAtProperty: new Set(['01P-harbour']),
    mayInviteTenantWide: false,
  };
  const pair = (propertyId: string | null, roleKey = 'supervisor') =>
    ({ propertyId, roleKey, scope: propertyId ? 'property' as const : 'tenant' as const });

  it('permits a pair where the caller administers, and refuses one where they do not', () => {
    expect(verdictForPair(pair('01P-harbour'), context)).toBe('permitted');
    expect(verdictForPair(pair('01P-quay'), context)).toBe('forbidden');
  });

  it('answers NOT_FOUND for a Property in another Tenant, never forbidden', () => {
    // `forbidden` would confirm that it exists, which is exactly what a crafted
    // payload naming another Tenant's Property is fishing for.
    expect(verdictForPair(pair('01P-somewhere-else'), context)).toBe('not_found');
  });

  it('refuses a Tenant-wide grant from a caller who is not Tenant-wide', () => {
    // A property administrator at one Property creating a corporate viewer over the
    // whole estate is the escalation this exists to stop.
    expect(verdictForPair(pair(null, 'corporate_viewer'), context)).toBe('forbidden');
    expect(verdictForPair(pair(null, 'corporate_viewer'), { ...context, mayInviteTenantWide: true }))
      .toBe('permitted');
  });

  it('lets a Tenant-wide caller invite at any Property in their Tenant, and still not outside it', () => {
    const wide = { ...context, mayInviteTenantWide: true };
    expect(verdictForPair(pair('01P-quay'), wide)).toBe('permitted');
    expect(verdictForPair(pair('01P-somewhere-else'), wide)).toBe('not_found');
  });
});
