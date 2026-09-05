import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  unmetDependencies, normalisePermissions, assertNoEscalation, assertCoherent,
  duplicateRole, editRole, permissionCatalogue,
  DependencyUnmet, Escalation, ShippedRoleImmutable, RoleKeyTaken, ValidationError,
  type RoleState,
} from '../../core/src/role/define';
import {
  PERMISSIONS, ALL_PERMISSIONS, ROLE_PERMISSIONS, TENANT_ASSIGNABLE_ROLES,
  type Permission,
} from '../../core/src/staff/roles';
import { SHIPPED_ROLES } from '../../core/src/tenant/provision';

/**
 * Story 1.4, unit-tested with a fake clock and no ports.
 *
 * The PRD says this is not a form and the story repeats it: "a dev agent that
 * implements the guards only in the interface has implemented nothing." So the
 * dependency table below runs over the WHOLE graph rather than a sample, as the
 * testing note requires, and the escalation guard is exercised from three actor
 * levels rather than one.
 */

const AT = new Date('2026-09-05T09:00:00.000Z');
const fixedRand = (): number => 0.5;

const holds = (...p: string[]): Set<string> => new Set(p);
const everything = new Set<string>(ALL_PERMISSIONS);

const SHIPPED_ADMIN: RoleState = {
  key: 'property_administrator',
  name: 'Property administrator',
  isShipped: true,
  permissions: [...ROLE_PERMISSIONS.property_administrator!].sort(),
  assignableAtTenantScope: true,
  recoveryApprovalThreshold: null,
  duplicatedFrom: null,
};
const SHIPPED_LINE: RoleState = {
  key: 'line_staff',
  name: 'Line staff',
  isShipped: true,
  permissions: ['property.read'],
  assignableAtTenantScope: false,
  recoveryApprovalThreshold: null,
  duplicatedFrom: null,
};
const noKeys = new Set<string>();

describe('the permission dependency graph (AC-2, T1)', () => {
  it('is acyclic and refers only to permissions that exist', () => {
    // A cycle would make a set unsatisfiable: two permissions each waiting for the
    // other, and an editor that can never save. Cheap to assert, impossible to
    // notice by reading once the graph has a dozen entries.
    for (const [key, spec] of Object.entries(PERMISSIONS)) {
      for (const dep of spec.dependsOn) {
        expect(ALL_PERMISSIONS, `${key} depends on ${dep}, which is not a permission`).toContain(dep);
      }
    }
    const seen = new Map<string, 'visiting' | 'done'>();
    const walk = (key: string, trail: string[]): void => {
      if (seen.get(key) === 'done') return;
      expect(seen.get(key), `dependency cycle: ${[...trail, key].join(' -> ')}`).not.toBe('visiting');
      seen.set(key, 'visiting');
      for (const dep of PERMISSIONS[key as Permission].dependsOn) walk(dep, [...trail, key]);
      seen.set(key, 'done');
    };
    for (const key of ALL_PERMISSIONS) walk(key, []);
  });

  it('EVERY permission, one at a time, is refused when its dependency is absent', () => {
    // The table test the story asks for, over the whole graph rather than a sample.
    // A permission whose dependency is added later gets covered automatically.
    let checked = 0;
    for (const key of ALL_PERMISSIONS) {
      for (const dep of PERMISSIONS[key].dependsOn) {
        // The permission and its dependencies MINUS this one - so the only thing
        // wrong with the set is the dependency under test.
        const set = [key, ...PERMISSIONS[key].dependsOn.filter((d) => d !== dep)];
        const unmet = unmetDependencies(set);
        expect(unmet, `${key} without ${dep} was accepted`).toContainEqual({ permission: key, requires: dep });
        checked += 1;
      }
    }
    // A graph with no edges would make the loop above vacuous and this file green.
    expect(checked, 'the dependency graph has no edges, so this test proves nothing')
      .toBeGreaterThan(0);
  });

  it('names the SPECIFIC dependency, which is what the criterion asks for', () => {
    try {
      assertCoherent(['staff.invite', 'staff.read'], false);
      expect.unreachable('should have refused');
    } catch (err) {
      expect(err).toBeInstanceOf(DependencyUnmet);
      // AC-2: "the interface names the specific dependency that must be enabled
      // first" - which it cannot do unless the server says which one.
      expect((err as DependencyUnmet).unmet).toEqual([{ permission: 'staff.invite', requires: 'role.read' }]);
      expect((err as Error).message).toContain('role.read');
    }
  });

  it('reports EVERY unmet dependency, not the first', () => {
    // The operation sends a whole set, so fixing them one round trip at a time would
    // be a worse interface than the one the criterion describes.
    const unmet = unmetDependencies(['staff.invite', 'property.create', 'property.setup.read']);
    expect(unmet.length).toBeGreaterThan(2);
    expect(unmet).toContainEqual({ permission: 'staff.invite', requires: 'staff.read' });
    expect(unmet).toContainEqual({ permission: 'staff.invite', requires: 'role.read' });
    expect(unmet).toContainEqual({ permission: 'property.create', requires: 'property.read' });
  });

  it('accepts a set that satisfies the whole graph', () => {
    expect(unmetDependencies([...ALL_PERMISSIONS])).toEqual([]);
    expect(unmetDependencies([])).toEqual([]);
    expect(unmetDependencies(['property.read'])).toEqual([]);
  });

  it('EVERY SHIPPED ROLE is already dependency-complete', () => {
    // If a shipped role were not, a Tenant could not duplicate it without first
    // repairing it - and the baseline would be teaching everybody an invalid shape.
    for (const role of SHIPPED_ROLES) {
      const permissions = ROLE_PERMISSIONS[role.key] ?? [];
      expect(unmetDependencies(permissions), `${role.key} is not dependency-complete`).toEqual([]);
      // And coherent: a role carrying a Tenant-scope permission must be Tenant-assignable.
      expect(() => assertCoherent(permissions, TENANT_ASSIGNABLE_ROLES.includes(role.key)),
        `${role.key} is incoherent`).not.toThrow();
    }
  });

  it('serves the graph as data, so the interface and the server read one definition', () => {
    const catalogue = permissionCatalogue();
    expect(catalogue.map((c) => c.key)).toEqual([...ALL_PERMISSIONS].sort());
    for (const entry of catalogue) {
      expect(entry.dependsOn).toEqual([...PERMISSIONS[entry.key as Permission].dependsOn]);
      expect(['operational', 'configuration', 'reporting']).toContain(entry.class);
      expect(['property', 'tenant']).toContain(entry.minimumScope);
    }
  });
});

describe('the escalation guard (AC-3)', () => {
  // The three actor levels the testing note asks for.
  const superAdmin = everything;
  const limited = holds('role.read', 'role.define', 'property.read', 'staff.read');
  const lineStaff = holds('property.read');

  it('refuses a permission the actor does not hold, and NAMES it', () => {
    try {
      assertNoEscalation(['property.read', 'staff.invite'], limited);
      expect.unreachable('should have refused');
    } catch (err) {
      expect(err).toBeInstanceOf(Escalation);
      expect((err as Escalation).permission).toBe('staff.invite');
      // "You may not do that" with no subject is a refusal nobody can act on.
      expect((err as Error).message).toContain('staff.invite');
    }
  });

  it('permits exactly what the actor holds, at all three levels', () => {
    expect(() => assertNoEscalation([...ALL_PERMISSIONS], superAdmin)).not.toThrow();
    expect(() => assertNoEscalation(['property.read', 'staff.read'], limited)).not.toThrow();
    expect(() => assertNoEscalation(['property.read'], lineStaff)).not.toThrow();
    expect(() => assertNoEscalation(['staff.read'], lineStaff)).toThrow(Escalation);
  });

  it('cannot be walked around by DUPLICATING a role instead of editing one', () => {
    // The hole this closes: copy the property administrator, and an administrator who
    // holds none of its permissions has minted a role that does.
    expect(() => duplicateRole(SHIPPED_ADMIN, { key: 'sneaky', name: 'Sneaky' },
      limited, noKeys, AT, fixedRand)).toThrow(Escalation);
    expect(() => duplicateRole(SHIPPED_LINE, { key: 'fine', name: 'Fine' },
      limited, noKeys, AT, fixedRand)).not.toThrow();
  });

  it('is checked BEFORE dependencies, so a bad set cannot mask an escalation', () => {
    // Both wrong: staff.invite is escalated AND its dependencies are absent. The
    // escalation is the one worth seeing in an audit trail, so it must win.
    expect(() => duplicateRole(SHIPPED_LINE,
      { key: 'both', name: 'Both wrong', permissions: ['property.read', 'staff.invite'] },
      limited, noKeys, AT, fixedRand)).toThrow(Escalation);
  });

  it('measures only what is being ADDED on an edit, not the whole set', () => {
    // An administrator who inherits a role already holding something they lack can
    // still rename it. Measuring the whole set would strand such roles permanently.
    const inherited: RoleState = {
      key: 'inherited', name: 'Inherited', isShipped: false,
      permissions: ['property.read', 'staff.read', 'role.read', 'staff.invite'],
      assignableAtTenantScope: false, recoveryApprovalThreshold: null, duplicatedFrom: null,
    };
    expect(() => editRole(inherited, { name: 'Renamed' }, limited, AT, fixedRand)).not.toThrow();
    // But they cannot ADD one they lack.
    expect(() => editRole(inherited, {
      permissions: [...inherited.permissions, 'property.setup.read'],
    }, limited, AT, fixedRand)).toThrow(Escalation);
  });
});

describe('duplication (AC-1, T3)', () => {
  it('copies the permission set BY VALUE and records its source', () => {
    const { role, event } = duplicateRole(SHIPPED_ADMIN,
      { key: 'gm', name: 'General manager' }, everything, noKeys, AT, fixedRand);
    expect(role.permissions).toEqual(SHIPPED_ADMIN.permissions);
    expect(role.duplicatedFrom).toBe('property_administrator');
    expect(role.isShipped).toBe(false);
    expect(event.type).toBe('RoleDuplicated');
    // A role belongs to a Tenant and names no Property (AD-3's named exception).
    expect(event.propertyId).toBeUndefined();
  });

  it('is INDEPENDENT of its source: mutating the source afterwards changes nothing', () => {
    // By VALUE, deliberately unlike Property settings which inherit by reference
    // (AD-9, Story 1.2). The story says the two behaviours must not share a helper,
    // and this is the assertion that would notice if they ever did.
    const source: RoleState = { ...SHIPPED_LINE, isShipped: false, permissions: ['property.read'] };
    const { role } = duplicateRole(source, { key: 'copy', name: 'Copy' },
      everything, noKeys, AT, fixedRand);
    (source.permissions as string[]).push('staff.read');
    expect(role.permissions).toEqual(['property.read']);
  });

  it('applies both guards to the copy, and copies Tenant-assignability from the source', () => {
    const { role } = duplicateRole(SHIPPED_ADMIN, { key: 'gm2', name: 'GM' },
      everything, noKeys, AT, fixedRand);
    expect(role.assignableAtTenantScope).toBe(true);
    // Copy-then-change in one step is allowed, and the dependency guard applies to it.
    expect(() => duplicateRole(SHIPPED_ADMIN,
      { key: 'gm3', name: 'GM', permissions: ['staff.invite'] },
      everything, noKeys, AT, fixedRand)).toThrow(DependencyUnmet);
  });

  it('refuses a key that is taken, malformed, or over-long', () => {
    expect(() => duplicateRole(SHIPPED_LINE, { key: 'line_staff', name: 'x' },
      everything, new Set(['line_staff']), AT, fixedRand)).toThrow(RoleKeyTaken);
    for (const key of ['', 'Line Staff', '1staff', 'line-staff', 'a'.repeat(65)]) {
      expect(() => duplicateRole(SHIPPED_LINE, { key, name: 'x' },
        everything, noKeys, AT, fixedRand), key).toThrow(ValidationError);
    }
  });

  it('refuses a field that is not part of a role', () => {
    expect(() => duplicateRole(SHIPPED_LINE,
      { key: 'ok', name: 'x', isShipped: true } as Record<string, unknown>,
      everything, noKeys, AT, fixedRand)).toThrow(/not a field of a role/);
  });

  it('refuses a permission key nobody implements', () => {
    // A permission that confers nothing still LOOKS like authority in a role editor.
    expect(() => duplicateRole(SHIPPED_LINE,
      { key: 'ok', name: 'x', permissions: ['property.read', 'jobs.delete_everything'] },
      everything, noKeys, AT, fixedRand)).toThrow(/not a permission this system has/);
  });
});

describe('editing (AC-1, AC-4)', () => {
  const custom: RoleState = {
    key: 'night_auditor', name: 'Night auditor', isShipped: false,
    permissions: ['property.read'], assignableAtTenantScope: false,
    recoveryApprovalThreshold: null, duplicatedFrom: 'line_staff',
  };

  it('REFUSES a shipped role outright', () => {
    // AC-1: duplicable but not editable, so the baseline support reasons about stays
    // intact. Refused in the aggregate, in the handler and at the database.
    expect(() => editRole(SHIPPED_ADMIN, { name: 'Renamed' }, everything, AT, fixedRand))
      .toThrow(ShippedRoleImmutable);
    expect(() => editRole(SHIPPED_LINE, { recoveryApprovalThreshold: 500 }, everything, AT, fixedRand))
      .toThrow(ShippedRoleImmutable);
  });

  it('records the PREVIOUS VALUE, which is what FR-6 asks for', () => {
    const { event, before, changed } = editRole(custom,
      { name: 'Night audit', permissions: ['property.read', 'staff.read'] },
      everything, AT, fixedRand);
    expect(changed.sort()).toEqual(['name', 'permissions']);
    expect(before.name).toBe('Night auditor');
    expect(event.payload.before).toEqual({
      name: 'Night auditor', permissions: ['property.read'],
      assignableAtTenantScope: false, recoveryApprovalThreshold: null,
    });
    expect(event.payload.after).toEqual({
      name: 'Night audit', permissions: ['property.read', 'staff.read'],
      assignableAtTenantScope: false, recoveryApprovalThreshold: null,
    });
    expect(event.occurredAt).toBe(AT.toISOString());
  });

  it('reports NO change when the same set is re-sent in a different order', () => {
    // Sorting is not cosmetic: it is what makes "previous value" a comparison rather
    // than a diff of orderings, so an audit trail records real changes only.
    const { changed } = editRole({ ...custom, permissions: ['staff.read', 'property.read'] },
      { permissions: ['property.read', 'staff.read'] }, everything, AT, fixedRand);
    expect(changed).toEqual([]);
  });

  it('stores the Recovery approval threshold and routes nothing (FR-43)', () => {
    const { role, changed } = editRole(custom, { recoveryApprovalThreshold: 2500 },
      everything, AT, fixedRand);
    expect(role.recoveryApprovalThreshold).toBe(2500);
    expect(changed).toEqual(['recoveryApprovalThreshold']);
    // Explicit null clears it; a negative or fractional value is refused.
    expect(editRole({ ...custom, recoveryApprovalThreshold: 10 },
      { recoveryApprovalThreshold: null }, everything, AT, fixedRand).role.recoveryApprovalThreshold).toBeNull();
    for (const bad of [-1, 1.5, '500']) {
      expect(() => editRole(custom, { recoveryApprovalThreshold: bad }, everything, AT, fixedRand), String(bad))
        .toThrow(ValidationError);
    }
  });

  it('refuses an incoherent role: a Tenant-scope permission it can never confer', () => {
    // property.create is only ever conferred by a Tenant-wide grant, so a role that is
    // not Tenant-assignable would carry an authority it can never exercise. "An
    // incoherent role" is what the story statement exists to prevent, and an inert
    // permission in an editor reads as a capability.
    expect(() => editRole(custom,
      { permissions: ['property.read', 'property.create'] }, everything, AT, fixedRand))
      .toThrow(/assignable Tenant-wide/);
    // Enabling both together is fine.
    expect(() => editRole(custom, {
      permissions: ['property.read', 'property.create'], assignableAtTenantScope: true,
    }, everything, AT, fixedRand)).not.toThrow();
  });

  it('refuses an empty edit and an unknown field', () => {
    expect(() => editRole(custom, {}, everything, AT, fixedRand)).toThrow(ValidationError);
    expect(() => editRole(custom, { key: 'renamed' } as Record<string, unknown>, everything, AT, fixedRand))
      .toThrow(/not a field of a role/);
  });
});

describe('normalisation', () => {
  it('deduplicates and sorts, so a previous value is comparable', () => {
    expect(normalisePermissions(['staff.read', 'property.read', 'staff.read']))
      .toEqual(['property.read', 'staff.read']);
  });
  it('refuses a non-array and a non-string member', () => {
    expect(() => normalisePermissions('property.read')).toThrow(ValidationError);
    expect(() => normalisePermissions([1])).toThrow(ValidationError);
  });
});

describe('the shipped baseline and the migration that backfilled it', () => {
  it('agree, permission for permission', () => {
    // TWO SOURCES, one meaning. `core/src/staff/roles.ts` is what Story 1.1 seeds a
    // NEW Tenant with; migration 009 wrote the same sets into every Tenant that
    // already existed. Drift between a constant and a migration is the kind that
    // surprises one Tenant and not the others, so it fails here instead.
    const sql = readFileSync(join(__dirname, '..', '..', 'ops', 'migrations', '009_custom_roles.sql'), 'utf8');
    const fromMigration = new Map<string, string[]>();
    const statement = /UPDATE control_plane\.roles SET permissions = ARRAY\[([^\]]*)\][\s\S]*?key (?:IN \(([^)]*)\)|= '([a-z_]+)')/g;
    for (const m of sql.matchAll(statement)) {
      const permissions = [...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!).sort();
      const keys = m[3] ? [m[3]] : [...m[2]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
      for (const key of keys) fromMigration.set(key, permissions);
    }
    // If the regex ever stops matching, this test must fail rather than pass vacuously.
    expect(fromMigration.size, 'no backfill statements found in migration 009')
      .toBe(SHIPPED_ROLES.length);
    for (const role of SHIPPED_ROLES) {
      expect(fromMigration.get(role.key), `${role.key} backfill`)
        .toEqual([...(ROLE_PERMISSIONS[role.key] ?? [])].sort());
    }
  });

  it('agree about which roles may be held Tenant-wide', () => {
    const sql = readFileSync(join(__dirname, '..', '..', 'ops', 'migrations', '009_custom_roles.sql'), 'utf8');
    for (const role of SHIPPED_ROLES) {
      const expected = TENANT_ASSIGNABLE_ROLES.includes(role.key);
      // The migration sets the flag only where it is true, so its presence beside a
      // role key is the assertion.
      const setsIt = new RegExp(`assignable_at_tenant_scope = true[\\s\\S]{0,200}?key = '${role.key}'`).test(sql);
      expect(setsIt, `${role.key} Tenant-assignability`).toBe(expected);
    }
  });
});
