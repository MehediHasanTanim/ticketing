import type { PoolClient } from 'pg';
import type { ClockPort } from '@core/ports';
import type { Scope } from '@core/tenancy';
import { recordFixtureNote } from '@core/fixture/note';
import { appendEvents } from '@adapters/postgres/event-store';
import { projectFixtureNote } from '@adapters/postgres/fixture-note-read-model';

/**
 * Command handler. The event and its projection commit in the SAME transaction,
 * so a reader can never see a projection row whose event is missing.
 *
 * AD-7's idempotency is enforced here on (tenant, property, staff member, client
 * key) - person-scoped, because handsets are shared.
 */
export async function handleRecordFixtureNote(
  client: PoolClient,
  scope: Scope,
  cmd: { text: string; clientKey?: string },
  clock: ClockPort,
): Promise<{ eventId: string; noteId: string; occurredAt: string; recordedAt: string }> {
  if (cmd.clientKey && scope.staffMemberId) {
    const existing = await client.query<{ event_id: string }>(
      `SELECT event_id FROM cell.idempotency
        WHERE tenant_id=$1 AND property_id=$2 AND staff_member_id=$3 AND client_key=$4`,
      [scope.tenantId, scope.propertyId, scope.staffMemberId, cmd.clientKey],
    );
    const row = existing.rows[0];
    if (row) {
      const prior = await client.query<{ payload: { noteId: string }; occurred_at: Date; recorded_at: Date }>(
        'SELECT payload, occurred_at, recorded_at FROM cell.events WHERE event_id = $1', [row.event_id]);
      const p = prior.rows[0];
      if (p) return { eventId: row.event_id, noteId: p.payload.noteId,
                      occurredAt: p.occurred_at.toISOString(), recordedAt: p.recorded_at.toISOString() };
    }
  }

  const event = recordFixtureNote(scope, { text: cmd.text }, clock.now());
  await appendEvents(client, scope, [event]);
  await projectFixtureNote(client, {
    id: event.payload.noteId, tenantId: scope.tenantId, propertyId: scope.propertyId,
    text: event.payload.text, recordedAt: event.recordedAt,
  });
  if (cmd.clientKey && scope.staffMemberId) {
    await client.query(
      `INSERT INTO cell.idempotency (tenant_id, property_id, staff_member_id, client_key, event_id)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [scope.tenantId, scope.propertyId, scope.staffMemberId, cmd.clientKey, event.eventId]);
  }
  return { eventId: event.eventId, noteId: event.payload.noteId,
           occurredAt: event.occurredAt, recordedAt: event.recordedAt };
}
