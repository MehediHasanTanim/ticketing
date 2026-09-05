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
  /**
   * DEPENDENCIES AS DATA (Story 1.4 T1). Permissions that must also be present for
   * this one to be enabled - "a hand-written conditional per screen will drift", so
   * there is one graph and one function that reads it, served to the interface at
   * `GET /v1/permissions` rather than restated there.
   *
   * Direct dependencies only. Transitivity comes for free: a set is valid when every
   * member's direct dependencies are present, and each of those is itself checked.
   */
  readonly dependsOn: readonly string[];
}

/**
 * Only what this product can actually do today. A speculative permission is worse
 * than a missing one: it reads as a capability, nothing grants it, and the first
 * story that needs it inherits a name chosen before the surface existed.
 */
export const PERMISSIONS = {
  // A handset needs its Property's name, timezone and currency, so this is
  // operational and a PIN carries it. Almost everything depends on it, because a
  // Property you cannot see is one you cannot sensibly act on.
  'property.read': { class: 'operational', minimumScope: 'property', dependsOn: [] },
  'property.create': { class: 'configuration', minimumScope: 'tenant', dependsOn: ['property.read'] },
  'property.deactivate': { class: 'configuration', minimumScope: 'tenant', dependsOn: ['property.read'] },
  'property.setup.read': { class: 'configuration', minimumScope: 'property', dependsOn: ['property.read'] },
  'staff.read': { class: 'configuration', minimumScope: 'property', dependsOn: [] },
  // Inviting somebody means seeing who is already there and which roles exist to give
  // them. A role that can invite but not read is one whose holder works blind.
  'staff.invite': { class: 'configuration', minimumScope: 'property', dependsOn: ['staff.read', 'role.read'] },
  'role.read': { class: 'configuration', minimumScope: 'property', dependsOn: [] },
  // Story 1.4. Defining a role is a TENANT-level act: a role is a Tenant-wide object,
  // assignable at any Property, so authority over one cannot come from a single
  // Property. Duplicating and editing are one permission rather than two - the story
  // is "duplicate a shipped role and edit the copy", one act in two steps, and a
  // hotel that may do half of it can produce a copy it cannot then correct.
  'role.define': { class: 'configuration', minimumScope: 'tenant', dependsOn: ['role.read'] },
  // Story 1.5. Connecting an identity provider decides where a Tenant's people
  // authenticate, for the whole Tenant - so it is Tenant-scope, and it depends on
  // nothing: it is not a deeper form of any other permission.
  'identity.manage': { class: 'configuration', minimumScope: 'tenant', dependsOn: [] },
  // Story 1.6. Changing a Tenant default changes it for every Property that inherits
  // it - a 200-Property estate is a 200-Property change - so it is Tenant-scope.
  'settings.manage': { class: 'configuration', minimumScope: 'tenant', dependsOn: ['property.read'] },
  // Taking a default over for ONE Property is a Property-level act. Requiring
  // Tenant-wide authority would mean a property administrator could not override a
  // default for their own Property, which is what overrides are for.
  'property.settings.write': {
    class: 'configuration', minimumScope: 'property', dependsOn: ['property.setup.read'],
  },
} as const satisfies Record<string, PermissionSpec>;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/**
 * THE SHIPPED BASELINE, and since Story 1.4 that is ALL it is.
 *
 * Role permissions now live in `control_plane.roles.permissions`, per Tenant, because
 * FR-81 lets a hotel duplicate a shipped role and edit the copy - and a copy nobody
 * else's Tenant can see cannot be a constant in a shared build. This table is what
 * Story 1.1 SEEDS a new Tenant with, and what migration 009 backfilled into every
 * Tenant that already existed. Nothing resolves a permission from it any more;
 * `resolvePermissions` reads each grant's own stored set.
 *
 * The two therefore have to agree, and `tests/unit/role.test.ts` asserts they do -
 * drift between a constant and a migration is the kind that surprises one Tenant and
 * not the others.
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
    'staff.read', 'staff.invite', 'role.read', 'role.define', 'identity.manage',
    'settings.manage', 'property.settings.write',
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

/**
 * One row of `control_plane.staff_roles`, joined to the role it names, as the decision
 * point needs it.
 *
 * `permissions` arrives WITH the grant since Story 1.4. Before that this module looked
 * the role up in `ROLE_PERMISSIONS`, which stopped being possible the moment a Tenant
 * could define its own - and passing the stored set in keeps this function pure, so
 * the whole permission model is still unit-testable without a database.
 */
export interface Grant {
  readonly roleKey: string;
  /** `tenant` when the stored `property_id` is NULL. */
  readonly scope: GrantScope;
  /** The role's own set, from `control_plane.roles.permissions`. */
  readonly permissions: readonly string[];
}

export interface Resolution {
  readonly permissions: Permission[];
  /**
   * Stored permission keys this build does not know.
   *
   * Story 1.3 reported unmapped ROLES here; Story 1.4 made that meaningless, because a
   * Tenant defining its own roles is now the ordinary case. The hazard that replaces
   * it is a stored permission the code has never heard of - a role written by a newer
   * build, or a permission retired from the catalogue while roles still name it. Such
   * a key confers NOTHING, and it is returned rather than dropped so the edge can log
   * it: a permission model that fails quietly is one nobody finds out about until a
   * shift cannot work.
   */
  readonly unknownPermissions: string[];
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
    return { permissions: [], unknownPermissions: [] };
  }
  const permissions = new Set<Permission>();
  const unknown = new Set<string>();
  for (const grant of grants) {
    for (const key of grant.permissions) {
      const spec = (PERMISSIONS as Record<string, PermissionSpec | undefined>)[key];
      if (!spec) { unknown.add(key); continue; }
      // A `tenant` permission is conferred by a Tenant-wide grant only.
      if (spec.minimumScope === 'tenant' && grant.scope !== 'tenant') continue;
      // And the credential has the last word (FR-4).
      if (!classes.includes(spec.class)) continue;
      permissions.add(key as Permission);
    }
  }
  return { permissions: [...permissions].sort(), unknownPermissions: [...unknown].sort() };
}

/**
 * Whether a SHIPPED role may be assigned at the requested scope.
 *
 * Story 1.4 narrowed what this is for. Assignability is now a stored property of a
 * role (`control_plane.roles.assignable_at_tenant_scope`), because a Tenant can define
 * its own roles and decide the question for them - so the invitation guard reads the
 * Tenant's catalogue and no longer calls this. What remains is the SEED: the value
 * Story 1.1 writes for each shipped role, and the value migration 009 backfilled.
 * Using it as a live check again would refuse every custom role, which is exactly the
 * defect that narrowed it.
 */
export const shippedRoleAssignableAtScope = (roleKey: string, scope: GrantScope): boolean =>
  scope === 'property' ? true : TENANT_ASSIGNABLE_ROLES.includes(roleKey);
