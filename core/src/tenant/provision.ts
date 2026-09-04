import { ulid } from '../ids';
import { ValidationError } from '../validation';

export { ValidationError };

/**
 * The Tenant aggregate. Pure: no I/O, no clock of its own (the clock is passed in),
 * no npm dependency - `core/` may import none, which is why `ulid` is 20 lines next
 * door rather than a package.
 *
 * Story 1.1 T1 asks for ONE `TenantProvisioned` event carrying the seeded role set,
 * not seven separate writes, so the shipped roles are part of this event's payload
 * rather than a sequence of RoleSeeded facts nobody would ever read individually.
 */

/** FR-2's shipped role set, "at minimum" - and this is that minimum, verbatim. */
export const SHIPPED_ROLES = [
  { key: 'line_staff', name: 'Line staff' },
  { key: 'supervisor', name: 'Supervisor' },
  { key: 'department_manager', name: 'Department manager' },
  { key: 'front_office', name: 'Front office' },
  { key: 'duty_manager', name: 'Duty manager' },
  { key: 'property_administrator', name: 'Property administrator' },
  { key: 'corporate_viewer', name: 'Corporate viewer' },
] as const;

/**
 * Platform defaults seeded at provisioning. Deliberately few: Story 1.6 owns Tenant
 * defaults and FR-83 owns their blast-radius display, so anything richer here would
 * be designing 1.6's model from inside 1.1 and then migrating it.
 */
export const PLATFORM_DEFAULTS = {
  locale: 'en',
  // FR-85's default, stated where the Tenant is born rather than assumed later.
  mfaRequired: false,
} as const;

export interface TenantProvisioned {
  eventId: string;
  type: 'TenantProvisioned';
  tenantId: string;
  /** NULL by design: no Property exists yet (FR-1), the one AD-3 exception. */
  propertyId: undefined;
  occurredAt: string;
  recordedAt: string;
  payload: {
    name: string;
    roles: ReadonlyArray<{ key: string; name: string }>;
    defaults: Record<string, unknown>;
    firstAdministratorInvitationId: string;
  };
}

const MAX_NAME = 200;

/**
 * An email address good enough to refuse the obviously wrong. Deliberately not a
 * full RFC 5322 grammar: the address is proved by the invitation arriving, and a
 * clever regex here would reject real addresses while accepting unusable ones.
 */
const looksLikeEmail = (s: string): boolean =>
  /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(s) && s.length <= 320;

export function provisionTenant(
  input: { name: string; firstAdministratorEmail: string },
  now: Date,
  rand: () => number = Math.random,
): { event: TenantProvisioned; tenantId: string; invitationId: string } {
  const name = input.name?.trim() ?? '';
  if (!name) throw new ValidationError('a Tenant needs a name');
  if (name.length > MAX_NAME) throw new ValidationError(`name must be at most ${MAX_NAME} characters`);
  const email = input.firstAdministratorEmail?.trim() ?? '';
  if (!looksLikeEmail(email)) throw new ValidationError('firstAdministratorEmail is not an address');

  const tenantId = `01T${ulid(now, rand).slice(3)}`;
  const invitationId = `01I${ulid(now, rand).slice(3)}`;
  const stamp = now.toISOString();

  return {
    tenantId,
    invitationId,
    event: {
      eventId: ulid(now, rand),
      type: 'TenantProvisioned',
      tenantId,
      propertyId: undefined,
      occurredAt: stamp,
      recordedAt: stamp,
      payload: {
        name,
        roles: SHIPPED_ROLES.map((r) => ({ key: r.key, name: r.name })),
        defaults: { ...PLATFORM_DEFAULTS },
        firstAdministratorInvitationId: invitationId,
      },
    },
  };
}

/**
 * Story 1.1 AC-4. A Tenant with operational records is deactivated, never deleted -
 * and the aggregate refuses rather than the route, so a second caller cannot find a
 * way round it. The database refuses too (migration 004's trigger); belt and braces,
 * for the same reason row-level security sits under the isolation gate.
 */
export class ConflictError extends Error {
  public readonly code = 'conflict' as const;
}

export function deactivateTenant(
  state: { tenantId: string; active: boolean },
  now: Date,
  rand: () => number = Math.random,
): { eventId: string; type: 'TenantDeactivated'; tenantId: string; occurredAt: string; recordedAt: string } {
  // A conflict, not a validation failure: the request was well formed and the
  // caller is not wrong about anything except the current state. The contract
  // documents 409 here, and a 400 would have been the contract and the running
  // system disagreeing - caught by asserting the built operations against their
  // own documented responses rather than by reading both.
  if (!state.active) throw new ConflictError('this Tenant is already deactivated');
  const stamp = now.toISOString();
  return { eventId: ulid(now, rand), type: 'TenantDeactivated', tenantId: state.tenantId, occurredAt: stamp, recordedAt: stamp };
}
