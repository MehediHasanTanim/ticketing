import { ulid } from '../ids';
import { ValidationError } from '../validation';
import { PERMISSIONS, type Permission, type PermissionSpec } from '../staff/roles';

export { ValidationError };

/**
 * DEFINING A ROLE, AND THE TWO GUARDS (Story 1.4, FR-81, AD-11).
 *
 * The PRD says this is not a form, in as many words, and the story repeats it: "a dev
 * agent that implements the guards only in the interface has implemented nothing."
 * Both guards therefore live here - pure, no I/O, no clock of its own - so they are
 * unit-testable over the WHOLE permission graph rather than a sample, and so the
 * interface and the server cannot hold two different opinions about the same question.
 *
 * The order is deliberate. ESCALATION IS CHECKED FIRST, before dependencies: a failing
 * dependency must never mask an attempt to grant a permission the caller does not
 * hold, because the escalation attempt is the one worth seeing in an audit trail.
 */

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const MAX_KEY = 64;
const MAX_NAME = 200;

/** AC-2's refusal: it must NAME the dependency, not merely refuse. */
export interface UnmetDependency {
  permission: string;
  requires: string;
}

export class DependencyUnmet extends ValidationError {
  public readonly unmet: UnmetDependency[];
  constructor(unmet: UnmetDependency[]) {
    super(
      unmet.map((u) => `${u.permission} requires ${u.requires}, which is not enabled`).join('; ')
      + '. Enable the dependency first (Story 1.4 AC-2).');
    this.unmet = unmet;
  }
}

/**
 * AC-3. Not a ValidationError: the request was well formed and the caller is not
 * wrong about anything except their own authority, so the edge answers 403 rather
 * than 400 - and `permission` names which one, because "you may not do that" with no
 * subject is a refusal nobody can act on.
 */
export class Escalation extends Error {
  public readonly permission: string;
  constructor(permission: string) {
    super(
      `you cannot grant ${permission} because you do not hold it yourself. A role is a `
      + 'Tenant-wide object, so the authority to put a permission into one has to be '
      + 'Tenant-wide too (Story 1.4 AC-3, FR-81).');
    this.permission = permission;
  }
}

/** AC-1. A conflict, not a validation failure: the request is fine, the target is not. */
export class ShippedRoleImmutable extends Error {
  constructor(key: string) {
    super(
      `${key} is a shipped role: it is duplicable and never editable, so the baseline `
      + 'Jazzware support can reason about stays the same in every Tenant (FR-81). '
      + 'Duplicate it and edit the copy.');
  }
}

export class RoleKeyTaken extends Error {}

export interface RoleState {
  key: string;
  name: string;
  isShipped: boolean;
  permissions: readonly string[];
  assignableAtTenantScope: boolean;
  recoveryApprovalThreshold: number | null;
  duplicatedFrom: string | null;
}

// --------------------------------------------------------------------- the graph

const specOf = (key: string): PermissionSpec | undefined =>
  (PERMISSIONS as Record<string, PermissionSpec | undefined>)[key];

/**
 * EVERY unmet dependency in a set, not the first.
 *
 * The operation sends a whole permission set, so fixing them one round trip at a time
 * would be a worse interface than the criterion asks for - and the interface has to
 * name "the specific dependency that must be enabled first", which it cannot do if
 * the server only tells it about one at a time.
 */
export function unmetDependencies(permissions: readonly string[]): UnmetDependency[] {
  const present = new Set(permissions);
  const unmet: UnmetDependency[] = [];
  for (const permission of permissions) {
    const spec = specOf(permission);
    if (!spec) continue;              // unknown keys are refused separately, with their own message
    for (const requires of spec.dependsOn) {
      if (!present.has(requires)) unmet.push({ permission, requires });
    }
  }
  return unmet;
}

/**
 * Validates a requested set and returns it normalised: deduplicated, sorted, and every
 * key known. Sorting is not cosmetic - it makes FR-6's "previous value" comparable, so
 * an audit entry records a real change rather than a reordering.
 */
export function normalisePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) throw new ValidationError('permissions must be an array');
  const out = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== 'string') throw new ValidationError('each permission must be a string');
    const key = raw.trim();
    if (!specOf(key)) {
      throw new ValidationError(
        `${JSON.stringify(key)} is not a permission this system has. `
        + 'Read the catalogue at GET /v1/permissions rather than inventing a key: a '
        + 'permission nobody implements confers nothing and looks like authority.');
    }
    out.add(key);
  }
  return [...out].sort();
}

// -------------------------------------------------------------------- the guards

/**
 * GUARD 1 (AC-3). Compared against the actor's TENANT-WIDE effective permissions, not
 * their session's.
 *
 * A role is a Tenant-wide object - it can be assigned at any Property, and to anyone -
 * so the authority to write a permission into one has to be Tenant-wide as well.
 * Comparing against a session scoped to one Property would let a permission held at
 * the Harbour become a Tenant-wide capability by being written into a definition that
 * somebody then assigns at the Quay. The caller already needs `role.define`, which is
 * itself Tenant-scope, so nothing legitimate is lost by the stricter comparison.
 */
export function assertNoEscalation(
  requested: readonly string[], actorHolds: ReadonlySet<string>,
): void {
  for (const permission of requested) {
    if (!actorHolds.has(permission)) throw new Escalation(permission);
  }
}

/**
 * GUARD 2 (AC-2), plus the coherence rule that makes a role mean what it says.
 *
 * A role carrying a `tenant`-scope permission MUST be assignable Tenant-wide, or that
 * permission can never be conferred by it - the role would claim an authority it can
 * never exercise. Refused rather than accepted and quietly inert: "an incoherent
 * role" is the thing the story statement exists to prevent, and an inert permission
 * in a role editor reads as a capability.
 */
export function assertCoherent(
  permissions: readonly string[], assignableAtTenantScope: boolean,
): void {
  const unmet = unmetDependencies(permissions);
  if (unmet.length > 0) throw new DependencyUnmet(unmet);

  if (!assignableAtTenantScope) {
    const tenantOnly = permissions.filter((p) => specOf(p)?.minimumScope === 'tenant');
    if (tenantOnly.length > 0) {
      throw new ValidationError(
        `${tenantOnly.join(', ')} can only be conferred by a Tenant-wide grant, so a role `
        + 'holding it must be assignable Tenant-wide. Either enable that on this role or '
        + 'remove the permission - a role that carries an authority it can never exercise '
        + 'is exactly the incoherent role this guard exists to prevent.');
    }
  }
}

// ------------------------------------------------------------------ the two acts

interface RoleEvent {
  eventId: string;
  type: 'RoleDuplicated' | 'RoleChanged';
  tenantId: string;
  /** A role belongs to a Tenant and names no Property: it is assignable at any of them. */
  propertyId: undefined;
  occurredAt: string;
  recordedAt: string;
  payload: Record<string, unknown>;
}

const assertThreshold = (v: unknown): number | null => {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
    throw new ValidationError('recoveryApprovalThreshold must be a whole number of minor units, zero or more');
  }
  return v;
};

const assertName = (v: unknown): string => {
  const name = typeof v === 'string' ? v.trim() : '';
  if (!name) throw new ValidationError('a role needs a name');
  if (name.length > MAX_NAME) throw new ValidationError(`name must be at most ${MAX_NAME} characters`);
  return name;
};

const ALLOWED_DUPLICATE_KEYS = new Set([
  'key', 'name', 'permissions', 'assignableAtTenantScope', 'recoveryApprovalThreshold',
]);
const ALLOWED_UPDATE_KEYS = new Set([
  'name', 'permissions', 'assignableAtTenantScope', 'recoveryApprovalThreshold',
]);

const assertOnlyKnownKeys = (body: Record<string, unknown>, allowed: ReadonlySet<string>): void => {
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) throw new ValidationError(`${key} is not a field of a role`);
  }
};

/**
 * DUPLICATION (AC-1, T3). The permission set is copied BY VALUE and the result is
 * independent at creation: later changes to the source do not propagate.
 *
 * Deliberately unlike Property settings, which inherit BY REFERENCE (AD-9, Story 1.2)
 * so that a Tenant default change reaches every Property that has not overridden it.
 * The story says the two behaviours are different on purpose and must not share a
 * helper, and they do not - this function copies an array, and nothing here knows what
 * `inherits_version` is.
 *
 * Both guards apply to the copy, not only to later edits. Otherwise duplicating a role
 * would be the way around the escalation guard: copy the property administrator, and
 * an administrator who holds none of its permissions has minted a role that does.
 */
export function duplicateRole(
  source: RoleState,
  body: unknown,
  actorHolds: ReadonlySet<string>,
  existingKeys: ReadonlySet<string>,
  now: Date,
  rand: () => number = Math.random,
): { role: RoleState; event: RoleEvent } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('a duplicate needs a key and a name');
  }
  const input = body as Record<string, unknown>;
  assertOnlyKnownKeys(input, ALLOWED_DUPLICATE_KEYS);

  const key = typeof input.key === 'string' ? input.key.trim() : '';
  if (!KEY_PATTERN.test(key) || key.length > MAX_KEY) {
    throw new ValidationError(
      'key must be lower-case letters, digits and underscores, starting with a letter. '
      + 'It is what staff_roles stores, so it is stable for the life of the role.');
  }
  if (existingKeys.has(key)) {
    throw new RoleKeyTaken(`a role with the key ${key} already exists in this Tenant`);
  }

  // Omitted means an exact copy, which is the ordinary case.
  const permissions = input.permissions === undefined
    ? [...source.permissions].sort()
    : normalisePermissions(input.permissions);
  const assignableAtTenantScope = input.assignableAtTenantScope === undefined
    ? source.assignableAtTenantScope
    : input.assignableAtTenantScope === true;

  // Escalation FIRST, so a failing dependency cannot mask it.
  assertNoEscalation(permissions, actorHolds);
  assertCoherent(permissions, assignableAtTenantScope);

  const role: RoleState = {
    key,
    name: assertName(input.name),
    isShipped: false,
    permissions,
    assignableAtTenantScope,
    recoveryApprovalThreshold: assertThreshold(input.recoveryApprovalThreshold),
    duplicatedFrom: source.key,
  };
  const stamp = now.toISOString();
  return {
    role,
    event: {
      eventId: ulid(now, rand),
      type: 'RoleDuplicated',
      tenantId: '',                      // filled by the handler, which knows the Tenant
      propertyId: undefined,
      occurredAt: stamp,
      recordedAt: stamp,
      payload: {
        roleKey: role.key,
        duplicatedFrom: source.key,
        sourceWasShipped: source.isShipped,
        permissions: role.permissions,
        assignableAtTenantScope: role.assignableAtTenantScope,
        recoveryApprovalThreshold: role.recoveryApprovalThreshold,
      },
    },
  };
}

/**
 * EDITING (AC-1, AC-2, AC-3, AC-4). Every field optional; `permissions` arrives whole.
 *
 * Returns the previous value alongside the new one, because FR-6 requires the audit
 * trail to record it and reconstructing it later from a delta is how "what did this
 * used to be" becomes a guess.
 */
export function editRole(
  existing: RoleState,
  body: unknown,
  actorHolds: ReadonlySet<string>,
  now: Date,
  rand: () => number = Math.random,
): { role: RoleState; before: RoleState; event: RoleEvent; changed: string[] } {
  // AC-1, refused here as well as at the database and in the route. A rule stated in
  // one place is a rule the next place forgets.
  if (existing.isShipped) throw new ShippedRoleImmutable(existing.key);

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('an edit needs at least one field');
  }
  const input = body as Record<string, unknown>;
  assertOnlyKnownKeys(input, ALLOWED_UPDATE_KEYS);
  if (Object.keys(input).length === 0) throw new ValidationError('an edit needs at least one field');

  const permissions = input.permissions === undefined
    ? [...existing.permissions].sort()
    : normalisePermissions(input.permissions);
  const assignableAtTenantScope = input.assignableAtTenantScope === undefined
    ? existing.assignableAtTenantScope
    : input.assignableAtTenantScope === true;

  // ONLY WHAT IS BEING ADDED is measured against the caller's own set. An administrator
  // who inherits a role already holding something they lack can still rename it or fix
  // an unrelated permission; what they cannot do is ADD one. Measuring the whole set
  // would make such a role permanently uneditable by anyone but its author, which is
  // not what AC-3 asks for and would quietly strand roles.
  const added = permissions.filter((p) => !existing.permissions.includes(p));
  assertNoEscalation(added, actorHolds);
  assertCoherent(permissions, assignableAtTenantScope);

  const role: RoleState = {
    ...existing,
    name: input.name === undefined ? existing.name : assertName(input.name),
    permissions,
    assignableAtTenantScope,
    recoveryApprovalThreshold: input.recoveryApprovalThreshold === undefined
      ? existing.recoveryApprovalThreshold
      : assertThreshold(input.recoveryApprovalThreshold),
  };

  const changed: string[] = [];
  if (role.name !== existing.name) changed.push('name');
  if (role.permissions.join(',') !== [...existing.permissions].sort().join(',')) changed.push('permissions');
  if (role.assignableAtTenantScope !== existing.assignableAtTenantScope) changed.push('assignableAtTenantScope');
  if (role.recoveryApprovalThreshold !== existing.recoveryApprovalThreshold) changed.push('recoveryApprovalThreshold');

  const stamp = now.toISOString();
  return {
    role,
    before: existing,
    changed,
    event: {
      eventId: ulid(now, rand),
      type: 'RoleChanged',
      tenantId: '',
      propertyId: undefined,
      occurredAt: stamp,
      recordedAt: stamp,
      payload: {
        roleKey: existing.key,
        changed,
        // FR-6: the PREVIOUS VALUE, in the event as well as the audit trail, so the
        // log answers "what did this used to be" by being read rather than replayed.
        before: {
          name: existing.name,
          permissions: [...existing.permissions].sort(),
          assignableAtTenantScope: existing.assignableAtTenantScope,
          recoveryApprovalThreshold: existing.recoveryApprovalThreshold,
        },
        after: {
          name: role.name,
          permissions: role.permissions,
          assignableAtTenantScope: role.assignableAtTenantScope,
          recoveryApprovalThreshold: role.recoveryApprovalThreshold,
        },
      },
    },
  };
}

/** The catalogue, as `GET /v1/permissions` serves it. */
export const permissionCatalogue = (): Array<{
  key: string; class: string; minimumScope: string; dependsOn: string[];
}> => Object.entries(PERMISSIONS)
  .map(([key, spec]) => ({
    key,
    class: spec.class,
    minimumScope: spec.minimumScope,
    dependsOn: [...spec.dependsOn],
  }))
  .sort((a, b) => a.key.localeCompare(b.key));

export type { Permission };
