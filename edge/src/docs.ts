import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { OPENAPI_DOCUMENT, OPENAPI_VERSION } from '../../contracts/generated/ts/openapi';

/**
 * API documentation, served FROM the schema of record.
 *
 * The direction matters. `contracts/openapi.yaml` is the source; the TypeScript
 * bindings, the Dart bindings and this document are all generated from it
 * (ARCHITECTURE-SPINE.md revision 2026-09-02b). Generating a spec from decorated
 * controllers - the usual Swagger setup - would invert that and make the code the
 * source, which is exactly what the codegen-drift gate exists to prevent.
 *
 * Swagger UI is served from `swagger-ui-dist` inside the image: no CDN, so it works
 * air-gapped and loads no third-party script into an origin that also serves
 * authenticated endpoints.
 *
 * `API_DOCS=0` disables both routes (404). The default is ON, deliberately: every
 * endpoint is permission-gated server-side (AD-11), and hiding an API's shape is
 * not a security control - it mostly costs the engineers who need it. Operators who
 * disagree have one variable.
 */

export const docsEnabled = (): boolean => process.env.API_DOCS !== '0';

const UI_DIR = (() => {
  try {
    // swagger-ui-dist has no main entry worth requiring; resolve its package.json.
    return join(require.resolve('swagger-ui-dist/package.json'), '..');
  } catch {
    return undefined;
  }
})();

/**
 * An explicit allowlist, not an extension match. Allowing `.js` served every
 * script in swagger-ui-dist - `index.js`, `absolute-path.js` and the rest - which
 * is not a security hole but is a wider surface than the page needs, and the
 * narrowest thing that works is the right amount to expose. Found by probing the
 * route rather than by reading it.
 */
const ASSETS: Record<string, string> = {
  'swagger-ui.css': 'text/css; charset=utf-8',
  'swagger-ui-bundle.js': 'application/javascript; charset=utf-8',
  'swagger-ui-standalone-preset.js': 'application/javascript; charset=utf-8',
  'favicon-16x16.png': 'image/png',
  'favicon-32x32.png': 'image/png',
};

export function serveOpenApiDocument(res: ServerResponse, method = 'GET'): void {
  const body = JSON.stringify(OPENAPI_DOCUMENT, null, 2);
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(body)),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(method === 'HEAD' ? undefined : body);
}

export function serveDocsPage(res: ServerResponse, method = 'GET'): void {
  // Content-Security-Policy is tight on purpose. Swagger UI is a large third-party
  // bundle on an origin that also serves authenticated endpoints; if it ever ships
  // an XSS, this is what limits the damage. 'unsafe-inline' covers only the small
  // bootstrap below and Swagger UI's own injected styles.
  const csp = [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
  ].join('; ');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>JazzTicketing API ${OPENAPI_VERSION}</title>
    <link rel="stylesheet" href="./docs/assets/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
      /* Design tokens from ux-designs/.../DESIGN.md - the accent is petrol with
         white ink; cyan is a highlight and never a button ground. */
      .topbar { display: none; }
      .swagger-ui .info hgroup.main a { display: none; }
      .swagger-ui .btn.authorize { background: #27565D; color: #FFFFFF; border-color: #27565D; }
      .swagger-ui .btn.authorize svg { fill: #FFFFFF; }
      .jt-banner {
        background: #27565D; color: #FFFFFF; padding: 12px 16px;
        font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      }
      .jt-banner code { background: rgba(255,255,255,.15); padding: 1px 5px; border-radius: 3px; }
    </style>
  </head>
  <body>
    <div class="jt-banner">
      <strong>JazzTicketing API ${OPENAPI_VERSION}</strong> &mdash; generated from
      <code>contracts/openapi.yaml</code>, the schema of record. Story 1.0 surface only.
      Authorize with a fixture token; it requires <code>FIXTURE_AUTH=1</code> on the cell.
    </div>
    <div id="swagger-ui"></div>
    <script src="./docs/assets/swagger-ui-bundle.js"></script>
    <script src="./docs/assets/swagger-ui-standalone-preset.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: './openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
        tryItOutEnabled: true,
        persistAuthorization: false,
        defaultModelsExpandDepth: 1,
        docExpansion: 'list',
      });
    </script>
  </body>
</html>
`;
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-security-policy': csp,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  });
  res.end(method === 'HEAD' ? undefined : html);
}

/**
 * Serve one Swagger UI asset. Path traversal is the obvious risk in serving files
 * by request path, so: the name is taken as a single path segment, the resolved
 * path must still sit inside the package directory, and only the extensions above
 * are served.
 */
export function serveDocsAsset(name: string, req: IncomingMessage, res: ServerResponse): void {
  const notFound = (): void => { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); };
  if (!UI_DIR) return notFound();

  const type = ASSETS[name];
  if (!type) return notFound();

  // Belt and braces even with an allowlist: resolve and confirm the result is still
  // inside the package directory.
  const target = resolve(UI_DIR, name);
  if (!target.startsWith(UI_DIR + sep)) return notFound();
  if (!existsSync(target) || !statSync(target).isFile()) return notFound();

  res.writeHead(200, {
    'content-type': type,
    // Vendored assets are immutable for a given image; the page itself is no-store.
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
  });
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(target).pipe(res);
}
