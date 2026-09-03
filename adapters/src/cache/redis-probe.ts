import { createConnection } from 'node:net';

/**
 * Redis reachability for the cell health check (AC-5). Story 1.0 needs to know the
 * cache is up, not to use it, so this is a raw PING rather than a client dependency.
 * The client arrives with the first story that actually caches something.
 */
export function pingRedis(url: string, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok); } };
    try {
      const u = new URL(url);
      const socket = createConnection(
        { host: u.hostname, port: Number(u.port || 6379) },
        () => socket.write('*1\r\n$4\r\nPING\r\n'),
      );
      socket.setTimeout(timeoutMs, () => { socket.destroy(); finish(false); });
      socket.on('data', (d) => { socket.end(); finish(d.toString().startsWith('+PONG')); });
      socket.on('error', () => finish(false));
    } catch { finish(false); }
  });
}
