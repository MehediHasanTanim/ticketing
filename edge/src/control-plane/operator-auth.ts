import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';

export { hashCredential, verifyCredential } from '../../../adapters/src/crypto/credential';

/**
 * OPERATOR TOKENS (Story 11.1, FR-86).
 *
 * The separation from a cell is structural, not a permission check:
 *
 *   - a different SECRET signs an operator token, so a cell cannot verify one and
 *     the control plane cannot verify a cell's;
 *   - a different AUDIENCE is carried and checked on every request, so even if the
 *     two secrets were ever misconfigured to the same value, a token minted for one
 *     surface is still refused by the other;
 *   - a different DATABASE ROLE serves it, granted nothing in the `cell` schema.
 *
 * Any one of those alone would be a control someone could widen. Together they are
 * why Story 11.1 AC-2 - "an operator credential presented to any regional cell
 * endpoint is refused" - is a property of the system rather than of this file.
 */

export const OPERATOR_AUDIENCE = 'jazzticketing-control-plane';

const tokenSecret = (): string => {
  const v = process.env.CONTROL_PLANE_TOKEN_SECRET;
  if (v && v.length > 0) return v;
  // Local development only, and deliberately not the cell's secret. If these two
  // were ever set to the same string, the audience check below still separates the
  // surfaces.
  return 'story-11-1-control-plane-local-only';
};

export interface OperatorPrincipal {
  operatorId: string;
  sessionId: string;
  scopes: readonly string[];
}

interface TokenBody { aud: string; oid: string; sid: string; exp: number }

const sign = (body: string): string =>
  createHmac('sha256', tokenSecret()).update(body).digest('base64url');

export function mintOperatorToken(p: { operatorId: string; sessionId: string; expiresAt: Date }): string {
  const body: TokenBody = {
    aud: OPERATOR_AUDIENCE,
    oid: p.operatorId,
    sid: p.sessionId,
    exp: Math.floor(p.expiresAt.getTime() / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

/** Signature, audience and expiry only. Liveness is a database question - below. */
export function decodeOperatorToken(authorization: string | undefined, now: Date): TokenBody | undefined {
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const [encoded, sig] = authorization.slice('Bearer '.length).split('.');
  if (!encoded || !sig) return undefined;

  const expected = sign(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;

  try {
    const body = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<TokenBody>;
    // The check that survives a shared secret.
    if (body.aud !== OPERATOR_AUDIENCE) return undefined;
    if (!body.oid || !body.sid || typeof body.exp !== 'number') return undefined;
    if (body.exp * 1000 <= now.getTime()) return undefined;
    return body as TokenBody;
  } catch { return undefined; }
}

/**
 * Story 11.1 AC-4: a deactivated operator loses access "at next token validation,
 * without a manual step". That is this function - the account's `active` flag and
 * the session's `revoked_at` are read on every request, so deactivation needs no
 * sweep, no session store to walk and no token blacklist to keep current.
 */
export async function resolveOperator(
  client: PoolClient,
  authorization: string | undefined,
  now: Date,
): Promise<OperatorPrincipal | undefined> {
  const body = decodeOperatorToken(authorization, now);
  if (!body) return undefined;

  const res = await client.query<{ operator_id: string; scopes: string[]; active: boolean; revoked_at: Date | null; expires_at: Date }>(
    `SELECT s.operator_id, a.scopes, a.active, s.revoked_at, s.expires_at
       FROM control_plane.operator_sessions s
       JOIN control_plane.operator_accounts a ON a.id = s.operator_id
      WHERE s.id = $1 AND s.operator_id = $2`,
    [body.sid, body.oid],
  );
  const row = res.rows[0];
  if (!row) return undefined;
  if (!row.active) return undefined;                       // deactivated (AC-4)
  if (row.revoked_at) return undefined;                    // signed out
  if (row.expires_at.getTime() <= now.getTime()) return undefined;

  return { operatorId: row.operator_id, sessionId: body.sid, scopes: row.scopes };
}

export const hasScope = (p: OperatorPrincipal, scope: string): boolean => p.scopes.includes(scope);
