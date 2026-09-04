import { Pool, type PoolClient } from 'pg';
import type { Scope, TenantScope } from '../../../core/src/tenancy';
import { assertScope, assertTenantScope } from '../../../core/src/tenancy';
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

/**
 * A TENANT-SCOPED transaction, for the control-plane directory only (Story 1.2).
 *
 * It pins `app.tenant_id` and NOT `app.property_id`, which has two consequences
 * worth stating rather than discovering:
 *
 *   - every cell table's row-level security policy requires BOTH settings, so a
 *     query against `cell.events` or `cell.fixture_notes` inside this transaction
 *     returns nothing. That is not a limitation to work around; it is what keeps a
 *     Tenant-scoped caller away from Property data, and the isolation gate asserts
 *     it;
 *   - control-plane tables carry no row-level security - the cell's guest-bearing
 *     tables are what RLS protects (AD-4) - so a Tenant predicate in this
 *     transaction is written explicitly in the SQL. `set_config` here is for
 *     consistency and for anything that later adds a policy, not a substitute for
 *     the `WHERE tenant_id = $1` every query in these handlers carries.
 */
export async function withTenantScope<T>(
  scope: TenantScope,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  assertTenantScope(scope);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', scope.tenantId]);
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

/**
 * A transaction that pins NO SCOPE AT ALL, for the two or three operations that
 * cannot have one yet (Story 1.3).
 *
 * Sign-in, credential set-up and password reset all have to resolve an identity
 * BEFORE a Tenant is known - that is what they are for - so there is no
 * `app.tenant_id` to pin. Rather than let those handlers reach for a raw pool client
 * and quietly become the precedent for everything else, they get one named function
 * whose comment says what it costs.
 *
 * What it does NOT cost: row-level security on every cell table requires both
 * `app.tenant_id` and `app.property_id`, and neither is set here, so a query against
 * `cell.events` or any other guest-bearing table inside this transaction returns
 * NOTHING. That is not a happy accident - it is why an unscoped transaction is safe
 * to offer at all, and the isolation gate asserts it.
 *
 * Control-plane tables carry no RLS (AD-4), so every query in here writes its own
 * predicate. Use it only for the identity-resolution step, and switch to `withScope`
 * or `withTenantScope` the moment a Tenant is known.
 */
export async function withoutScope<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
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
