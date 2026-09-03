import { createApp } from './server';
import { cellName } from '@adapters/postgres/config';
import { closePool } from '@adapters/postgres/pool';

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
