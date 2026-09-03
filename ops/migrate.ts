/**
 * Story 1.0 / AC-5: migrations are applied FROM SOURCE on deploy. There is no
 * manual SQL step, and the cell is reproducible from the repository alone.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { adminConnectionString } from '../adapters/src/postgres/config';

const DIR = join(__dirname, '..', '..', 'ops', 'migrations');

async function main(): Promise<void> {
  const client = new Client({ connectionString: adminConnectionString() });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS cell`);
    await client.query(
      `CREATE TABLE IF NOT EXISTS cell.schema_migrations (
         filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
    );
    const done = new Set(
      (await client.query<{ filename: string }>('SELECT filename FROM cell.schema_migrations'))
        .rows.map((r) => r.filename),
    );
    const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = readFileSync(join(DIR, f), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO cell.schema_migrations (filename) VALUES ($1)', [f]);
        await client.query('COMMIT');
        console.log(`applied ${f}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${f} failed: ${(err as Error).message}`);
      }
    }
    console.log(`migrations up to date (${files.length} total)`);
  } finally {
    await client.end();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
