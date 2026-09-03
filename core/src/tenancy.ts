/**
 * AD-3: every row and every event carries tenant_id and property_id, and
 * isolation lives at ONE boundary. This type is that boundary's currency:
 * nothing in app/ or adapters/ reads or writes without one.
 */
export type TenantId = string & { readonly __brand: 'TenantId' };
export type PropertyId = string & { readonly __brand: 'PropertyId' };
export type StaffMemberId = string & { readonly __brand: 'StaffMemberId' };

export interface Scope {
  readonly tenantId: TenantId;
  readonly propertyId: PropertyId;
  readonly staffMemberId?: StaffMemberId;
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
