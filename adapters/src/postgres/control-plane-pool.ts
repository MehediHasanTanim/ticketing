import { Pool, type PoolClient } from 'pg';
import { controlConnectionString } from './config';

/**
 * The control plane's own connection, as its own database role.
 *
 * `jt_control` is granted NOTHING in the `cell` schema (migration 004), so an
 * operator session cannot read a Job, an event or a projection even if a future
 * handler asks it to. That is Story 11.1 AC-1 - "no read of any Tenant's
 * operational or guest data" - enforced by database privileges rather than by a
 * permission check somebody could later widen, and it is what makes FR-1's
 * "provisioning grants Jazzware no standing access to tenant data" a fact instead
 * of a promise.
 *
 * There is no scope pinning here, unlike `withScope`. The control plane is not
 * Property-scoped - that absence is the point (AD-4) - so there is no
 * `app.tenant_id` to set and no row-level security policy to satisfy. Tenant
 * filtering in this schema is an ordinary predicate, and the isolation gate attacks
 * the cell, where guest-bearing data lives.
 */

let pool: Pool | undefined;

export function getControlPool(): Pool {
  pool ??= new Pool({ connectionString: controlConnectionString(), max: 5 });
  return pool;
}

export async function closeControlPool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/** One transaction per control-plane command, so provisioning is all-or-nothing. */
export async function withControlPlane<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getControlPool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
