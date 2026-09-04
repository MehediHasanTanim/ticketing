import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { OPENAPI_DOCUMENT, OPENAPI_VERSION } from '../../contracts/generated/ts/openapi';
import { CONTROL_PLANE_OPENAPI_DOCUMENT, CONTROL_PLANE_OPENAPI_VERSION }
  from '../../contracts/generated/ts/control-plane-openapi';

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

/**
 * TWO SURFACES, TWO DOCUMENTS, TWO SWITCHES.
 *
 * `contracts/openapi.yaml` describes a regional cell; `control-plane-openapi.yaml`
 * describes the Jazzware-internal surface (AD-4, FR-1). Each is served under its own
 * prefix from its own document, and the smoke suite asserts that neither prefix ever
 * serves the other's - a docs page is the easiest place for the two surfaces to bleed
 * together, because it is the one place they look like the same kind of thing.
 */
export interface DocsSurface {
  /** Shown in the page title and the banner. */
  readonly name: string;
  readonly version: string;
  readonly document: unknown;
  /** Where the page fetches its document from, relative to the page itself. */
  readonly documentHref: string;
  /** The source file, named on the page so a reader knows what to edit. */
  readonly source: string;
  readonly note: string;
  /**
   * The banner ground. The internal surface is deliberately NOT petrol: the UX
   * spine gives W35 "an amber accent instead of petrol", because an internal tool
   * that looks like the customer product is how someone acts in the wrong context.
   * `#A8490B` is DESIGN.md's existing `state-due` token, borrowed rather than
   * invented - 5.8:1 against white ink, so it passes AA. The real W35 accent token
   * is the UX spine's to define.
   */
  readonly accent: string;
  readonly enabled: () => boolean;
}

/** The customer-facing cell. Documented by default: hiding an API's shape is not a
 *  security control, and it mostly costs the engineers who need it. */
export const CELL_DOCS: DocsSurface = {
  name: 'JazzTicketing API',
  version: OPENAPI_VERSION,
  document: OPENAPI_DOCUMENT,
  documentHref: './openapi.json',
  source: 'contracts/openapi.yaml',
  note: 'Authorize with a fixture token; it requires <code>FIXTURE_AUTH=1</code> on the cell.',
  accent: '#27565D',
  enabled: () => process.env.API_DOCS !== '0',
};

/**
 * The Jazzware-internal surface. OFF BY DEFAULT, and that difference from the cell
 * is deliberate rather than inconsistent: FR-1 makes non-advertisement a property
 * of this surface ("a surface the product does not link to"), so a default that
 * publishes an internal API's shape because nobody set a variable is the wrong way
 * round. `API_DOCS=0` still turns both off, so one switch kills everything.
 */
export const CONTROL_PLANE_DOCS: DocsSurface = {
  name: 'JazzTicketing Control Plane (Jazzware-internal)',
  version: CONTROL_PLANE_OPENAPI_VERSION,
  document: CONTROL_PLANE_OPENAPI_DOCUMENT,
  documentHref: './openapi.json',
  source: 'contracts/control-plane-openapi.yaml',
  note: 'Jazzware-internal. An operator token from here is refused by every cell endpoint, and a cell token is refused here.',
  accent: '#A8490B',
  enabled: () => process.env.API_DOCS !== '0' && process.env.CONTROL_PLANE_DOCS === '1',
};

/** Back-compatible: the cell's switch, which is what the cell's routes ask about. */
export const docsEnabled = (): boolean => CELL_DOCS.enabled();

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

export function serveOpenApiDocument(res: ServerResponse, method = 'GET', surface: DocsSurface = CELL_DOCS): void {
  const body = JSON.stringify(surface.document, null, 2);
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(body)),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(method === 'HEAD' ? undefined : body);
}

export function serveDocsPage(res: ServerResponse, method = 'GET', surface: DocsSurface = CELL_DOCS): void {
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
    <title>${surface.name} ${surface.version}</title>
    <link rel="stylesheet" href="./docs/assets/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
      /* Design tokens from ux-designs/.../DESIGN.md - the accent is petrol with
         white ink; cyan is a highlight and never a button ground. */
      .topbar { display: none; }
      .swagger-ui .info hgroup.main a { display: none; }
      .swagger-ui .btn.authorize { background: ${surface.accent}; color: #FFFFFF; border-color: ${surface.accent}; }
      .swagger-ui .btn.authorize svg { fill: #FFFFFF; }
      .jt-banner {
        background: ${surface.accent}; color: #FFFFFF; padding: 12px 16px;
        font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      }
      .jt-banner code { background: rgba(255,255,255,.15); padding: 1px 5px; border-radius: 3px; }
    </style>
  </head>
  <body>
    <div class="jt-banner">
      <strong>${surface.name} ${surface.version}</strong> &mdash; generated from
      <code>${surface.source}</code>, the schema of record. Operations marked
      <code>x-implemented: false</code> answer 501 with the story that owns them.
      ${surface.note}
    </div>
    <div id="swagger-ui"></div>
    <script src="./docs/assets/swagger-ui-bundle.js"></script>
    <script src="./docs/assets/swagger-ui-standalone-preset.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${surface.documentHref}',
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
