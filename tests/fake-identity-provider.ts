import { createServer, type Server } from 'node:http';
import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';

/**
 * A REAL OIDC provider, in process, with a real RSA keypair.
 *
 * Not a stub of our adapter: this serves a genuine discovery document and JWKS, and
 * signs genuine RS256 id tokens, so the adapter verifies signatures the way it will in
 * production rather than against a mock that agrees with it. A mocked verifier proves
 * that our code calls our code.
 *
 * It runs on the LOOPBACK ADDRESS over http, which the connection model permits for
 * exactly the reason that makes it safe: the packets never leave the host.
 */

export interface FakeProviderControls {
  /** What the next code exchange should assert about the person signing in. */
  next: { subject: string; email?: string; name?: string; nonce?: string; issuerOverride?: string };
  /** Flip to make the provider refuse its own refresh token - what deprovisioning looks like. */
  deprovisioned: boolean;
  /** Whether a refresh token is issued at all, so the "no upstream credential" path is reachable. */
  issueRefreshToken: boolean;
  /** What the token endpoint actually received, so PKCE can be asserted rather than assumed. */
  lastTokenRequest?: Record<string, string>;
  /** Rotate the upstream refresh token on the next successful refresh. */
  rotateRefreshTo?: string;
}

export interface FakeProvider {
  issuer: string;
  controls: FakeProviderControls;
  stop(): Promise<void>;
}

const b64url = (b: Buffer): string => b.toString('base64url');

export async function startFakeProvider(): Promise<FakeProvider> {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  // Exported straight from the public KeyObject: `createPublicKey` given one that is
  // already public throws "expected private", which is a confusing way to learn that
  // it derives rather than converts.
  const jwk = publicKey.export({ format: 'jwk' }) as unknown as Record<string, string>;
  const kid = 'fake-provider-key-1';

  const controls: FakeProviderControls = {
    next: { subject: 'upstream-subject-1' },
    deprovisioned: false,
    issueRefreshToken: true,
  };
  let issuer = '';

  const sign = (claims: Record<string, unknown>): string => {
    const header = b64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })));
    const payload = b64url(Buffer.from(JSON.stringify(claims)));
    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    signer.end();
    return `${header}.${payload}.${b64url(signer.sign(privateKey as KeyObject))}`;
  };

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', issuer || 'http://127.0.0.1');
    const send = (status: number, body: unknown): void => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (url.pathname === '/.well-known/openid-configuration') {
      return send(200, {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/jwks`,
      });
    }
    if (url.pathname === '/jwks') {
      return send(200, { keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] });
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', () => {
        const form = Object.fromEntries(new URLSearchParams(raw));
        controls.lastTokenRequest = form;

        if (form.grant_type === 'refresh_token') {
          // What a deprovisioned account looks like from the outside: the provider
          // refuses to honour its own refresh token.
          if (controls.deprovisioned) return send(400, { error: 'invalid_grant' });
          return send(200, {
            access_token: 'upstream-access',
            ...(controls.rotateRefreshTo ? { refresh_token: controls.rotateRefreshTo } : {}),
          });
        }

        const now = Math.floor(Date.now() / 1000);
        const idToken = sign({
          iss: controls.next.issuerOverride ?? issuer,
          aud: form.client_id,
          sub: controls.next.subject,
          iat: now,
          exp: now + 300,
          ...(controls.next.nonce ? { nonce: controls.next.nonce } : {}),
          ...(controls.next.email ? { email: controls.next.email } : {}),
          ...(controls.next.name ? { name: controls.next.name } : {}),
        });
        return send(200, {
          id_token: idToken,
          access_token: 'upstream-access',
          ...(controls.issueRefreshToken ? { refresh_token: 'upstream-refresh-1' } : {}),
        });
      });
      return undefined;
    }
    return send(404, { error: 'not_found' });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no address');
  issuer = `http://127.0.0.1:${address.port}`;

  return {
    issuer,
    controls,
    stop: () => new Promise<void>((resolve) => { server.close(() => resolve()); }),
  };
}
