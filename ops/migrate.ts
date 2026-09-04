/**
 * Story 1.0 / AC-5: migrations are applied FROM SOURCE on deploy. There is no
 * manual SQL step, and the cell is reproducible from the repository alone.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { adminConnectionString } from '../adapters/src/postgres/config';
import { hashCredential } from '../adapters/src/crypto/credential';
import { ulid } from '../core/src/ids';

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
    // The committed SQL creates the application role with a throwaway local
    // password so a developer's cell works out of the box. In every real
    // environment the password comes from the platform secret store and is set
    // here - never committed, never in an image layer.
    // Story 11.2 AC-2: the FIRST operator account is a deployment fact, not a
    // self-service sign-up - a sign-up on the internal surface would be a way to
    // mint a Tenant-creating account from the internet, so the contract has no such
    // route at all. Seeded here, from the platform secret store, and flagged
    // `must_change_credential` (Story 11.2 builds the change endpoint).
    //
    // DELIBERATE SCOPE NOTE: seeding belongs to Story 11.2, but Story 11.1's
    // sign-in cannot be exercised without an account to sign in as. Only the seed
    // is taken early; the operator-account management endpoints remain 11.2's.
    await seedBootstrapOperator(client);

    const appPassword = process.env.APP_DB_PASSWORD;
    if (appPassword && appPassword.length > 0) {
      // ALTER ROLE is a utility statement, and Postgres does not accept bind
      // parameters in one - `PASSWORD $1` is a syntax error, not a slow path. This
      // was written as a parameterised query and never ran: compose and CI both
      // leave APP_DB_PASSWORD empty, so the branch was skipped everywhere it was
      // exercised and would have failed on the FIRST real deploy, which is the one
      // environment where the secret store supplies a value. Found while verifying
      // the auth contract (2026-09-04).
      //
      // A literal is therefore the only option, so it is escaped by the driver
      // (`escapeLiteral` emits an E'' string with quotes and backslashes handled)
      // rather than by string concatenation here. The value is never logged.
      await client.query(`ALTER ROLE jt_app WITH PASSWORD ${client.escapeLiteral(appPassword)}`);
      console.log('application role password set from APP_DB_PASSWORD');
    } else {
      console.log('APP_DB_PASSWORD not set - leaving the local development password in place');
    }

    const controlPassword = process.env.CONTROL_DB_PASSWORD;
    if (controlPassword && controlPassword.length > 0) {
      await client.query(`ALTER ROLE jt_control WITH PASSWORD ${client.escapeLiteral(controlPassword)}`);
      console.log('control-plane role password set from CONTROL_DB_PASSWORD');
    } else {
      console.log('CONTROL_DB_PASSWORD not set - leaving the local development password in place');
    }

    console.log(`migrations up to date (${files.length} total)`);
  } finally {
    await client.end();
  }
}

/**
 * The bootstrap operator. Idempotent: it inserts only when no operator account
 * exists at all, so a redeploy never resurrects a deactivated account or resets a
 * credential someone has since changed.
 */
async function seedBootstrapOperator(client: Client): Promise<void> {
  const existing = await client.query<{ n: string }>('SELECT count(*)::text AS n FROM control_plane.operator_accounts');
  if ((existing.rows[0]?.n ?? '0') !== '0') return;

  const email = process.env.CONTROL_PLANE_BOOTSTRAP_EMAIL;
  const password = process.env.CONTROL_PLANE_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.log('no operator accounts and no CONTROL_PLANE_BOOTSTRAP_* set - the internal surface has nobody who can sign in');
    return;
  }
  const { hash, salt } = hashCredential(password);
  await client.query(
    `INSERT INTO control_plane.operator_accounts
       (id, email, display_name, scopes, credential_hash, credential_salt, must_change_credential, active)
     VALUES ($1, $2, $3, $4, $5, $6, true, true)`,
    [
      `01O${ulid(new Date()).slice(3)}`,
      email.trim().toLowerCase(),
      process.env.CONTROL_PLANE_BOOTSTRAP_NAME ?? 'Bootstrap operator',
      ['provision:tenant', 'manage:operators', 'read:operator-audit', 'request:support-access'],
      hash, salt,
    ],
  );
  // The credential is never logged, and the account is flagged for change on first
  // use (Story 11.2 AC-2).
  console.log(`seeded the bootstrap operator account for ${email} - its credential must be changed on first use`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
