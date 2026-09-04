import type { IncomingMessage } from 'node:http';
import { OPENAPI_DOCUMENT } from '../../contracts/generated/ts/openapi';

/**
 * HONEST 501s, DERIVED FROM THE SCHEMA OF RECORD.
 *
 * The auth surface is designed in `contracts/openapi.yaml` ahead of the four stories
 * that build it (1.3, 1.5, 4.1, 4.8 - see docs/decisions/0002). That leaves the docs
 * page advertising nine operations that do not exist yet, and without this the reader
 * who presses "Try it out" on `POST /auth/device/sign-in` gets **401
 * unauthenticated** - which reads as "your credential was rejected" when the truth is
 * "nobody has built this yet". Same defect class as a disabled docs route answering
 * 401 instead of 404, so it gets the same answer.
 *
 * The set is DERIVED from the document, never maintained by hand: every operation
 * marked `x-implemented: false` answers 501 with its owning story in `details`. So
 *
 *   - a newly designed-ahead operation is covered the moment it enters the spec;
 *   - flipping `x-implemented` to `true` STOPS the stub answering, which means the
 *     story that flips it must have built the handler or the smoke suite goes red.
 *
 * Nothing to remember and nothing to delete: when the last flag flips, this module
 * matches nothing.
 */

interface Stub { method: string; matches: RegExp; story: string }

const PREFIX = '/v1';

/** `/auth/sessions/{sessionId}` -> a regex that will not also match `/auth/sessions`. */
const toMatcher = (template: string): RegExp => {
  const pattern = template
    .split('/')
    .map((seg) => (seg.startsWith('{') && seg.endsWith('}')
      ? '[^/]+'
      : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${PREFIX}${pattern}$`);
};

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'] as const;

export const unimplementedOperations = (): Stub[] => {
  const out: Stub[] = [];
  const paths = (OPENAPI_DOCUMENT as { paths?: Record<string, Record<string, unknown>> }).paths ?? {};
  for (const [template, item] of Object.entries(paths)) {
    const matches = toMatcher(template);
    for (const method of METHODS) {
      const op = item[method] as { 'x-implemented'?: boolean; 'x-story'?: string } | undefined;
      if (!op || op['x-implemented'] !== false) continue;
      // A designed-ahead operation with no owning story is a spec defect. Record it
      // as unassigned rather than inventing an owner - the smoke suite fails on it.
      out.push({ method: method.toUpperCase(), matches, story: op['x-story'] ?? 'unassigned' });
    }
  }
  return out;
};

const STUBS = unimplementedOperations();

/**
 * The owning story if this request names a documented-but-unbuilt operation.
 *
 * Consulted BEFORE tenancy resolution, deliberately: four of the nine operations are
 * how a caller obtains a credential in the first place, so demanding one in order to
 * be told the operation does not exist would be circular. It leaks nothing either
 * way - the API's shape is already public at /v1/docs, and `x-implemented: false`
 * says out loud that there is no data behind the path.
 */
export const unimplementedStory = (req: IncomingMessage, pathname: string): string | undefined => {
  // GET and HEAD stay equivalent, as on the public routes: a probe that gets a
  // different answer than a browser is a bug nobody notices until it matters.
  const method = req.method === 'HEAD' ? 'GET' : (req.method ?? 'GET');
  return STUBS.find((s) => s.method === method && s.matches.test(pathname))?.story;
};
