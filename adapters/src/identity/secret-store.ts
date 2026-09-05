/**
 * THE PLATFORM SECRET STORE, as one function.
 *
 * The standing convention is "secrets from the platform secret store, never on a
 * device", and Story 1.5 T1 repeats it. No such store is deployed yet, so this reads
 * the process environment - which is what a secret store injects into a container
 * anyway, and is the shape every one of them supports.
 *
 * It is ONE FUNCTION on purpose. When Jazzware adopts a real store, this body changes
 * and nothing else does: no handler, no migration and no row, because what is stored
 * beside a connection is a REFERENCE and never a value.
 */

const PREFIX = 'IDP_SECRET_';

export class SecretUnavailable extends Error {}

/**
 * @param ref the `client_secret_ref` stored on the connection. Never the secret.
 */
export function resolveSecret(ref: string): string {
  // Normalised the way environment variables are actually spelled, so a reference of
  // `acme-oidc` resolves `IDP_SECRET_ACME_OIDC` rather than failing on a hyphen.
  const name = PREFIX + ref.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();
  const value = process.env[name];
  if (!value) {
    // NAMES THE VARIABLE, not the secret. An operator who connected a provider and
    // forgot to supply its secret needs to know which one to set; nobody needs the
    // value echoed into a log.
    throw new SecretUnavailable(
      `no secret is configured for reference ${JSON.stringify(ref)}: set ${name} from `
      + 'the platform secret store. The connection stores only the reference, so the '
      + 'secret has to be supplied to the runtime separately - by design.');
  }
  return value;
}
