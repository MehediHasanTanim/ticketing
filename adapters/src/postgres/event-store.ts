import type { PoolClient } from 'pg';
import type { DomainEvent } from '@core/events';
import type { Scope } from '@core/tenancy';
import { asTenantId, asPropertyId } from '@core/tenancy';

interface Row {
  event_id: string; type: string; tenant_id: string; property_id: string;
  staff_member_id: string | null; occurred_at: Date; recorded_at: Date; payload: unknown;
}

const toEvent = (r: Row): DomainEvent => ({
  eventId: r.event_id,
  type: r.type,
  tenantId: asTenantId(r.tenant_id),
  propertyId: asPropertyId(r.property_id),
  ...(r.staff_member_id ? { staffMemberId: r.staff_member_id as never } : {}),
  occurredAt: r.occurred_at.toISOString(),
  recordedAt: r.recorded_at.toISOString(),
  payload: r.payload,
});

/** Append inside a caller-provided transaction, so the event and its projection commit together. */
export async function appendEvents(
  client: PoolClient, scope: Scope, events: readonly DomainEvent[],
): Promise<void> {
  for (const e of events) {
    if (e.tenantId !== scope.tenantId || e.propertyId !== scope.propertyId) {
      throw new Error('event scope does not match request scope (AD-3)');
    }
    await client.query(
      `INSERT INTO cell.events
         (event_id, type, tenant_id, property_id, staff_member_id, occurred_at, recorded_at, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [e.eventId, e.type, e.tenantId, e.propertyId, e.staffMemberId ?? null,
       e.occurredAt, e.recordedAt, JSON.stringify(e.payload)],
    );
  }
}

export async function readScope(client: PoolClient): Promise<DomainEvent[]> {
  // No WHERE clause on tenant here ON PURPOSE: row-level security supplies it.
  // tests/isolation.test.ts proves this returns nothing for another tenant.
  const res = await client.query<Row>('SELECT * FROM cell.events ORDER BY seq');
  return res.rows.map(toEvent);
}
