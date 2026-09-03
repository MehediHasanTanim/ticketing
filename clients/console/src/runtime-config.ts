/**
 * Runtime configuration, fetched rather than compiled in, so one built image
 * serves every environment (see clients/console/Dockerfile).
 *
 * Falls back to same-origin `/v1` for local `vite dev`, where no entrypoint has
 * written config.json.
 */
export interface RuntimeConfig {
  apiBaseUrl: string;
  cellName: string;
}

const FALLBACK: RuntimeConfig = { apiBaseUrl: '/v1', cellName: 'dev' };

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (!res.ok) return FALLBACK;
    const body = (await res.json()) as Partial<RuntimeConfig>;
    return {
      apiBaseUrl: body.apiBaseUrl?.trim() || FALLBACK.apiBaseUrl,
      cellName: body.cellName?.trim() || FALLBACK.cellName,
    };
  } catch {
    return FALLBACK;
  }
}
