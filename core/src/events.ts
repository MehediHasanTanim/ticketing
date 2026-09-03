import type { TenantId, PropertyId, StaffMemberId } from './tenancy';

/**
 * Events are past tense, domain-first, one per real-world fact - never one per
 * table write (Consistency Conventions).
 *
 * AD-2: `occurredAt` is the domain clock (when it happened in the world) and
 * `recordedAt` is the system clock (when we learned). An action taken offline
 * forty minutes ago carries the earlier occurredAt and a later recordedAt.
 */
export interface DomainEvent<P = unknown> {
  readonly eventId: string;
  readonly type: string;
  readonly tenantId: TenantId;
  readonly propertyId: PropertyId;
  readonly staffMemberId?: StaffMemberId;
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly payload: P;
}
