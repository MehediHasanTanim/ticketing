# Story 1.5: Connect a Tenant identity provider

Status: review

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **tenant administrator**,
I want to connect our existing identity provider,
So that corporate and management users authenticate through it rather than holding another password.

## Acceptance Criteria

**Given** I am a tenant administrator
**When** I configure a SAML 2.0 or OIDC connection for my Tenant
**Then** the connection applies to that Tenant only, never globally (FR-3)
**And** just-in-time provisioning is **off by default**, so a successful authentication grants no access until a role is assigned (FR-83).

**Given** a connected identity provider
**When** an identity is deprovisioned upstream
**Then** access is lost at next token validation, without a manual step in JazzTicketing.

**Given** a Staff Member holding only a PIN credential
**When** they sign in on a Shared Device
**Then** sign-in succeeds and configuration and reporting surfaces remain unavailable to that credential (FR-4).

## Tasks / Subtasks

- [ ] **T1. Per-Tenant SAML 2.0 / OIDC connection** (AC: 1)
  - [ ] Connection stored per Tenant, never global. Secrets in the platform secret store.
  - [ ] **Just-in-time provisioning off by default**: a successful authentication creates no access until a role is assigned (FR-83). Authentication never implies authorisation.
- [ ] **T2. Deprovisioning takes effect at next token validation** (AC: 2)
  - [ ] No manual step in JazzTicketing; validate upstream state on token refresh.
- [ ] **T3. PIN credentials are unaffected** (AC: 3)
  - [ ] A PIN-only Staff Member still signs in on a Shared Device with a provider connected, and configuration/reporting stay unavailable to that credential.

## Dev Notes

**Prerequisites:** 1.1, 1.3. This story retires the last production use of Story 1.0's fixture auth stub for corporate users — **remove the stub's production path here**, leaving PIN sign-in (4.1) as the only other credential type.

**The wire contract already exists.** `GET /auth/sso/start`, `POST /auth/sso/callback` and
`POST /auth/token/refresh` are designed in `contracts/openapi.yaml`, marked
`x-story: "1.5"` / `x-implemented: false`, and today answer 501 `not_implemented` (see
`docs/decisions/0002`, which also carries the whole auth ownership table). This story
implements them and flips those three flags; flipping one without a handler behind it
turns the smoke suite red. Note where the refresh sits in AC-2: it is the place upstream
state is re-checked, which is why access tokens are short-lived and why rotation is
single-use.

**Two open questions this story must settle, not inherit.** The PRD specifies neither
**token lifetimes** — and the access-token lifetime IS the deprovisioning delay FR-3
promises, so it is a product decision, not a tuning constant — nor a **PIN lockout policy**
behind the documented 429. Raise both rather than picking a number in code.

**Scope guards.** Connecting the provider and mapping an authenticated identity to an existing Staff Member. Not role definition (1.4), not Tenant defaults generally (1.6), not shared-device sign-in (4.1).

**Implementation notes.**
- JIT-off-by-default is a security decision, not a preference. If JIT is implemented at all, the default must be off and enabling it must be an audited Tenant-level change (FR-83, FR-6).
- Two credential types now exist with different capabilities. Keep the capability difference **on the credential**, matching 1.3, so a third type later does not require revisiting every permission check.
- Never place a token, client secret or assertion in a URL or query string, and never log one.

**Testing.** Provider connected for Tenant A does not authenticate a Tenant B user. Deprovisioned identity loses access at next validation (fake clock). JIT off: authenticate successfully, assert zero access. PIN sign-in unaffected.

### Project Structure Notes

New: `adapters/identity/` — the only place a provider SDK or protocol type exists. `core` sees an authenticated-subject value object, never a SAML assertion.

### References

- [Source: planning-artifacts/epics.md#Story 1.5]
- [Source: prd.md#FR-3], [#FR-83], [#FR-4]
- [Source: ARCHITECTURE-SPINE.md#Consistency Conventions] (secrets, logging), [#AD-11]

## Standing constraints (identical in every story — the dev agent has only this file)

**Vocabulary is binding and verbatim in code.** `Job` (umbrella), `Request` (guest-originated), `WorkOrder` (maintenance), `RoomAssignment`, `Credits`, `Stay`, `Glitch`, `Recovery`, `Asset`, `Discrepancy`, `Tenant`, `Property`, `Shared Device`, `Catalog Entry`, `SLA Target`, `Pause Condition`, `Escalation chain`. **Never `ticket` or `task` in any identifier**, including tests and table names. A `RoomAssignment` is deliberately *not* a `Job` — it has no SLA Clock. A `Stay` is a projection of Jazz Core truth, never authored here.

**Architecture invariants (read-only, original ids).** AD-1 event-sourced Job core, SLA derived never stored · AD-2 `occurred_at` (domain clock) vs `recorded_at` (system clock) · AD-3 every row and event carries `tenant_id` and `property_id` · AD-4 regional cells, a Property never leaves its region, control plane holds no guest data · AD-5 one Jazz Core port with one owner · AD-6 cleanliness ours, occupancy Jazz Core's · AD-7 offline is a first-class write path, server-enforced idempotency on `(tenant_id, property_id, staff_member_id, client_key)` for 30 days · AD-8 notification intents in the domain, delivery in adapters, suppression evaluated once · AD-9 configuration versioned and effective-dated, a Job keeps its bound version for life · AD-10 guest data minimised **at ingestion** · AD-11 permission is a server decision; the interface only hides what the server would refuse · AD-12 one localisation and direction contract · AD-13 one writing owner per aggregate · AD-14 one SLA fold (TypeScript) plus exactly one Dart port, both fixture-gated.

**Layering.** `core/` pure domain, no I/O and no clock of its own · `core/ports/` interfaces · `adapters/` one per external reality · `app/` handlers, projections, sagas · `edge/` HTTP, sync, auth, tenancy · `clients/mobile` (Flutter/Dart) and `clients/console` (React/TS). Dependencies point **inward only**; a client never reaches an adapter or the datastore directly. Story 1.0's lint enforces this — keep it green.

**Conventions.** Events past tense, domain-first, one per real-world fact · ULIDs for what we create; Room numbers and Jazz Core ids are external strings, never re-keyed · UTC RFC 3339, Property timezone is presentation only · money as minor-unit integers plus ISO-4217, **no conversion in v1** · one error envelope (`code`, localisable `message` key, `retryable`) · commands are POSTs returning the accepted event, reads are projections, sync is one endpoint taking a batch of intents · configuration is versioned records, **never environment-variable feature behaviour** · secrets from the platform secret store, never on a device · structured logs carry tenant, property, actor, correlation id and the Jazz Core exchange id — **guest identifiers are never logged**.

**Release gates that apply to this story but are not its acceptance criteria.** Cross-tenant isolation (AD-3/DG-1) · the two-language SLA fixture suite (AD-14) · contract-codegen drift, since `contracts/` is the schema of record and no wire type is hand-written on either side · the per-intent offline conflict-rule suite (AD-7). All four were stood up in **Story 1.0**; extend them, never bypass them.

**If this story touches a client surface**, these are acceptance criteria, not polish: state distinctions survive **greyscale** and are legible at arm's length in low light (NFR-6) · **logical direction only** — no left/right in layout; Arabic ships in R1 (AD-12) · identifiers and clock times render in **Western digits inside a bidi isolate, with any adjacent separator inside the isolate** · core actions are tap-only (gloves) and reachable one-handed in the thumb zone on the baseline device (Android 10 / iOS 15 / 3 GB) · one primary action per screen, destructive actions never in the thumb zone · colour, spacing and type come from `DESIGN.md` tokens — accent petrol `#27565D` on white ink, cyan `#08FCFF` is a highlight and never a button ground · a surface showing Jazz Core-sourced context names the last successful exchange when stale · **render it and check it in greyscale before calling it done** — that habit caught a missing glyph, a wrapping label, dead space on eight surfaces, a selection style masking priority state, and an Arabic bidi bug that turned 19 minutes into 190.

**Testing baseline.** Domain unit-tested with a **fake clock and fake ports** — a domain test that needs a database means the dependency arrow is wrong. Use fake clocks for anything time-dependent; never real sleeps. Add every new aggregate and public interface to the cross-tenant isolation suite.

**Unverified stack.** Every version in the architecture spine's Stack table is `[ASSUMPTION]` — produced from training knowledge with web access blocked. Story 1.0 owns confirming them. Do not treat a version as settled, and report any divergence rather than adopting it silently.

**This story file is derived from `status: final` documents.** Its acceptance criteria are transcribed verbatim from `planning-artifacts/epics.md`. A story that needs a different criterion is a **change to raise there**, not to reinterpret in code. Tasks may be added under an existing AC; ACs may not.

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Cowork, remote session linked to tanim-m4-pro-local). Contracts first,
then migration 010, then the port and adapter, then `app/`, `edge/`, tests, gates.

### Debug Log References

`.dev-refresh.log` on the Mac. Additionally verified by execution in this session's
cloud container against a real Postgres 16 and a real in-process OIDC provider.

### Completion Notes List

**The two open questions were raised, not picked, and Tanim settled them on 2026-09-05.**
The access token lives **15 minutes** - that number is the answer to "how long does a
dismissed employee keep working", so it is a product commitment under FR-3 rather than a
constant to tune. The PIN policy is **five attempts per fifteen minutes per device with
no account lockout**: a lockout is stronger against a targeted guess, but on a shared
handset it means a room attendant whose PIN a colleague mistyped cannot work until it
lifts, and R1 has no self-service unlock. Both are recorded in ADR 0002 and in the code
that enforces them, and `LIMITS.devicePin` exists so **Story 4.1 inherits a decision
rather than making one**.

**A third question I would not decide alone: SAML.** XML signature verification is the
most historically broken thing in identity - signature wrapping has defeated
implementations written by people who do this for a living - and hand-rolling it in the
authentication path would be worse than not shipping it. Settled: **OIDC now, SAML
deferred**. A SAML connection is accepted and stored, and a SAML sign-in is refused with
a reason the administrator sees **when they connect it**, not when their people cannot
get in. AC-1 says "configure a SAML 2.0 or OIDC connection" and configuring works; the
sign-in half is raised as ADR 0002 question 10.

**OIDC is built end to end and verified against a real provider.**
`tests/fake-identity-provider.ts` is an in-process OIDC provider with a genuine RSA
keypair serving a genuine discovery document and JWKS, so the adapter verifies real
signatures rather than agreeing with a mock - a mocked verifier only proves that our code
calls our code. Discovery, PKCE (S256), code exchange, and ID-token verification of
signature, `iss`, `aud`, `exp`, `iat` and `nonce`. `alg: none` and HS* are refused
outright rather than handled: accepting an algorithm the TOKEN chooses is how JWT
verification is defeated.

**AC-2's mechanism is an upstream refresh grant.** Our refresh asks the provider to
honour its own refresh token; a deprovisioned account gets `invalid_grant`, and there is
nothing to poll, sweep or reconcile. That requires holding a provider credential we must
PRESENT rather than compare, so it is the one value in this schema stored **encrypted**
(AES-256-GCM) rather than hashed - stated in `secret-box.ts` so nobody later "tidies" it
into a hash and quietly breaks deprovisioning. **An unreachable provider is not a
deprovisioning**: an outage must not sign out a hotel's entire management team mid-shift,
so unreachable answers 503 and keeps the session while refused answers 401 and ends it.

**FR-83 is enforced in three places and defaulted in two.** Off in the aggregate, off in
the column default, and a successful authentication that maps to no Staff Member gets
**403 and no session** - not a session with an empty permission set, which every client
would then have to remember to handle and which would read as a bug rather than a policy.
The attempt is written to the audit trail, because an administrator wondering why a new
starter cannot get in needs to see that they authenticated successfully.

**A client secret cannot enter this system.** The API refuses the field rather than
ignoring it, the column holds a secret-store REFERENCE, and the value is resolved at the
moment of use through one function. That is the strongest reading of "secrets from the
platform secret store": a value that never arrives cannot leak. When a real store is
adopted, `adapters/src/identity/secret-store.ts` changes and nothing else does.

**The fixture stub's production path is removed**, which the story's prerequisite note
asked for. Two independent refusals - `NODE_ENV=production` switches the resolver off
whatever `FIXTURE_AUTH` says, and `main.ts` refuses to start on that combination - because
the one that matters is the one nobody remembers to set.

**THE DEFECT THE SUITE FOUND, and it was the same one three times.** Every refusal on the
SSO and refresh paths has side effects that must survive it: the single-use state is
consumed so it cannot be retried, a replayed refresh chain is burned, a deprovisioned
session is revoked, and the attempt is recorded. **Throwing to signal the refusal also
aborted the transaction that carried all of that** - so a refused sign-in left no trace, a
single-use state stayed reusable, and a session revoked for being deprovisioned was still
live on the very next request. Three tests failed for one cause. Refusals are now returned
as verdicts and the edge maps them, so the transaction commits. Negative control 47 puts a
throw back and proves the suite goes red.

**A note on the loopback exception.** The connection model requires https, with one
exception: `http` on the literal loopback address. That is a real rule rather than a test
concession - on 127.0.0.1 the packets never leave the host, which is the same reasoning
RFC 8252 uses for native apps - and `localhost` is deliberately NOT included, because it
is a name and names resolve.

**Story 1.4's immutability trigger had its first real exercise.** `identity.manage` had to
join the shipped property administrator, and 1.4's trigger refuses that for every
connection with no owner exemption. Migration 010 drops the trigger, makes the change
where somebody reviews it, and puts the trigger back - which is exactly what 1.4's comment
said changing the baseline would mean. The drift test that compares the constant to the
migrations was generalised to read every migration in order and take the last statement
per role, so 010 amending 009 is the normal case rather than a failure.

**VERIFIED BY EXECUTION.** Both migration paths against a real Postgres 16 - 010 applied
on top of an already-migrated 001-009 database, and all ten from scratch. **203/203 tests
each way, and 46 of 48 negative controls red-verified** (0 failures, 1 unverifiable - the
Dart half, no SDK; 1 skipped - console dependencies). All seven new controls go red on
demand. Not a substitute for `npm run refresh` on the Mac.

### File List

**New**

- `ops/migrations/010_identity_provider.sql`
- `core/src/ports/identity.ts` - the authenticated-subject value object; no protocol type
- `core/src/identity/connection.ts` - validation, the slug, the return-path allowlist
- `adapters/src/identity/oidc.ts` - the only place a JWT exists
- `adapters/src/identity/secret-store.ts` - one function, one seam
- `adapters/src/crypto/secret-box.ts` - AES-256-GCM for the one value we must present
- `app/src/identity/connect.ts`, `app/src/identity/sso.ts`
- `tests/fake-identity-provider.ts`, `tests/identity.test.ts`, `tests/unit/identity.test.ts`

**Changed**

- `contracts/openapi.yaml` - `GET/PUT/DELETE /identity-provider`; `IdentityConnection` and
  `ConnectIdentityProviderRequest`; the three SSO operations flipped to built
- `core/src/staff/roles.ts` - `identity.manage`
- `core/src/tenant/provision.ts`, `app/src/tenant/provision-tenant.ts` - the Tenant slug
- `app/src/staff/sessions.ts` - `issueRefreshToken`, `openSession` exported
- `edge/src/server.ts` - the SSO and connection routes; refusal verdicts mapped
- `edge/src/auth.ts`, `edge/src/main.ts` - the stub's production path removed
- `edge/src/rate-limit.ts` - the settled PIN policy, for Story 4.1
- `docs/decisions/0002-...md` - questions 1 and 2 closed; SAML raised as question 10
- `tests/unit/role.test.ts` - the drift test reads every migration in order
- `tests/unit/tenant.test.ts`, `tests/smoke.test.ts`, `tests/harness.ts`
- `scripts/negative-controls.sh` - controls 42-48
- `.env.example`, `docker-compose.yml`
