import { createApp } from './server';
import { cellName } from '../../adapters/src/postgres/config';
import { closePool } from '../../adapters/src/postgres/pool';
import { fixtureSecretOrThrow } from './auth';
import { controlPlaneSecretOrThrow, CONTROL_PLANE_ENABLED } from './control-plane/operator-auth';
import { sessionSecretOrThrow } from './session-token';
import { upstreamTokenKeyOrThrow } from '../../adapters/src/crypto/secret-box';

/**
 * Configuration is checked BEFORE the listener opens, so a missing secret is a
 * container that refuses to start rather than one that starts and fails at the
 * first sign-in. Both of these throw when unset (there is deliberately no fallback
 * for either), and calling them here is what turns that into a boot failure with a
 * legible message in the container log.
 */
const assertSecretsPresent = (): void => {
  if (process.env.FIXTURE_AUTH === '1') fixtureSecretOrThrow();
  if (CONTROL_PLANE_ENABLED) controlPlaneSecretOrThrow();
  // Story 1.5: the stub is a Story 1.0 fixture and has no production path any more.
  // Refusing to START is the loud half of that; `edge/src/auth.ts` refusing to resolve
  // is the quiet half, and neither relies on the other.
  if (process.env.FIXTURE_AUTH === '1' && process.env.NODE_ENV === 'production') {
    throw new Error(
      'FIXTURE_AUTH=1 with NODE_ENV=production. The fixture credential is Story 1.0\'s '
      + 'isolation-gate stub and Story 1.5 removed its production path: corporate users '
      + 'sign in through their Tenant\'s identity provider now. Unset FIXTURE_AUTH.');
  }
  // Story 1.5: encrypts the provider refresh tokens that make deprovisioning take
  // effect. Required only where a provider can actually be connected, which is
  // everywhere the control plane is - so, unconditionally.
  upstreamTokenKeyOrThrow();
  // Story 1.3: a cell signs every staff session with this, so it is unconditional.
  // Each check is a SEPARATE call for a reason worth remembering - when these were
  // folded together, the first failure masked the others and all the failure cases
  // printed the same message, so three of them were never actually exercised.
  sessionSecretOrThrow();
};

try {
  assertSecretsPresent();
} catch (err) {
  console.error(`[jazzticketing] refusing to start: ${(err as Error).message}`);
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3001);
const server = createApp();

server.listen(port, () => {
  console.log(`[jazzticketing] cell=${cellName()} listening on ${port}`);
});

/**
 * Graceful shutdown. A container orchestrator sends SIGTERM and then kills; an
 * API that ignores it drops in-flight requests on every rolling deploy, which
 * on a handset looks exactly like the offline path it is not.
 */
let shuttingDown = false;
const shutdown = (signal: string): void => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[jazzticketing] ${signal} received, draining`);
  server.close(() => {
    void closePool().then(() => {
      console.log('[jazzticketing] drained, exiting');
      process.exit(0);
    });
  });
  // Do not hang for ever if a connection refuses to close.
  setTimeout(() => {
    console.error('[jazzticketing] drain timed out, exiting anyway');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
