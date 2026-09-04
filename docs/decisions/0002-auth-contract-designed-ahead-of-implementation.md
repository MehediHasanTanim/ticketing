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
| `POST /auth/sign-in` | **1.3** | The password fallback: email plus password (1.3 AC-1's credential, FR-1) |
| `POST /auth/credential/set-up` | **1.3** | Redeems the invitation 1.1 and 1.3 issue (1.3 AC-1) |
| `POST /auth/password/forgot` | **1.3** | Recovery. **No FR covers it** - see the open questions |
| `POST /auth/password/reset` | **1.3** | Recovery. **No FR covers it** - see the open questions |
| `GET /auth/sso/start` | **1.5** | Per-Tenant SAML 2.0 / OIDC connection (FR-3) |
| `POST /auth/sso/callback` | **1.5** | Assertion or code to session, JIT off by default (FR-83) |
| `POST /auth/token/refresh` | **1.5** | Where upstream deprovisioning bites (1.5 AC-2) |
| `POST /auth/device/sign-in` | **4.1** | PIN or badge on a Shared Device, under five seconds (FR-4) |
| `POST /auth/sign-out` | **4.1** | Ends the session, queued work survives (4.1 AC-2, AC-4) |
| `GET /auth/sessions` | **4.8** | Device and session hygiene (FR-64) |
| `DELETE /auth/sessions/{sessionId}` | **4.8** | Remote sign-out, honoured at next contact (4.8 AC-3) |
| `GET /auth/mfa`, `POST /auth/mfa/enrolment`, `.../verify` | **12.1** | Enrol a second factor, verify before it activates (FR-84) |
| `POST /auth/mfa/challenge/verify`, `.../resend` | **12.2** | The sign-in challenge (FR-84) |
| `DELETE /auth/mfa/{factorId}`, `POST /auth/staff/{id}/mfa/reset` | **12.3** | Replace a factor; administrator-issued reset (FR-84) |

Those twenty operations share one `Session` shape, one token shape and one set of rules
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
2. **It is consulted before tenancy resolution.** Eight of the twenty operations are how a
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
   listing a path there that no longer opts out. The thirteen permitted names are health and
   docs (no tenant data) and the eight auth entry points - where a credential is obtained,
   or where control of a mailbox is proved in order to set one.

Negative controls 14–17 in `scripts/negative-controls.sh` break each of these
deliberately and assert it goes red. A gate that has never failed is not known to work.

## The password fallback, added 2026-09-04

The first version of this contract covered SSO and PIN/badge and **missed the
administrator password fallback**. Two approved documents require it:

- the console UX spine describes its Sign in surface as "SSO first, **password
  fallback**, property picker";
- FR-1 makes it structural rather than a preference. A Jazzware operator creates a
  Tenant and its first administrator and creates "no Properties and **no identity
  connection** - those are the customer's to configure", so the first tenant
  administrator has to sign in *before* an identity provider exists. SSO can never be
  the only way in.

So there are **three** credential types, not two, and Story 1.3 owns this one because it
already provisions the credential ("an invitation with an email address issues a
credential set-up link"). Unlike a PIN, this credential carries the holder's full role -
the capability limit belongs to the PIN specifically, not to "not-SSO".

**The token in an emailed link never travels in a query string.** The standing
constraint is "never place a token, client secret or assertion in a URL or query string,
and never log one", and a set-up or reset link is exactly that shape. Resolved with a
URL **fragment** (`.../set-up#token=...`): a fragment is never sent to the server, so it
appears in no access log, no proxy log and no `Referer` header. The console reads it in
the browser and POSTs it in the body.

**Two asymmetries worth keeping.** Credential set-up returns a session, because the
holder has just proved control of the invited mailbox and there is no earlier session to
protect. A password reset returns **204 and no session**, and revokes every other session
for that Staff Member, because a reset may be the response to a credential already in
someone else's hands. And `/auth/password/forgot` **always returns 202** whether or not
the address exists - it is the one endpoint anyone on the internet can call, and a
response that varies is an account-enumeration oracle.

**Sequencing, flagged for whoever schedules the work:** Story 1.1 issues the first
administrator's invitation and Story 1.3 redeems it, so between them a provisioned Tenant
has an administrator who cannot yet sign in. The two stories must agree the token's shape
before either starts - the same arrangement 4.1 and 4.3 have over the offline queue.

## The Jazzware operator: absent from the cell, and now owned

There is **no** operator sign-in in `contracts/openapi.yaml`, and there never will be:

- FR-1 puts Tenant creation on "a Jazzware-internal function on a surface the product
  does not link to", reachable by no hotel-side role. The UX spine makes it a separate
  product (W35) with a different brand and an amber accent, "because an internal tool
  that looks like the customer product is how someone acts in the wrong context".
- AD-4 puts the control plane outside the regional cells, and `openapi.yaml` describes a
  cell. Operator auth there would recreate exactly the vendor/customer conflation FR-1's
  amendment exists to remove.
- FR-1 and Story 1.1 AC-3: provisioning grants Jazzware **no standing access** to tenant
  data; support access is separately requested, time-boxed and recorded in the Tenant's own
  audit trail. An operator who could sign in to a cell would defeat that.

**Resolved 2026-09-04.** What was missing was not the decision but an owner: Story 1.1 AC-1
opened "**Given** I am authenticated as a Jazzware operator on the internal provisioning
surface" — a precondition no requirement stated and no story built, which left the
documented provisioning path unbuildable. So:

- **FR-86** was added to the PRD (operator authentication, control plane, no standing
  access, deactivation at next validation, its own audit trail).
- **Epic 11** was added to `epics.md` — three stories, **R1**, because Story 1.1 waits on
  11.1. It is the first epic whose user is a Jazzware operator rather than a hotel
  employee: a different audience, not an absent one.
- **`contracts/control-plane-openapi.yaml`** was created: its own document, its own
  `servers` prefix, and its own `operatorBearerAuth` scheme with a **different issuer and
  audience**, so an operator token is *structurally* unusable against a cell rather than
  merely unauthorised by a check somebody could later widen. `POST /tenants` and
  `POST /tenants/{id}/support-access` live there under `x-story: "1.1"` — the behaviour is
  Story 1.1's, only the surface is internal.
- The separation is **gated**, not trusted: the drift gate fails if the two documents share
  a path, if an operator path appears in the cell document, if a cell path appears in the
  control-plane document, or if both use the same security scheme. The smoke suite
  additionally asserts the running cell serves none of the internal paths — **404, not
  501**, because a 501 would say "coming here soon", which is the opposite of what AD-4
  decided. Negative controls 18 and 19 prove both can go red.

## The second factor (FR-84, FR-85, Epic 12, R2)

Added 2026-09-04 at Tanim's direction, closing open questions 4 and 5 below.

**Off by default, each Staff Member's own to enable, and requirable Tenant-wide.** Tanim
chose Tenant-wide enforcement over per-user opt-in alone, because brand security
questionnaires ask for it and retrofitting enforcement after clients exist costs more than
the setting.

**Two mechanisms, three labels.** A one-time code by email, and TOTP (RFC 6238).
*Google Authenticator and Microsoft Authenticator are the same TOTP secret* — offering them
as separate integrations would create two code paths that must agree forever for no
user-visible gain, so they are two labels on one method, with an `appHint` recorded for
support conversations that never affects verification. Worth saying out loud because the
request named three options and the honest implementation has two.

**Scope, from FR-84 and not negotiable per-story:** the password credential only. A
provider-governed identity authenticates under that provider's policy (FR-3) and gets no
second challenge from us; a **PIN or badge on a Shared Device is out of scope**, because a
second factor cannot be reconciled with a five-second sign-in on a shared handset in a
corridor with gloves on (FR-4, NFR-5). FR-4's credential-scope rule is the control that
applies there.

**Three shapes worth not re-litigating:**

- `POST /auth/sign-in` returns **`SignInResult`**, a discriminated `status` of
  `authenticated` or `mfa_required`, from the day Story 1.3 builds it. Until Story 12.2
  lands it is always `authenticated`. A `oneOf` at the top level would have forced every
  caller in two languages to re-derive which branch it got, and a second response type
  later would have been a breaking change to a shipped client.
- **The challenge token is not a half-session.** Own audience, short lifetime, no scope,
  submitted in a body and never as a bearer token — a "half-authenticated" token that
  ordinary handlers accept is an authentication bypass with extra steps, and Story 12.2
  carries a test that presenting it elsewhere is refused.
- **A reset means re-enrol, not bypass.** An administrator clears the factors; they never
  obtain a working second factor for someone else's account, because that would make every
  administrator a way around MFA.

**Deliberately not in this contract:** FR-85's enforcement toggle. It is a Tenant setting
on the surface Stories 1.5 and 1.6 own, and that surface has no contract yet — putting a
settings API in an auth document to avoid an empty space would be the wrong kind of tidy.

**Operator MFA follows the same rules**, at Tanim's decision: off by default, the
operator's own to enable, and available to be required across the operator organisation by
the same enforcement mechanism. I had recommended making it mandatory in code, since an
operator account can create customers; the chosen answer is defensible because Jazzware can
switch on the same Tenant-style enforcement for itself as policy — the risk is that policy
is a thing someone has to remember and code is not, so it is worth putting on whoever owns
Jazzware's security posture rather than leaving it implied here.

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
4. ~~**Credential recovery policy.**~~ **CLOSED 2026-09-04: self-service reset is
   permitted.** `/auth/password/forgot` and `/auth/password/reset` are Story 1.3's to build
   as specified. Note what this means in combination with question 5's answer: for a Staff
   Member with **no second factor enrolled**, self-service reset makes the mailbox the only
   thing standing between an attacker and the account. That is a normal industry position
   and it is now a deliberate one, but it is the reason FR-84 exists and the reason a
   security review will ask when Epic 12 ships.
5. ~~**Whether the password fallback requires a second factor.**~~ **CLOSED 2026-09-04: MFA
   exists, off by default (FR-84), and a tenant administrator can require it Tenant-wide
   (FR-85).** Epic 12, R2. Not required by the product for anyone; required by a Tenant for
   its own people at that Tenant's choice.
6. ~~**The region at sign-in.**~~ **CLOSED 2026-09-04 by Story 1.3.** `Session.region` and
   `PropertyRef.region` now carry it, so the console renders residency from the session it
   already has rather than fetching each Property - which is how it would have ended up
   rendered inconsistently.

## Settled by Story 1.3, and worth keeping written down

- **The 1.1 / 1.3 token agreement.** Provisioning records an invitation with an email
  address and nothing else - a Jazzware operator has no business typing a customer
  administrator's name or choosing their language - so `CredentialSetUpRequest` requires
  `name` and `languageTag`, and redemption is where the person describes themselves.
  Required for *every* redemption rather than only the first-administrator case, which
  keeps one code path and leaks nothing: a set-up screen that asks a new arrival their
  name is ordinary, and their own spelling should win over whatever an administrator
  typed. Redemption creates the Staff Member when the invitation has none, with a
  **Tenant-wide `property_administrator`** grant - there is no Property to scope it to,
  and someone has to be able to create the first one.
- **A session may be Tenant-scoped.** `Session.propertyId` and `Session.region` are
  optional, which is the same single AD-3 exception `POST /properties` already was: FR-1
  creates an administrator before any Property exists. A Property-scoped route answers
  **403 naming the property picker**, not 401 - telling an authenticated person their
  credential was rejected sends them looking for a token that was never the problem. The
  cross-tenant isolation gate was updated to accept either refusal and to assert the thing
  that actually matters, which is that no Property data comes back.
- **Capability lives on the credential type, not the role** (FR-4). Each permission
  declares a class and each credential type declares which classes it may carry, so a PIN
  never authorises configuration or reporting whatever role its holder has - and a
  permission added later is classified where it is declared rather than needing every
  check revisited. See ADR 0003.
- **`fixture` is a value of `Session.credentialType`.** Story 1.0's stub is named in the
  wire contract rather than hidden. It is already a total authentication bypass for anyone
  holding its secret, so withholding permissions from it would add no security while making
  the isolation gate pass for the wrong reason; naming it means a session reporting
  `fixture` in an environment that should not have one is visible from the outside. Story
  1.5 removes it.

## Raised by Story 1.3, still open

7. **An email address does not identify a person across Tenants.** An address is unique
   *within* a Tenant and deliberately not across them: global uniqueness would make an
   invitation's 409 reveal that the address already has an account somewhere else, which is
   precisely the cross-Tenant leak FR-1 exists to prevent. `POST /auth/sign-in` therefore
   resolves an address against every Tenant and requires exactly one password to match. A
   person holding accounts at two Tenants with the **same address and the same password**
   cannot be resolved and is refused with the same generic failure as everyone else - and
   cannot diagnose it, which is why the collision is logged. The fix is a Tenant hint, and
   the slug that would carry it arrives with SSO in **Story 1.5**, so it is raised there
   rather than invented here. With one or two Tenants in R1 the risk is theoretical; it
   stops being theoretical at scale.
8. **Rate limiting is per process.** `edge/src/rate-limit.ts` is a fixed-window counter in
   memory, so two cell replicas double the effective limit. It is enough to make credential
   stuffing from one source expensive and is deliberately not dressed up as more. A durable
   limiter belongs with **question 2's** PIN lockout policy, which still has no owner and no
   FR stating a threshold, a window or a lockout duration; Redis is already a dependency of
   the cell, so the implementation is small once somebody decides the numbers.
9. **PIN sign-in needs a way to resolve a person.** Story 1.3 provisions the PIN credential
   and Story 4.1 owns the sign-in. Six digits with no staff reference is not resolvable and
   would not be safe if it were, so the assumption this story leaves for 4.1 is a **staff
   picker then a PIN** on the Shared Device - the person taps their name, then types the
   PIN. Confirm it there rather than inheriting it silently.
10. **Nothing delivers an invitation yet.** The AD-8 notification adapter does not exist, so
    a set-up link and a reset link are written to `control_plane.outbox` and go no further.
    Story 1.3's suite reads them the way that adapter will. Until it is built, a real
    administrator cannot complete a sign-up without someone reading that table - which is a
    release blocker for R1, not a test inconvenience.

## Alternatives considered

- **Document only what is built.** Rejected: it defers the shared-shape decision to
  whichever of the four stories happens to run first, and that story would make it alone.
- **Design it in a side document and add it to `contracts/` per story.** Rejected: a wire
  shape that is not in the schema of record is not drift-gated, generates no bindings, and
  becomes a second description of the API — exactly what generating a spec from decorated
  controllers would have done, which the contracts-first direction exists to prevent.
- **Serve nothing for the unbuilt operations.** Rejected: the docs page would advertise
  twenty endpoints that answer 401, teaching every reader something false about the API.
