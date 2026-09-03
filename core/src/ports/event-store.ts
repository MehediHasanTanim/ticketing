import type { DomainEvent } from '../events';
import type { Scope } from '../tenancy';

/**
 * AD-1: the event sequence is the source of state.
 * AD-3: every read and append is scoped to exactly one Tenant and Property.
 */
export interface EventStore {
  append(scope: Scope, events: DomainEvent[]): Promise<void>;
  /** Events for one scope, ordered by store sequence (arrival), not by occurredAt. */
  readScope(scope: Scope): Promise<DomainEvent[]>;
  /** Every event in the cell, for projection rebuild. Ordered by sequence. */
  readAllForRebuild(): Promise<DomainEvent[]>;
}
