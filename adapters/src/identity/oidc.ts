import { createHash, createPublicKey, createVerify, randomBytes, timingSafeEqual } from 'node:crypto';
import type {
  AuthenticatedSubject, AuthorizationRequest, ConnectionDescriptor, IdentityProviderPort,
} from '../../../core/src/ports/identity';

/**
 * OIDC, and the only place in this system that knows what a JWT is (Story 1.5).
 *
 * `core` sees an `AuthenticatedSubject` and never a token, a discovery document or a
 * key. Everything protocol-shaped is here, which is what lets a second protocol arrive
 * as a second file rather than as edits scattered through the domain.
 *
 * WHAT IS VERIFIED, and why each one matters:
 *   - the SIGNATURE, against a key fetched from the provider's own JWKS. Without it the
 *     ID token is a claim anybody can make;
 *   - `iss`, against the connection's stored issuer. This is what stops Tenant A's
 *     provider authenticating a Tenant B user (FR-3, AC-1);
 *   - `aud`, against our client id. A token minted for a different application at the
 *     same provider is not a token for us;
 *   - `exp` and `iat`, against the clock passed in - no module here reads the machine
 *     clock (AD-2);
 *   - `nonce`, against the value bound to the state we issued. This is what stops an
 *     ID token captured elsewhere being replayed into our callback;
 *   - and PKCE, which stops an intercepted authorisation code being exchanged by
 *     anyone who did not start the sign-in.
 *
 * `alg: none` and symmetric algorithms are refused outright rather than handled: they
 * are how JWT verification is defeated, and this adapter accepts RSA and ECDSA
 * signatures from the provider's published keys or it accepts nothing.
 */

const ALLOWED_ALGS = new Set(['RS256', 'RS384', 'RS512', 'ES256', 'ES384']);
const DISCOVERY_PATH = '/.well-known/openid-configuration';
const NETWORK_TIMEOUT_MS = 8_000;
/** A minute of tolerance for clock skew between us and the provider. */
const CLOCK_SKEW_S = 60;

export class OidcError extends Error {}

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

interface Jwk {
  kid?: string; kty: string; alg?: string; use?: string;
  n?: string; e?: string; crv?: string; x?: string; y?: string;
}

const b64url = (b: Buffer): string => b.toString('base64url');
const fromB64url = (s: string): Buffer => Buffer.from(s, 'base64url');

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      // The provider's body is NOT echoed to the caller: a token endpoint's error can
      // carry a code or a hint, and this refusal reaches an end user.
      throw new OidcError(`the identity provider answered ${res.status}`);
    }
    return await res.json() as T;
  } catch (err) {
    if (err instanceof OidcError) throw err;
    throw new OidcError(`the identity provider could not be reached: ${(err as Error).name}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Discovery, cached briefly. A provider rotates keys and occasionally moves an
 * endpoint, so this must not be cached for the life of the process - but fetching it
 * on every sign-in makes the provider's availability our availability on a path where
 * it need not be.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const discoveryCache = new Map<string, { at: number; value: Discovery }>();
const jwksCache = new Map<string, { at: number; value: Jwk[] }>();

async function discover(issuer: string, now: Date): Promise<Discovery> {
  const cached = discoveryCache.get(issuer);
  if (cached && now.getTime() - cached.at < CACHE_TTL_MS) return cached.value;
  const value = await getJson<Discovery>(`${issuer}${DISCOVERY_PATH}`);
  // The document has to agree about who it belongs to. A discovery document served
  // from one issuer that names another is either a misconfiguration or an attack.
  if (value.issuer?.replace(/\/$/, '') !== issuer.replace(/\/$/, '')) {
    throw new OidcError('the provider\'s discovery document names a different issuer');
  }
  if (!value.authorization_endpoint || !value.token_endpoint || !value.jwks_uri) {
    throw new OidcError('the provider\'s discovery document is missing an endpoint');
  }
  discoveryCache.set(issuer, { at: now.getTime(), value });
  return value;
}

async function keys(jwksUri: string, now: Date): Promise<Jwk[]> {
  const cached = jwksCache.get(jwksUri);
  if (cached && now.getTime() - cached.at < CACHE_TTL_MS) return cached.value;
  const value = (await getJson<{ keys: Jwk[] }>(jwksUri)).keys ?? [];
  jwksCache.set(jwksUri, { at: now.getTime(), value });
  return value;
}

/** Tests and a key rotation both need this; nothing in a request path calls it. */
export const clearDiscoveryCache = (): void => { discoveryCache.clear(); jwksCache.clear(); };

const toKeyObject = (jwk: Jwk): ReturnType<typeof createPublicKey> => {
  if (jwk.kty === 'RSA' && jwk.n && jwk.e) {
    return createPublicKey({ key: { kty: 'RSA', n: jwk.n, e: jwk.e }, format: 'jwk' });
  }
  if (jwk.kty === 'EC' && jwk.crv && jwk.x && jwk.y) {
    return createPublicKey({ key: { kty: 'EC', crv: jwk.crv, x: jwk.x, y: jwk.y }, format: 'jwk' });
  }
  throw new OidcError('the provider published a key this adapter cannot read');
};

const VERIFY_ALG: Record<string, { hash: string; dsa?: boolean }> = {
  RS256: { hash: 'RSA-SHA256' }, RS384: { hash: 'RSA-SHA384' }, RS512: { hash: 'RSA-SHA512' },
  ES256: { hash: 'sha256', dsa: true }, ES384: { hash: 'sha384', dsa: true },
};

interface Claims {
  iss?: string; aud?: string | string[]; sub?: string; exp?: number; iat?: number;
  nonce?: string; email?: string; name?: string; preferred_username?: string;
}

async function verifyIdToken(
  idToken: string, connection: ConnectionDescriptor, expectedNonce: string, now: Date,
): Promise<Claims> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new OidcError('the id token is not a JWT');
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];

  let header: { alg?: string; kid?: string };
  let claims: Claims;
  try {
    header = JSON.parse(fromB64url(encodedHeader).toString('utf8')) as { alg?: string; kid?: string };
    claims = JSON.parse(fromB64url(encodedPayload).toString('utf8')) as Claims;
  } catch { throw new OidcError('the id token is not readable'); }

  // `alg: none` and HS* are refused rather than handled. Accepting an algorithm the
  // TOKEN chooses is how JWT verification is defeated: a symmetric algorithm turns the
  // provider's PUBLIC key into a signing key anybody can use.
  if (!header.alg || !ALLOWED_ALGS.has(header.alg)) {
    throw new OidcError(`the id token is signed with ${header.alg ?? 'nothing'}, which is not accepted`);
  }

  const discovery = await discover(connection.issuer, now);
  const published = await keys(discovery.jwks_uri, now);
  const candidates = header.kid ? published.filter((k) => k.kid === header.kid) : published;
  if (candidates.length === 0) throw new OidcError('the id token names a key the provider does not publish');

  const spec = VERIFY_ALG[header.alg]!;
  const signed = Buffer.from(`${encodedHeader}.${encodedPayload}`);
  const signature = fromB64url(encodedSignature);
  const verified = candidates.some((jwk) => {
    try {
      const verifier = createVerify(spec.hash);
      verifier.update(signed);
      verifier.end();
      return verifier.verify(
        spec.dsa ? { key: toKeyObject(jwk), dsaEncoding: 'ieee-p1363' } : toKeyObject(jwk),
        signature);
    } catch { return false; }
  });
  if (!verified) throw new OidcError('the id token signature does not verify');

  // THE CHECK THAT KEEPS TENANTS APART (FR-3): a token from another provider verifies
  // against its own keys perfectly well, and this is what refuses it.
  if (claims.iss?.replace(/\/$/, '') !== connection.issuer.replace(/\/$/, '')) {
    throw new OidcError('the id token was issued by a different provider');
  }
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(connection.clientId)) {
    throw new OidcError('the id token was issued for a different application');
  }
  if (!claims.sub) throw new OidcError('the id token names no subject');
  const seconds = Math.floor(now.getTime() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_S < seconds) {
    throw new OidcError('the id token has expired');
  }
  if (typeof claims.iat === 'number' && claims.iat - CLOCK_SKEW_S > seconds) {
    throw new OidcError('the id token is dated in the future');
  }

  // The nonce binds this token to the sign-in WE started. Compared in constant time
  // for the same reason every other secret comparison here is.
  const presented = Buffer.from(claims.nonce ?? '');
  const expected = Buffer.from(expectedNonce);
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    throw new OidcError('the id token does not answer the sign-in that was started');
  }
  return claims;
}

export class OidcProvider implements IdentityProviderPort {
  async begin(connection: ConnectionDescriptor, now: Date): Promise<AuthorizationRequest> {
    const discovery = await discover(connection.issuer, now);
    const state = b64url(randomBytes(32));
    const nonce = b64url(randomBytes(32));
    // PKCE, S256. The verifier never leaves this server, so an authorisation code
    // intercepted in a redirect cannot be exchanged by whoever intercepted it.
    const codeVerifier = b64url(randomBytes(32));
    const codeChallenge = b64url(createHash('sha256').update(codeVerifier).digest());

    const url = new URL(discovery.authorization_endpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', connection.clientId);
    url.searchParams.set('redirect_uri', connection.redirectUri);
    url.searchParams.set('scope', 'openid email profile offline_access');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    // No secret and no token is in this URL: a client id, a challenge and two opaque
    // random values, which is exactly what the standing "never a token in a URL"
    // constraint permits.
    return { url: url.toString(), state, codeVerifier, nonce };
  }

  async complete(
    connection: ConnectionDescriptor,
    proof: { code: string; codeVerifier: string; nonce: string },
    now: Date,
  ): Promise<AuthenticatedSubject> {
    const discovery = await discover(connection.issuer, now);
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: proof.code,
      redirect_uri: connection.redirectUri,
      client_id: connection.clientId,
      client_secret: connection.clientSecret,
      code_verifier: proof.codeVerifier,
    });
    // The secret and the code are in the BODY of a server-to-server POST. Neither has
    // ever been in a URL, and neither is logged.
    const tokens = await getJson<{ id_token?: string; refresh_token?: string }>(
      discovery.token_endpoint,
      { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body },
    );
    if (!tokens.id_token) throw new OidcError('the provider returned no id token');

    const claims = await verifyIdToken(tokens.id_token, connection, proof.nonce, now);
    return {
      issuer: connection.issuer,
      subject: claims.sub!,
      ...(claims.email ? { email: claims.email } : {}),
      ...(claims.name || claims.preferred_username
        ? { displayName: claims.name ?? claims.preferred_username! } : {}),
      ...(tokens.refresh_token ? { upstreamRefreshToken: tokens.refresh_token } : {}),
    };
  }

  /**
   * AC-2, as one request. The refresh grant is the provider's own answer to "does this
   * identity still exist and is it still allowed in" - a deprovisioned account gets
   * `invalid_grant` and there is nothing for us to poll, sweep or reconcile.
   *
   * A NETWORK FAILURE IS NOT A DEPROVISIONING, and the difference is why this throws in
   * one case and returns undefined in the other: an unreachable provider must not sign
   * out a hotel's entire management team, and a refusal must not be shrugged off.
   */
  async stillProvisioned(
    connection: ConnectionDescriptor, upstreamRefreshToken: string, now: Date,
  ): Promise<{ upstreamRefreshToken?: string } | undefined> {
    const discovery = await discover(connection.issuer, now);
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: upstreamRefreshToken,
      client_id: connection.clientId,
      client_secret: connection.clientSecret,
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(discovery.token_endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      throw new OidcError(`the identity provider could not be reached: ${(err as Error).name}`);
    } finally {
      clearTimeout(timer);
    }

    // 400 with invalid_grant is the standard answer for a revoked, expired or unknown
    // refresh token - which is what deprovisioning looks like from here.
    if (res.status === 400 || res.status === 401) return undefined;
    if (!res.ok) throw new OidcError(`the identity provider answered ${res.status}`);
    const tokens = await res.json() as { refresh_token?: string };
    return { ...(tokens.refresh_token ? { upstreamRefreshToken: tokens.refresh_token } : {}) };
  }
}

export const oidcProvider = new OidcProvider();
