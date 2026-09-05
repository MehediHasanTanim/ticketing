import { ValidationError } from '../validation';

export { ValidationError };

/**
 * The identity connection, as the domain understands it (Story 1.5, FR-3, FR-83).
 * Pure: no I/O, no clock of its own, no protocol type.
 */

export type Protocol = 'oidc' | 'saml';

export interface ConnectionState {
  protocol: Protocol;
  issuer: string;
  clientId: string;
  clientSecretRef: string;
  justInTimeProvisioning: boolean;
  active: boolean;
}

/**
 * SAML is accepted and stored, and a SAML SIGN-IN is refused.
 *
 * XML signature verification is the most historically broken thing in identity -
 * signature wrapping has defeated implementation after implementation, including ones
 * written by people who do this for a living - and hand-rolling it in the
 * authentication path would be worse than not shipping it. Adopting a reviewed library
 * is a dependency decision in the most security-sensitive place in the product, taken
 * deliberately in epics.md rather than incidentally here (settled 2026-09-05: OIDC now,
 * SAML deferred).
 *
 * An administrator is told at CONNECT time, not at sign-in time, which is the whole
 * reason this is a named constant rather than an error thrown somewhere downstream.
 */
export const SAML_UNAVAILABLE_REASON =
  'SAML 2.0 connections can be configured but cannot yet complete a sign-in: XML '
  + 'signature verification needs a reviewed library, and adopting one in the '
  + 'authentication path is a decision to take deliberately rather than a detail to '
  + 'improvise. Use OIDC, or ask Jazzware when SAML sign-in is scheduled.';

const ALLOWED_KEYS = new Set([
  'protocol', 'issuer', 'clientId', 'clientSecretRef', 'justInTimeProvisioning',
]);

/** The secret-store REFERENCE, which is all this system will accept. */
const SECRET_REF = /^[A-Za-z0-9_.-]+$/;

const assertHttpsUrl = (value: string, field: string): string => {
  let url: URL;
  try { url = new URL(value); } catch { throw new ValidationError(`${field} must be a URL`); }
  // LOOPBACK IS THE ONE EXCEPTION, and it is a real one rather than a test concession.
  // The reason to demand https is that a client secret and an authorisation code would
  // otherwise cross a network in clear; on 127.0.0.1 or ::1 the packets never leave the
  // host, so there is nothing between the two ends to intercept them. This is the same
  // reasoning RFC 8252 uses to permit loopback redirects for native apps.
  //
  // `localhost` is NOT included, deliberately: it is a name, and a name resolves -
  // through /etc/hosts, through DNS, through a search domain - so a "localhost"
  // provider is not guaranteed to be local at all. A literal address is.
  const loopback = url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new ValidationError(
      `${field} must be https (http is permitted only on the loopback address, where `
      + 'nothing crosses a network to be intercepted)');
  }
  if (url.search || url.hash) throw new ValidationError(`${field} must carry no query string or fragment`);
  return url.toString().replace(/\/$/, '');
};

export function validateConnection(input: unknown): ConnectionState {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('a connection needs a protocol, an issuer, a client id and a secret reference');
  }
  const body = input as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) {
      // A refused field is how a caller finds out we will not take their client secret
      // over this API, rather than believing we stored it.
      throw new ValidationError(
        `${key} is not a field of an identity connection. In particular this API does `
        + 'not accept a client secret: it takes a REFERENCE into the platform secret '
        + 'store, so the value never enters the system and cannot leak from it.');
    }
  }

  const protocol = body.protocol;
  if (protocol !== 'oidc' && protocol !== 'saml') {
    throw new ValidationError('protocol must be oidc or saml');
  }
  const issuer = assertHttpsUrl(typeof body.issuer === 'string' ? body.issuer.trim() : '', 'issuer');
  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
  if (!clientId || clientId.length > 256) throw new ValidationError('clientId is required');
  const clientSecretRef = typeof body.clientSecretRef === 'string' ? body.clientSecretRef.trim() : '';
  if (!SECRET_REF.test(clientSecretRef) || clientSecretRef.length > 128) {
    throw new ValidationError(
      'clientSecretRef must be a name in the platform secret store - letters, digits, '
      + 'dot, dash and underscore. It is a reference, never the secret itself.');
  }
  if (body.justInTimeProvisioning !== undefined && typeof body.justInTimeProvisioning !== 'boolean') {
    throw new ValidationError('justInTimeProvisioning must be true or false');
  }

  return {
    protocol,
    issuer,
    clientId,
    clientSecretRef,
    // FR-83, and the default lives HERE rather than in a column default alone, so a
    // caller omitting the field and a database creating a row cannot disagree. There is
    // no configuration in which this defaults on.
    justInTimeProvisioning: body.justInTimeProvisioning === true,
    active: true,
  };
}

/**
 * A Tenant slug: the routing hint `GET /auth/sso/start` needs in order to choose a
 * provider before any credential exists. Not a credential and not a secret - it confers
 * nothing, and the start endpoint answers identically whether or not it resolves, so it
 * cannot be used to discover which Tenants exist.
 */
export function slugify(name: string): string {
  const slug = name.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
  return slug || 'tenant';
}

/**
 * `returnTo` is where a browser lands after signing in, so it is exactly the shape an
 * open redirect takes. Validated as a PATH WITHIN THIS CONSOLE and nothing else.
 *
 * The cases that matter are the ones that look like paths and are not: `//evil.test` is
 * a protocol-relative URL a browser resolves to another origin, `/\evil.test` is the
 * same trick with a backslash, and a scheme anywhere means it was never a path.
 */
export function safeReturnTo(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const candidate = value.trim();
  if (candidate.length > 512) return undefined;
  if (!candidate.startsWith('/')) return undefined;
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return undefined;
  if (/[\r\n]/.test(candidate)) return undefined;
  // A colon before the first path separator is a scheme, however it is spelled.
  if (/^[^/]*:/.test(candidate.slice(1))) return undefined;
  return candidate;
}
