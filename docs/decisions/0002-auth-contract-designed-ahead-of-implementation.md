# ADR 0002: The auth contract is designed ahead of the stories that build it

- **Status:** accepted
- **Date:** 2026-09-04
- **Context:** Story 1.5 (Connect a Tenant identity provider), with Stories 1.3, 4.1 and 4.8
- **Supersedes / relates to:** ADR 0001 (HTTP framework deferred)

## Context

`contracts/` is the schema of record: the TypeScript bindings, the Dart bindings and
the served OpenAPI document are all generated from it, and the codegen-drift gate
fails the build if any of them diverge. Story 1.0 populated it with the four surfaces
Story 1.0 actually built — health, docs, the SLA fold and the isolation fixture — plus
a fixture auth stub that exists to exercise the tenancy resolution boundary.

Authentication, though, is not one story's surface. It is spread across four:

| Operation | Owner | Why that story |
| --- | --- | --- |
| `GET /auth/session` | **1.3** | The single server-side permission decision point the interface queries (AD-11, 1.3 T4) |
| `POST /auth/context` | **1.3** | Switch Property without signing out, permissions re-resolved (1.3 AC-3) |
| `GET /auth/sso/start` | **1.5** | Per-Tenant SAML 2.0 / OIDC connection (FR-3) |
| `POST /auth/sso/callback` | **1.5** | Assertion or code to session, JIT off by default (FR-83) |
| `POST /auth/token/refresh` | **1.5** | Where upstream deprovisioning bites (1.5 AC-2) |
| `POST /auth/device/sign-in` | **4.1** | PIN or badge on a Shared Device, under five seconds (FR-4) |
| `POST /auth/sign-out` | **4.1** | Ends the session, queued work survives (4.1 AC-2, AC-4) |
| `GET /auth/sessions` | **4.8** | Device and session hygiene (FR-64) |
| `DELETE /auth/sessions/{sessionId}` | **4.8** | Remote sign-out, honoured at next contact (4.8 AC-3) |

Those nine operations share one `Session` shape, one token shape and one set of rules
about what a credential may do. Discovering that in Story 4.8 would mean changing what
Story 1.3 had already shipped — and a wire type that changes after clients exist is the
expensive kind of change, because it lands in Dart and TypeScript at once.

## Decision

**Design the whole auth surface now; build it story by story.** Each operation carries
two markers in `contracts/openapi.yaml`:

- `x-story` — the story that owns it, matching epics.md's ownership table;
- `x-implemented: false` — it is described, not built.

## How the document is stopped from lying

A spec that advertises endpoints the server does not have is worse than no spec, so the
markers are load-bearing rather than decorative:

1. **`edge/src/not-implemented.ts` derives its behaviour from the document.** Every
   operation marked `x-implemented: false` answers **501 `not_implemented`** with its
   owning story in `details.story`. Nothing is listed by hand.
2. **It is consulted before tenancy resolution.** Four of the nine operations are how a
   caller *obtains* a credential, so demanding one in order to be told the operation does
   not exist would be circular. Without this, a reader pressing "Try it out" on
   `POST /auth/device/sign-in` got **401 unauthenticated** — which reads as "your
   credential was rejected" when the truth is "nobody has built this yet". Identical
   defect class to a disabled docs route answering 401 instead of 404, so it gets the
   identical answer.
3. **Flipping the flag is not a way to mark work done.** The smoke suite asserts that a
   documented operation *not* marked unbuilt is reachable, so setting
   `x-implemented: true` with no handler behind it turns the suite red. The stub set
   shrinks story by story and the module retires itself when the last flag flips.
4. **Every designed-ahead operation must name an owner.** An unowned stub is one nobody
   will ever remove; the suite fails on a missing `x-story`.
5. **Opting out of auth is a closed allowlist**, asserted in both directions. Adding
   `security: []` to an operation without adding it to the allowlist fails, and so does
   listing a path there that no longer opts out. The seven permitted names are health and
   docs (no tenant data) and the four auth entry points (where a credential is obtained).

Negative controls 14–17 in `scripts/negative-controls.sh` break each of these
deliberately and assert it goes red. A gate that has never failed is not known to work.

## Decisions recorded in the contract itself

The descriptions in `contracts/openapi.yaml` are the normative text; the load-bearing
ones are:

- **A context switch mints a new token.** Every token carries `tenant_id` and
  `property_id` (AD-3); a scope a header can change is not a scope.
- **The capability limit lives on the credential, not the role.** A session minted from a
  PIN or badge is refused configuration and reporting scopes even when the Staff Member
  also holds an administrator role (FR-4) — otherwise a PIN-holding administrator is a
  hole. Matches Story 1.3 T2.
- **Authentication is not authorisation.** With JIT provisioning off by default (FR-83),
  an identity that authenticates but matches no provisioned Staff Member gets `forbidden`
  and *no session* — not a session holding an empty permission set that every client
  would then have to remember to handle.
- **Access tokens are short-lived and the refresh re-checks upstream state.** That is the
  mechanism behind "access is lost at next token validation, without a manual step"
  (1.5 AC-2). Refresh rotation is single-use: a replay invalidates the session chain.
- **No refresh token on a Shared Device.** PIN and badge sessions end at the inactivity
  timeout (4.1 AC-2); a handset left in a corridor should not be holding a long-lived
  credential.
- **Nothing enumerates.** An unknown Tenant, an unconfigured Tenant and a rejected
  assertion are indistinguishable; so are a wrong PIN, an unknown staff reference and a
  disabled credential. A cross-Tenant `propertyId` answers `not_found`, never `forbidden`,
  so the response cannot be used to discover that a Property exists elsewhere.
- **Remote sign-out returns 202, not 204.** The server has accepted the revocation; it has
  not confirmed the device acted on it, because a handset offline for a shift stays signed
  in and the connectivity model cannot deliver better (4.8 AC-3). 204 would be the more
  comfortable lie.
- **No guest data anywhere in this surface** (DG-1), and no staff attribute beyond what a
  session needs (DG-5) — no payroll identifier, no date of birth, accepted from nobody.

## Consequences

- Two error codes were added to the envelope: `too_many_attempts` (429, retryable after
  the wait in `details.retryAfterSeconds`) and `not_implemented` (501, never retryable —
  retrying does not build the feature).
- `edge/src/errors.ts` now **imports** `ErrorCode` from the generated binding instead of
  re-declaring it, and `STATUS` / `RETRYABLE` are `Record<ErrorCode, …>`, so a code added
  to `contracts/` without a status or a retry decision is a compile error rather than an
  `undefined` written into a response.
- The drift gate gained a third check: **every declared error code has a message in every
  language.** It immediately found `conflict` and `internal` untranslated in both — declared
  since Story 1.0 and never noticed because nothing had raised them yet. Both would have
  rendered a blank label at the moment something had already gone wrong.
- Stories 1.3, 1.5, 4.1 and 4.8 inherit a wire contract rather than authoring one. Their
  Dev Notes say so. **A story that needs a different shape changes `contracts/` first** —
  the same rule as an acceptance criterion that needs changing in epics.md.

## Open questions, flagged rather than invented

These are **not** specified in the PRD, and guessing them in a contract would give a
guess the authority of a decision:

1. **Token lifetimes.** FR-3 requires access to be lost "at next token validation", which
   makes the access-token lifetime the *actual* deprovisioning delay — a product decision
   wearing a technical costume. Story 1.5 must settle it.
2. **PIN lockout policy.** The contract documents a 429 and rate limiting per device and
   per staff reference, but no FR states a threshold, a window or a lockout duration. On a
   shared handset this trades a real security control against a room attendant locked out
   mid-shift, which is not a call to make in a schema file.
3. **Session listing.** FR-64 requires remote sign-out and device hygiene, which *implies*
   an administrator can see live sessions, but no FR says so. `GET /auth/sessions` is
   modelled as a Property-scoped administrator read; if it is meant to be an audit surface
   instead, it belongs in Epic 10 and Story 4.8's scope changes.

## Alternatives considered

- **Document only what is built.** Rejected: it defers the shared-shape decision to
  whichever of the four stories happens to run first, and that story would make it alone.
- **Design it in a side document and add it to `contracts/` per story.** Rejected: a wire
  shape that is not in the schema of record is not drift-gated, generates no bindings, and
  becomes a second description of the API — exactly what generating a spec from decorated
  controllers would have done, which the contracts-first direction exists to prevent.
- **Serve nothing for the unbuilt operations.** Rejected: the docs page would advertise
  nine endpoints that answer 401, teaching every reader something false about the API.
