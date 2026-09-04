import { createApp } from './server';
import { cellName } from '../../adapters/src/postgres/config';
import { closePool } from '../../adapters/src/postgres/pool';
import { fixtureSecretOrThrow } from './auth';
import { controlPlaneSecretOrThrow, CONTROL_PLANE_ENABLED } from './control-plane/operator-auth';

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
