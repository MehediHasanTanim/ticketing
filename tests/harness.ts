import type { Server } from 'node:http';
import { createApp } from '../edge/src/server';
import { mintFixtureToken } from '../edge/src/auth';
import { closePool } from '../adapters/src/postgres/pool';

export const TENANT_A = '01T0000000000000000000000A';
export const TENANT_B = '01T0000000000000000000000B';
export const PROPERTY_A = '01P0000000000000000000000A';
export const PROPERTY_B = '01P0000000000000000000000B';

export interface Harness {
  base: string;
  tokenA: string;
  tokenB: string;
  stop(): Promise<void>;
}

export async function start(): Promise<Harness> {
  process.env.FIXTURE_AUTH = '1';
  // Both secrets fail closed with no fallback (they are published source, and the
  // repository is public), so the harness supplies its own rather than relying on
  // an ambient value that would make the suite pass or fail by environment.
  process.env.FIXTURE_AUTH_SECRET ??= 'suite-fixture-secret-not-a-real-one';
  process.env.CONTROL_PLANE_TOKEN_SECRET ??= 'suite-control-plane-secret-not-real';
  // A THIRD distinct value, for the same reason the other two are distinct: if the
  // suite set them alike it would pass while proving nothing about the separation
  // the three surfaces depend on.
  process.env.SESSION_TOKEN_SECRET ??= 'suite-staff-session-secret-not-real';
  const server: Server = createApp();
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', () => res()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no address');
  return {
    base: `http://127.0.0.1:${addr.port}`,
    tokenA: mintFixtureToken({ tenantId: TENANT_A, propertyId: PROPERTY_A, staffMemberId: 'staff-a' }),
    tokenB: mintFixtureToken({ tenantId: TENANT_B, propertyId: PROPERTY_B, staffMemberId: 'staff-b' }),
    stop: async () => {
      await new Promise<void>((res) => server.close(() => res()));
      await closePool();
    },
  };
}

export const auth = (token: string): Record<string, string> => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
});
