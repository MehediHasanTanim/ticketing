/**
 * THE PERMISSION MODEL (Story 1.3 T4, AD-11, FR-2, FR-4).
 *
 * AD-11: permission is a server decision, and the interface only hides what the
 * server would refuse. That requires exactly ONE place where a permission question
 * is answered - two answers is how a hidden button becomes a security bug - and this
 * is the pure half of that place. `edge/src/authorise.ts` is the only caller and
 * every gated route goes through it.
 *
 * Pure: no I/O, no clock. The grants come from the database, the answer comes from
 * here, and both halves are unit-testable without a server.
 */

/**
 * FR-4's requirement, encoded where it cannot be forgotten: "a PIN alone must never
 * authorise configuration or reporting surfaces - encode that as a property of the
 * CREDENTIAL TYPE, not of the role, or a PIN-holding administrator becomes a hole."
 *
 * So every permission declares a class, every credential type declares which classes
 * it may carry, and the two are multiplied. A permission added later is classified at
 * the moment it is declared and gets the right PIN treatment for free; a permission
 * added WITHOUT a class is a compile error, because PERMISSIONS is exhaustively typed.
 */
export type PermissionClass = 'operational' | 'configuration' | 'reporting';

/**
 * Whether a grant AT ONE PROPERTY is enough, or whether the permission needs
 * authority over the whole Tenant. `property` means either scope confers it; `tenant`
 * means only a Tenant-wide grant does.
 *
 * Creating and deactivating a Property are `tenant` deliberately: a property
 * administrator responsible for the Harbour should not be able to create - or retire -
 * a Property somewhere else in the estate, and AC-4 asks precisely for the refusal to
 * be server-side rather than an absent menu item.
 */
export type GrantScope = 'tenant' | 'property';

export interface PermissionSpec {
  readonly class: PermissionClass;
  readonly minimumScope: GrantScope;
}

/**
 * Only what this product can actually do today. A speculative permission is worse
 * than a missing one: it reads as a capability, nothing grants it, and the first
 * story that needs it inherits a name chosen before the surface existed.
 */
export const PERMISSIONS = {
  // A handset needs its Property's name, timezone and currency, so this is
  // operational and a PIN carries it.
  'property.read': { class: 'operational', minimumScope: 'property' },
  'property.create': { class: 'configuration', minimumScope: 'tenant' },
  'property.deactivate': { class: 'configuration', minimumScope: 'tenant' },
  'property.setup.read': { class: 'configuration', minimumScope: 'property' },
  'staff.invite': { class: 'configuration', minimumScope: 'property' },
  'staff.read': { class: 'configuration', minimumScope: 'property' },
  'role.read': { class: 'configuration', minimumScope: 'property' },
} as const satisfies Record<string, PermissionSpec>;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/**
 * FR-2's shipped role set mapped to what it may do. Keyed by the role keys Story 1.1
 * seeds per Tenant (core/src/tenant/provision.ts), so the two lists cannot drift
 * without a test noticing - tests/unit/staff.test.ts asserts every shipped role
 * appears here.
 *
 * The five operational roles hold the same permissions TODAY because the surfaces
 * that distinguish a supervisor from a room attendant are Jobs (Epic 3) and Room
 * Status (Epic 2), which do not exist yet. Giving them invented differences now would
 * be designing those epics from inside this one.
 */
export const ROLE_PERMISSIONS: Readonly<Record<string, readonly Permission[]>> = {
  line_staff: ['property.read'],
  supervisor: ['property.read'],
  department_manager: ['property.read'],
  front_office: ['property.read'],
  duty_manager: ['property.read'],
  property_administrator: [
    'property.read', 'property.create', 'property.deactivate', 'property.setup.read',
    'staff.invite', 'staff.read', 'role.read',
  ],
  // A VIEWER: reads, never writes. Its authority is the Tenant (AC-5), which is why
  // it is one of the two roles assignable Tenant-wide.
  corporate_viewer: ['property.read', 'staff.read'],
};

/**
 * Which roles may be held across the whole Tenant rather than at one Property.
 *
 * `corporate_viewer` because AC-5 says so: a corporate-scoped Staff Member reads
 * records from Properties within their own Tenant, which is not a statement about one
 * Property. `property_administrator` because FR-1 has a Tenant's FIRST administrator
 * created before any Property exists, so there is no Property to scope them to - and
 * because someone has to be able to create the second Property.
 *
 * Everything else is refused. A line staff role granted Tenant-wide would be a
 * privilege grant across every Property that nobody asked for and no screen would
 * show.
 */
export const TENANT_ASSIGNABLE_ROLES: readonly string[] = ['property_administrator', 'corporate_viewer'];

export type CredentialType = 'sso' | 'password' | 'pin' | 'badge' | 'fixture';

/**
 * FR-4, as the one table that decides it.
 *
 * A PIN is four to six digits typed on a handset that lives in a corridor, shared
 * between shifts. It signs someone in to do their work; it does not authorise
 * configuration or reporting, whatever role its holder has. A badge is the same
 * argument - it is a card that can be lifted from a jacket.
 *
 * `password` carries everything: it is the administrator fallback FR-1 makes
 * structural, and limiting it would leave a Tenant's first administrator unable to
 * configure the Tenant they were just given.
 */
export const CREDENTIAL_CLASSES: Readonly<Record<CredentialType, readonly PermissionClass[]>> = {
  sso: ['operational', 'configuration', 'reporting'],
  password: ['operational', 'configuration', 'reporting'],
  pin: ['operational'],
  badge: ['operational'],
  // Story 1.0's stub, refused unless FIXTURE_AUTH=1 and removed by Story 1.5. It is
  // not limited, because what it stands in for is "whatever the isolation gate needs
  // to be" - and because a fixture credential that silently held fewer permissions
  // than the real thing would make the gate pass for the wrong reason.
  fixture: ['operational', 'configuration', 'reporting'],
};

/** One row of `control_plane.staff_roles`, as the decision point needs it. */
export interface Grant {
  readonly roleKey: string;
  /** `tenant` when the stored `property_id` is NULL. */
  readonly scope: GrantScope;
}

export interface Resolution {
  readonly permissions: Permission[];
  /**
   * Role keys the caller holds that this module has no mapping for. Story 1.4 brings
   * custom roles, whose permissions live in the database rather than here, so an
   * unmapped key will be normal then. Until it is, an unmapped key means a role was
   * seeded that nobody classified - so it is RETURNED rather than silently conferring
   * nothing, and the edge logs it. A permission model that fails quietly is one
   * nobody finds out about until a shift cannot work.
   */
  readonly unmappedRoles: string[];
}

/**
 * The answer. Given what a Staff Member holds that is relevant to the CURRENT
 * Property - Tenant-wide grants plus grants at this Property, and nothing from any
 * other Property - and what they signed in with, this is what they may do.
 *
 * Re-resolved on every request from stored grants, never cached and never sent by the
 * client: that is what makes AC-3's context switch honest, because switching Property
 * changes the grants that are in scope and therefore the answer.
 */
export function resolvePermissions(grants: readonly Grant[], credentialType: CredentialType): Resolution {
  const classes = CREDENTIAL_CLASSES[credentialType];
  if (!classes) {
    // An unknown credential type resolves to NOTHING, not to everything. Fail closed:
    // the alternative is a typo in a token becoming an escalation.
    return { permissions: [], unmappedRoles: [] };
  }
  const permissions = new Set<Permission>();
  const unmapped = new Set<string>();
  for (const grant of grants) {
    const conferred = ROLE_PERMISSIONS[grant.roleKey];
    if (!conferred) { unmapped.add(grant.roleKey); continue; }
    for (const permission of conferred) {
      const spec = PERMISSIONS[permission];
      // A `tenant` permission is conferred by a Tenant-wide grant only.
      if (spec.minimumScope === 'tenant' && grant.scope !== 'tenant') continue;
      // And the credential has the last word (FR-4).
      if (!classes.includes(spec.class)) continue;
      permissions.add(permission);
    }
  }
  return { permissions: [...permissions].sort(), unmappedRoles: [...unmapped].sort() };
}

/**
 * Whether a role may be assigned at the requested scope. Called by the aggregate on
 * the way in, so a grant the model would refuse to honour is never stored - rather
 * than stored and then quietly ignored at resolution time, which is how a screen ends
 * up showing authority that does not exist.
 */
export const roleAssignableAtScope = (roleKey: string, scope: GrantScope): boolean =>
  scope === 'property' ? true : TENANT_ASSIGNABLE_ROLES.includes(roleKey);
