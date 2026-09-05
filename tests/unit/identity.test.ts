import { describe, it, expect } from 'vitest';
import {
  validateConnection, slugify, safeReturnTo, SAML_UNAVAILABLE_REASON, ValidationError,
} from '../../core/src/identity/connection';

/**
 * Story 1.5's pure half. The refusals are the point: what this system will not accept,
 * and what it will not redirect a browser to.
 */

const OK = {
  protocol: 'oidc', issuer: 'https://login.acme.example',
  clientId: 'jazzticketing', clientSecretRef: 'acme-oidc',
};

describe('connecting a provider (AC-1, FR-3, FR-83)', () => {
  it('defaults just-in-time provisioning OFF, and there is no way to get it on by accident', () => {
    // FR-83. The default lives in the aggregate as well as in a column default, so a
    // caller omitting the field and a database creating a row cannot disagree.
    expect(validateConnection(OK).justInTimeProvisioning).toBe(false);
    expect(validateConnection({ ...OK, justInTimeProvisioning: false }).justInTimeProvisioning).toBe(false);
    // Only a literal true turns it on - not "true", not 1, not a truthy object.
    for (const value of ['true', 1, {}, 'yes']) {
      expect(() => validateConnection({ ...OK, justInTimeProvisioning: value }), String(value))
        .toThrow(ValidationError);
    }
    expect(validateConnection({ ...OK, justInTimeProvisioning: true }).justInTimeProvisioning).toBe(true);
  });

  it('REFUSES a client secret sent over the API', () => {
    // The strongest form of "secrets live in the platform secret store": a value that
    // never enters the system cannot leak from it. Refused rather than ignored, so the
    // caller does not believe it was stored.
    for (const field of ['clientSecret', 'client_secret', 'secret']) {
      try {
        validateConnection({ ...OK, [field]: 'super-secret-value' });
        expect.unreachable(`${field} should have been refused`);
      } catch (err) {
        expect(err, field).toBeInstanceOf(ValidationError);
        // And the refusal explains the design rather than saying "unknown field".
        expect((err as Error).message).toMatch(/does not accept a client secret/);
        // The value itself is never echoed back.
        expect((err as Error).message).not.toContain('super-secret-value');
      }
    }
  });

  it('requires https, except on the loopback address', () => {
    expect(validateConnection(OK).issuer).toBe('https://login.acme.example');
    // Loopback is safe by construction: the packets never leave the host.
    expect(validateConnection({ ...OK, issuer: 'http://127.0.0.1:9000' }).issuer)
      .toBe('http://127.0.0.1:9000');
    for (const issuer of [
      'http://login.acme.example',
      // A NAME, not an address: it resolves, and what it resolves to is not
      // guaranteed to be local.
      'http://localhost:9000',
      'ftp://login.acme.example', 'not-a-url', '',
      // A query string or fragment on an issuer means somebody pasted a URL from a
      // browser bar, and discovery would be performed against the wrong thing.
      'https://login.acme.example?tenant=a', 'https://login.acme.example#x',
    ]) {
      expect(() => validateConnection({ ...OK, issuer }), issuer).toThrow(ValidationError);
    }
  });

  it('takes a secret REFERENCE and refuses anything that is not one', () => {
    expect(validateConnection(OK).clientSecretRef).toBe('acme-oidc');
    for (const clientSecretRef of ['', 'has space', 'has/slash', '$(whoami)', 'x'.repeat(129)]) {
      expect(() => validateConnection({ ...OK, clientSecretRef }), JSON.stringify(clientSecretRef))
        .toThrow(ValidationError);
    }
  });

  it('accepts a SAML connection and says plainly that sign-in is not available', () => {
    // Configurable, not usable - and the administrator is told when they connect it
    // rather than when their people cannot get in.
    expect(validateConnection({ ...OK, protocol: 'saml' }).protocol).toBe('saml');
    expect(SAML_UNAVAILABLE_REASON).toMatch(/signature verification/);
    for (const protocol of ['ldap', 'oauth2', '', 'OIDC']) {
      expect(() => validateConnection({ ...OK, protocol }), protocol).toThrow(ValidationError);
    }
  });
});

describe('the return path after sign-in', () => {
  it('accepts a path within this console', () => {
    expect(safeReturnTo('/properties')).toBe('/properties');
    expect(safeReturnTo('/properties/01P-a/setup?tab=rooms')).toBe('/properties/01P-a/setup?tab=rooms');
  });

  it('REFUSES everything that is not one, including the shapes that look like paths', () => {
    // An open redirect on a sign-in route is how a credential ends up somewhere it was
    // not meant to go, so the cases that matter are the ones a careless check accepts.
    for (const candidate of [
      'https://evil.test',
      // Protocol-relative: a browser resolves this to another ORIGIN.
      '//evil.test',
      // The same trick with a backslash, which several parsers normalise to a slash.
      '/\\evil.test',
      'javascript:alert(1)',
      // A scheme after the leading slash.
      '/javascript:alert(1)',
      // Header injection through a Location value.
      '/ok\r\nSet-Cookie: a=b',
      'properties',
      'x'.repeat(513),
      '',
    ]) {
      expect(safeReturnTo(candidate), JSON.stringify(candidate)).toBeUndefined();
    }
    expect(safeReturnTo(undefined)).toBeUndefined();
    expect(safeReturnTo(null)).toBeUndefined();
  });
});

describe('the Tenant slug', () => {
  it('is a routing hint derived from the name, and never empty', () => {
    expect(slugify('Seaside Group')).toBe('seaside-group');
    expect(slugify('  The Harbour & Quay, Ltd.  ')).toBe('the-harbour-quay-ltd');
    // A name with nothing sluggable still has to produce something addressable.
    expect(slugify('***')).toBe('tenant');
    expect(slugify('')).toBe('tenant');
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(56);
  });
});
