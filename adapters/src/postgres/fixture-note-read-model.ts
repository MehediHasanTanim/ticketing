import type { PoolClient } from 'pg';
import type { FixtureNote } from '@core/fixture/note';

export interface FixtureNoteRow extends FixtureNote {
  readonly tenantId: string;
  readonly propertyId: string;
  readonly recordedAt: string;
}

const map = (r: {
  id: string; text: string; tenant_id: string; property_id: string; recorded_at: Date;
}): FixtureNoteRow => ({
  id: r.id, text: r.text, tenantId: r.tenant_id,
  propertyId: r.property_id, recordedAt: r.recorded_at.toISOString(),
});

export async function projectFixtureNote(
  client: PoolClient,
  row: { id: string; tenantId: string; propertyId: string; text: string; recordedAt: string },
): Promise<void> {
  await client.query(
    `INSERT INTO cell.fixture_notes (id, tenant_id, property_id, text, recorded_at)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
    [row.id, row.tenantId, row.propertyId, row.text, row.recordedAt],
  );
}

export async function byId(client: PoolClient, id: string): Promise<FixtureNoteRow | undefined> {
  const res = await client.query('SELECT * FROM cell.fixture_notes WHERE id = $1', [id]);
  const r = res.rows[0];
  return r ? map(r) : undefined;
}

export async function list(client: PoolClient, q?: string): Promise<FixtureNoteRow[]> {
  const res = q
    ? await client.query(
        `SELECT * FROM cell.fixture_notes WHERE text ILIKE $1 ORDER BY recorded_at DESC`,
        [`%${q}%`])
    : await client.query('SELECT * FROM cell.fixture_notes ORDER BY recorded_at DESC');
  return res.rows.map(map);
}
