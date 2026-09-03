/**
 * Story 1.0 / AC-5. An event-sourced system without a rebuild path discovers that
 * fact under pressure. This command truncates every projection and replays the
 * event log, and the smoke test asserts the result is byte-identical to what the
 * live write path produced.
 *
 * It is also how the spine's deferred CQRS-split decision stays evidence-driven:
 * rebuild time has to be measurable before anyone can argue about it.
 *
 * Runs as the ADMIN role, because a maintenance replay legitimately crosses every
 * tenant in the cell. That is exactly why the application role cannot do it.
 */
import { Client } from 'pg';
import { adminConnectionString } from '../../adapters/src/postgres/config';

export async function rebuildProjections(): Promise<{ events: number; notes: number; ms: number }> {
  const started = Date.now();
  const client = new Client({ connectionString: adminConnectionString() });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE cell.fixture_notes');
    const events = await client.query<{
      type: string; tenant_id: string; property_id: string;
      recorded_at: Date; payload: { noteId: string; text: string };
    }>('SELECT type, tenant_id, property_id, recorded_at, payload FROM cell.events ORDER BY seq');

    let notes = 0;
    for (const e of events.rows) {
      switch (e.type) {
        case 'FixtureNoteRecorded':
          await client.query(
            `INSERT INTO cell.fixture_notes (id, tenant_id, property_id, text, recorded_at)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
            [e.payload.noteId, e.tenant_id, e.property_id, e.payload.text, e.recorded_at]);
          notes++;
          break;
        default:
          // Unknown event types are ignored and counted, never fatal - the same
          // tolerance AD-5 requires of the Jazz Core contract, applied to our own
          // log so an old event from a removed feature cannot block a rebuild.
          break;
      }
    }
    await client.query('COMMIT');
    return { events: events.rowCount ?? 0, notes, ms: Date.now() - started };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  rebuildProjections()
    .then((r) => { console.log(`rebuilt ${r.notes} projection rows from ${r.events} events in ${r.ms}ms`); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
