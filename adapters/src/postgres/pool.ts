import { Pool, type PoolClient } from 'pg';
import type { Scope } from '../../../core/src/tenancy';
import { assertScope } from '../../../core/src/tenancy';
import { appConnectionString } from './config';

let pool: Pool | undefined;

export function getPool(): Pool {
  pool ??= new Pool({ connectionString: appConnectionString(), max: 10 });
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/**
 * The ONE boundary (AD-3). Every application read and write happens inside this
 * function, which pins the scope for the transaction so row-level security can
 * enforce it. A query that forgets its predicate returns nothing.
 */
export async function withScope<T>(
  scope: Scope,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  assertScope(scope);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    // set_config with is_local = true: scoped to this transaction only, so a
    // pooled connection can never leak one request's scope into the next.
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', scope.tenantId]);
    await client.query('SELECT set_config($1, $2, true)', ['app.property_id', scope.propertyId]);
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
