import { describe, it, expect } from 'vitest';
import { Client } from 'pg';

/**
 * AC-5 / AD-4: the control plane holds NO GUEST DATA.
 *
 * Cheap now; the alternative is discovering a leak after a Property is live in a
 * second region. This fails the build if a guest-identifying column ever appears
 * in control_plane, which is how a well-meaning future story gets caught.
 */
const GUEST_SHAPED = [
  'guest', 'stay', 'folio', 'reservation', 'loyalty', 'vip',
  'passport', 'date_of_birth', 'dob', 'email', 'phone', 'card', 'address',
];

describe('control plane holds no guest data (AD-4)', () => {
  it('has no guest-identifying column in any control_plane table', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL_ADMIN });
    await client.connect();
    try {
      const res = await client.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name FROM information_schema.columns
          WHERE table_schema = 'control_plane' ORDER BY table_name, column_name`);
      expect(res.rowCount).toBeGreaterThan(0);
      const offenders = res.rows.filter((r) =>
        GUEST_SHAPED.some((word) => r.column_name.toLowerCase().includes(word)));
      expect(offenders.map((o) => `${o.table_name}.${o.column_name}`)).toEqual([]);
    } finally { await client.end(); }
  });

  it('records a region per Property, because a Property never leaves its region (DG-4)', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL_ADMIN });
    await client.connect();
    try {
      const res = await client.query<{ region: string }>(
        'SELECT region FROM control_plane.properties');
      expect(res.rowCount).toBeGreaterThan(0);
      expect(res.rows.every((r) => r.region.length > 0)).toBe(true);
    } finally { await client.end(); }
  });
});
