import { describe, it, expect } from 'vitest';
import { Client } from 'pg';

/**
 * AC-5 / AD-4: the control plane holds NO GUEST DATA.
 *
 * Cheap now; the alternative is discovering a leak after a Property is live in a
 * second region. This fails the build if a guest-identifying column ever appears
 * in control_plane, which is how a well-meaning future story gets caught.
 */
/**
 * Words that may never appear in a control_plane column name, allowlist or not:
 * every one of them names guest data (DG-1) or a staff attribute DG-5 forbids.
 */
const NEVER = [
  'guest', 'stay', 'folio', 'reservation', 'loyalty', 'vip',
  'passport', 'date_of_birth', 'dob', 'card',
];

/**
 * Contact-shaped words. These are guest data when they belong to a guest and
 * ordinary staff identity when they belong to an employee - "email" alone cannot
 * tell the difference, so each occurrence is named here with its reason. Anything
 * not on this list fails, which is what keeps the list short and the decision
 * conscious.
 */
const CONTACT_SHAPED = ['email', 'phone', 'address'];
const CONTACT_ALLOWED = new Map([
  ['operator_accounts.email', 'FR-86: a Jazzware operator\'s own work address. Staff identity (DG-5), never a guest\'s.'],
  ['invitations.email', 'FR-1: the first tenant administrator\'s work address, so the invitation can reach them.'],
  // Story 1.3. A Staff Member's own WORK address, and the field that decides which
  // account they get: present means a credential set-up link, absent means a PIN-only
  // account for a Shared Device. Staff identity under DG-5, never a guest's - and DG-5
  // is also why there is no payroll identifier and no date of birth beside it.
  ['staff_members.email', 'FR-2/AC-1: a Staff Member\'s own work address, and the field that chooses their credential path.'],
]);

describe('control plane holds no guest data (AD-4)', () => {
  it('has no guest-identifying column in any control_plane table', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL_ADMIN });
    await client.connect();
    try {
      const res = await client.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name FROM information_schema.columns
          WHERE table_schema = 'control_plane' ORDER BY table_name, column_name`);
      expect(res.rowCount).toBeGreaterThan(0);
      const banned = res.rows.filter((r) =>
        NEVER.some((word) => r.column_name.toLowerCase().includes(word)));
      expect(banned.map((o) => `${o.table_name}.${o.column_name}`)).toEqual([]);

      const contact = res.rows.filter((r) =>
        CONTACT_SHAPED.some((word) => r.column_name.toLowerCase().includes(word)));
      const unexplained = contact
        .map((r) => `${r.table_name}.${r.column_name}`)
        .filter((k) => !CONTACT_ALLOWED.has(k));
      expect(unexplained, 'a contact-shaped column with no recorded reason').toEqual([]);

      // And the allowlist cannot rot: an entry for a column that no longer exists
      // is a licence nobody is using and nobody will notice going stale.
      const present = new Set(contact.map((r) => `${r.table_name}.${r.column_name}`));
      expect([...CONTACT_ALLOWED.keys()].filter((k) => !present.has(k)),
        'allowlisted column no longer exists').toEqual([]);
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
