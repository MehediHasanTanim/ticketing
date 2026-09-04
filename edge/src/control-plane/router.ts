import type { IncomingMessage, ServerResponse } from 'node:http';
import { withControlPlane } from '../../../adapters/src/postgres/control-plane-pool';
import { mintOperatorToken, resolveOperator, hasScope, type OperatorPrincipal } from './operator-auth';
import { verifyCredential } from '../../../adapters/src/crypto/credential';
import {
  handleProvisionTenant, handleDeactivateTenant, handleRequestSupportAccess,
  appendOperatorAudit, NotFound,
} from '../../../app/src/tenant/provision-tenant';
import { ValidationError, ConflictError } from '../../../core/src/tenant/provision';
import { envelope, statusFor, type ErrorCode } from '../errors';
import {
  CONTROL_PLANE_DOCS, serveDocsAsset, serveDocsPage, serveOpenApiDocument,
} from '../docs';

/**
 * THE JAZZWARE-INTERNAL SURFACE (Stories 11.1 and 1.1).
 *
 * Mounted at `/control/v1`, which is the prefix `contracts/control-plane-openapi.yaml`
 * declares. It is a routing namespace and NOT a separate deployable, which is what
 * Story 1.1's Project Structure Notes require ("no separate deployable, and no
 * domain logic there").
 *
 * REPORTED DEVIATION, as Story 11.1's notes ask for explicitly: this therefore
 * serves the internal surface from the same process, and on the same origin, as a
 * regional cell. The separations that do hold are the ones that matter most - a
 * different database role with no grants in the `cell` schema, a different token
 * secret, and a different audience checked on every request - so an operator cannot
 * read tenant data and an operator token cannot address a cell. But an internal
 * surface sharing a process with tenant-facing traffic is a decision, not an
 * implementation detail, and AD-4 puts the control plane outside the cells. Raise it
 * with Tanim before a real deployment: one image with a second entrypoint and its own
 * port is cheap now and awkward later.
 *
 * There is no operator UI here. Story 11.1 AC-5 (the internal surface looks
 * deliberately unlike the customer product - different brand, amber accent) is a
 * console surface and is NOT built by this change; it is the remaining part of 11.1.
 */

const PREFIX = '/control/v1';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;   // one working day, no refresh token

/** Both return `true` - "this request has been answered" - so callers can `return` them. */
const json = (res: ServerResponse, status: number, body: unknown): boolean => {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(payload);
  return true;
};
const fail = (res: ServerResponse, code: ErrorCode, details?: Record<string, unknown>): boolean =>
  json(res, statusFor(code), envelope(code, details));

const readBody = async (req: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (chunks.length === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>; }
  catch { throw new ValidationError('body must be JSON'); }
};

export const isControlPlanePath = (pathname: string): boolean =>
  pathname === PREFIX || pathname.startsWith(`${PREFIX}/`);

/**
 * Returns true when it has answered. The cell's router never sees these paths and
 * this never sees the cell's, so neither surface can be reached by guessing at the
 * other's prefix.
 */
export async function handleControlPlane(
  req: IncomingMessage, res: ServerResponse, url: URL, now: Date,
): Promise<boolean> {
  if (!isControlPlanePath(url.pathname)) return false;
  const path = url.pathname.slice(PREFIX.length) || '/';
  const method = req.method ?? 'GET';

  try {
    // ---- documentation, for whoever builds the internal surface ---------------
    // Same self-hosted Swagger UI as the cell's, from THIS document, with an amber
    // banner rather than petrol so nobody mistakes one surface for the other. OFF
    // by default (see CONTROL_PLANE_DOCS): FR-1 makes non-advertisement a property
    // of this surface, so publishing its shape has to be switched on deliberately.
    //
    // Disabled means GONE, not "needs a credential" - the same reasoning that made
    // the cell's disabled docs answer 404 instead of sending a reader to look for a
    // token that would not have helped.
    const isDocs = path === '/docs' || path === '/docs/' || path === '/openapi.json'
      || path.startsWith('/docs/assets/');
    if (isDocs) {
      if (!CONTROL_PLANE_DOCS.enabled()) return fail(res, 'not_found');
      if (method === 'GET' || method === 'HEAD') {
        if (path === '/openapi.json') { serveOpenApiDocument(res, method, CONTROL_PLANE_DOCS); return true; }
        if (path === '/docs' || path === '/docs/') { serveDocsPage(res, method, CONTROL_PLANE_DOCS); return true; }
        const asset = /^\/docs\/assets\/(.*)$/.exec(path);
        if (asset) { serveDocsAsset(decodeURIComponent(asset[1] ?? ''), req, res); return true; }
      }
      return fail(res, 'not_found');
    }

    // ---- sign-in: the one route that needs no operator credential -------------
    if (method === 'POST' && path === '/operator/sign-in') {
      const body = await readBody(req);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || !password) return fail(res, 'validation_failed', { required: ['email', 'password'] });

      const out = await withControlPlane(async (client) => {
        const found = await client.query<{
          id: string; scopes: string[]; credential_hash: Buffer; credential_salt: Buffer;
          active: boolean; must_change_credential: boolean;
        }>(`SELECT id, scopes, credential_hash, credential_salt, active, must_change_credential
              FROM control_plane.operator_accounts WHERE lower(email) = $1`, [email]);
        const row = found.rows[0];

        // ONE generic failure for every rejection - unknown address, wrong
        // credential, deactivated account - so the internal surface cannot be used
        // to discover who works at Jazzware (Story 11.1 AC-3).
        if (!row || !row.active) return undefined;
        if (!verifyCredential(password, row.credential_hash, row.credential_salt)) return undefined;

        const sessionId = `01S${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
        const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
        await client.query(
          'INSERT INTO control_plane.operator_sessions (id, operator_id, issued_at, expires_at) VALUES ($1, $2, $3, $4)',
          [sessionId, row.id, now.toISOString(), expiresAt.toISOString()],
        );
        await appendOperatorAudit(client, row.id, 'operator.signed_in', null, { sessionId });
        return {
          accessToken: mintOperatorToken({ operatorId: row.id, sessionId, expiresAt }),
          tokenType: 'Bearer' as const,
          expiresInSeconds: Math.floor(SESSION_TTL_MS / 1000),
          session: {
            operatorId: row.id, displayName: '', scopes: row.scopes,
            expiresAt: expiresAt.toISOString(),
            mustChangeCredential: row.must_change_credential,
          },
        };
      });

      if (!out) return fail(res, 'unauthenticated');
      // The contract's discriminated shape, so enabling a second factor later
      // (FR-84) changes no caller's parsing.
      return json(res, 200, { status: 'authenticated', token: out });
    }

    // ---- everything else needs an operator session ---------------------------
    const principal = await withControlPlane((client) =>
      resolveOperator(client, req.headers.authorization, now));
    if (!principal) return fail(res, 'unauthenticated');

    if (method === 'GET' && path === '/operator/session') {
      return json(res, 200, await withControlPlane(async (client) => {
        const r = await client.query<{ display_name: string; expires_at: Date }>(
          `SELECT a.display_name, s.expires_at
             FROM control_plane.operator_sessions s
             JOIN control_plane.operator_accounts a ON a.id = s.operator_id
            WHERE s.id = $1`, [principal.sessionId]);
        const row = r.rows[0];
        return {
          operatorId: principal.operatorId,
          displayName: row?.display_name ?? '',
          scopes: principal.scopes,
          expiresAt: row?.expires_at.toISOString() ?? now.toISOString(),
        };
      }));
    }

    if (method === 'POST' && path === '/operator/sign-out') {
      await withControlPlane(async (client) => {
        // THIS session, not every session this operator holds.
        await client.query(
          'UPDATE control_plane.operator_sessions SET revoked_at = $2 WHERE id = $1 AND revoked_at IS NULL',
          [principal.sessionId, now.toISOString()]);
        await appendOperatorAudit(client, principal.operatorId, 'operator.signed_out', null, { sessionId: principal.sessionId });
      });
      res.writeHead(204); res.end();
      return true;
    }

    if (method === 'POST' && path === '/tenants') {
      if (!requireScope(res, principal, 'provision:tenant')) return true;
      const body = await readBody(req);
      const out = await withControlPlane((client) => handleProvisionTenant(
        client, principal.operatorId,
        {
          name: String(body.name ?? ''),
          firstAdministratorEmail: String(body.firstAdministratorEmail ?? ''),
        }, now));
      return json(res, 201, out);
    }

    const deactivate = /^\/tenants\/([^/]+)\/deactivate$/.exec(path);
    if (method === 'POST' && deactivate) {
      if (!requireScope(res, principal, 'provision:tenant')) return true;
      const out = await withControlPlane((client) => handleDeactivateTenant(
        client, principal.operatorId, decodeURIComponent(deactivate[1] ?? ''), now));
      return json(res, 200, out);
    }

    const support = /^\/tenants\/([^/]+)\/support-access$/.exec(path);
    if (method === 'POST' && support) {
      if (!requireScope(res, principal, 'request:support-access')) return true;
      const body = await readBody(req);
      const out = await withControlPlane((client) => handleRequestSupportAccess(
        client, principal.operatorId, decodeURIComponent(support[1] ?? ''),
        { reason: String(body.reason ?? ''), requestedMinutes: Number(body.requestedMinutes) }, now));
      return json(res, 202, out);
    }

    return fail(res, 'not_found');
  } catch (err) {
    if (err instanceof ValidationError) return fail(res, 'validation_failed', { reason: err.message });
    if (err instanceof ConflictError) return fail(res, 'conflict');
    if (err instanceof NotFound) return fail(res, 'not_found');
    // A unique-violation on the Tenant name or the operator email is a conflict,
    // not an internal error.
    if (typeof (err as { code?: string }).code === 'string' && (err as { code: string }).code === '23505') {
      return fail(res, 'conflict');
    }
    console.error('[control-plane] unhandled', err);
    if (!res.headersSent) fail(res, 'internal');
    return true;
  }
}

function requireScope(res: ServerResponse, p: OperatorPrincipal, scope: string): boolean {
  if (hasScope(p, scope)) return true;
  fail(res, 'forbidden', { requiredScope: scope });
  return false;
}
