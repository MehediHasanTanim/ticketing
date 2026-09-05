/**
 * THE IDENTITY PORT (Story 1.5).
 *
 * The story's structure note is the whole design: "`adapters/identity/` - the only
 * place a provider SDK or protocol type exists. `core` sees an authenticated-subject
 * value object, never a SAML assertion."
 *
 * So this file names what an authentication PRODUCED, in terms the domain understands,
 * and nothing about how. No XML, no JWT, no discovery document, no client secret. A
 * second protocol arrives as a second adapter and changes nothing here.
 */

/** What a provider told us, once the adapter has verified it was really the provider. */
export interface AuthenticatedSubject {
  /** The provider's own identifier, matched against the stored connection's issuer. */
  readonly issuer: string;
  /**
   * STABLE FOR THE LIFE OF THE ACCOUNT, and the reason mapping is not done on email:
   * an address can be reassigned to a new employee, and matching on it alone is how a
   * leaver's replacement inherits their access.
   */
  readonly subject: string;
  readonly email?: string;
  readonly displayName?: string;
  /**
   * The provider's own refresh credential, when it issued one. It exists for exactly
   * one purpose: asking the provider, at our next token validation, whether this
   * identity still stands (AC-2). Stored encrypted, never returned to any caller and
   * never logged.
   */
  readonly upstreamRefreshToken?: string;
}

/** Where an authentication begins. Carries no secret. */
export interface AuthorizationRequest {
  readonly url: string;
  readonly state: string;
  readonly codeVerifier: string;
  readonly nonce: string;
}

export interface ConnectionDescriptor {
  readonly protocol: 'oidc' | 'saml';
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}

/**
 * Implemented once per protocol in `adapters/`. Every method may reach the network,
 * which is precisely why none of them is in `core`.
 */
export interface IdentityProviderPort {
  /** The redirect that starts a sign-in, with PKCE and a single-use state. */
  begin(connection: ConnectionDescriptor, now: Date): Promise<AuthorizationRequest>;

  /** Exchange what came back for a verified subject. Throws if anything fails to verify. */
  complete(
    connection: ConnectionDescriptor,
    proof: { code: string; codeVerifier: string; nonce: string },
    now: Date,
  ): Promise<AuthenticatedSubject>;

  /**
   * IS THIS IDENTITY STILL PROVISIONED UPSTREAM? Asked at every one of our token
   * refreshes, which is what makes FR-3's "access is lost at next token validation,
   * without a manual step" true rather than aspirational.
   *
   * Returns the replacement upstream credential when the provider rotated it, so the
   * chain keeps working; `undefined` means the identity is gone.
   */
  stillProvisioned(
    connection: ConnectionDescriptor,
    upstreamRefreshToken: string,
    now: Date,
  ): Promise<{ upstreamRefreshToken?: string } | undefined>;
}
