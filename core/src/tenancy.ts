/**
 * AD-3: every row and every event carries tenant_id and property_id, and
 * isolation lives at ONE boundary. This type is that boundary's currency:
 * nothing in app/ or adapters/ reads or writes without one.
 */
export type TenantId = string & { readonly __brand: 'TenantId' };
export type PropertyId = string & { readonly __brand: 'PropertyId' };
export type StaffMemberId = string & { readonly __brand: 'StaffMemberId' };

/**
 * TENANT SCOPE, and the one operation AD-3 cannot cover.
 *
 * "Every request resolves to exactly one Tenant and Property" holds for everything
 * that touches a Property's data - which is everything except creating the FIRST
 * Property, where there is no Property to be scoped to yet (Story 1.2). Rather than
 * make `propertyId` optional on `Scope` and weaken the type every cell handler
 * relies on, a Tenant scope is its own narrower thing and `Scope` extends it.
 *
 * The consequence is the point: a `TenantScope` is NOT assignable where a `Scope`
 * is required, so a Tenant-scoped caller cannot reach Property-scoped data by
 * accident. `withScope` still demands both, row-level security still pins both, and
 * the isolation gate asserts a Tenant-scoped token reads nothing.
 */
export interface TenantScope {
  readonly tenantId: TenantId;
  readonly staffMemberId?: StaffMemberId;
}

export interface Scope extends TenantScope {
  readonly propertyId: PropertyId;
}

export const asTenantId = (s: string): TenantId => s as TenantId;
export const asPropertyId = (s: string): PropertyId => s as PropertyId;
export const asStaffMemberId = (s: string): StaffMemberId => s as StaffMemberId;

/** Cheap structural check so a malformed scope cannot reach the store. */
export function assertScope(scope: Scope): void {
  if (!scope || !scope.tenantId || !scope.propertyId) {
    throw new Error('scope must carry both tenantId and propertyId (AD-3)');
  }
}

/**
 * The Tenant-scoped equivalent. Deliberately refuses a `propertyId`: if one is
 * present the caller wanted `assertScope`, and silently accepting it here is how a
 * Property-scoped request ends up running down a Tenant-scoped path that applies no
 * Property predicate.
 */
export function assertTenantScope(scope: TenantScope): void {
  if (!scope || !scope.tenantId) throw new Error('a Tenant scope must carry a tenantId (AD-3)');
  if ((scope as { propertyId?: string }).propertyId) {
    throw new Error('this is a Tenant-scoped operation; pass a TenantScope, not a Scope (AD-3)');
  }
}
