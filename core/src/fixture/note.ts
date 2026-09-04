import { ValidationError } from '../validation';

export { ValidationError };
import type { DomainEvent } from '../events';
import type { Scope } from '../tenancy';
import { assertScope } from '../tenancy';
import { ulid } from '../ids';

/**
 * ISOLATION FIXTURE - deliberately not a domain aggregate.
 *
 * Story 1.0's cross-tenant isolation gate needs a real resource reachable through
 * every public interface (read, list, search, export, crafted API call) so the gate
 * has something to attack. This is that resource and nothing more.
 *
 * It is NOT FR-1's Tenant (Story 1.1), NOT a Job (Story 3.1), and no later story
 * should build on it. When Story 1.1 lands, this stays as a fixture; the gate keeps
 * using it and also gains the real aggregates.
 */
export interface FixtureNote {
  readonly id: string;
  readonly text: string;
}

export interface RecordFixtureNote {
  readonly text: string;
}

export function recordFixtureNote(
  scope: Scope,
  cmd: RecordFixtureNote,
  now: Date,
  rand?: () => number,
): DomainEvent<{ noteId: string; text: string }> {
  assertScope(scope);
  const text = cmd.text?.trim() ?? '';
  if (text.length === 0) throw new ValidationError('text is required');
  if (text.length > 280) throw new ValidationError('text must be 280 characters or fewer');

  const iso = now.toISOString();
  const event: DomainEvent<{ noteId: string; text: string }> = {
    eventId: ulid(now, rand),
    type: 'FixtureNoteRecorded',
    tenantId: scope.tenantId,
    propertyId: scope.propertyId,
    occurredAt: iso,   // AD-2: no offline path in Story 1.0, so the clocks coincide
    recordedAt: iso,
    payload: { noteId: ulid(now, rand), text },
  };
  return scope.staffMemberId ? { ...event, staffMemberId: scope.staffMemberId } : event;
}


