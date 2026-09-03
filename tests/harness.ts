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
