# Story 1.3: Invite a Staff Member and assign roles per Property

Status: review

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property or tenant administrator**,
I want to invite a person and give them roles at one or more Properties,
So that what they can see and act on is decided before they ever sign in.

## Acceptance Criteria

**Given** I am an administrator with scope over a Property
**When** I invite a person with a name, a language, an optional email and one or more Property/role pairs
**Then** the Staff Member is created with exactly those roles at exactly those Properties
**And** an invitation with an email address issues a credential set-up link, while one without creates a PIN-only account usable on a Shared Device.

**Given** the shipped role set
**When** I open the role picker
**Then** it offers at minimum line staff, supervisor, department manager, front office, duty manager, property administrator and corporate viewer (FR-2).

**Given** a Staff Member holding roles at two Properties in the same Tenant
**When** they switch Property context in either client
**Then** the switch completes without signing out, and their permissions are re-resolved for the new Property.

**Given** a Staff Member whose role does not permit an action
**When** the action is attempted through any interface, including a direct API call with a crafted payload
**Then** it is refused server-side, not merely hidden in the interface (FR-2, AD-11).

**Given** a corporate-scoped Staff Member
**When** they read any list, search, report, export or API response
**Then** only records from Properties within their own Tenant are returned (FR-1).

## Tasks / Subtasks

- [ ] **T1. Staff Member and role assignment** (AC: 1, 2)
  - [ ] `core/staff`: Staff Member with name, language, optional email. Events `StaffMemberInvited`, `RolesAssigned`.
  - [ ] Roles are assigned as **(Property, role) pairs** — a Staff Member may hold different roles at different Properties in the same Tenant.
  - [ ] Shipped role set available at minimum: line staff, supervisor, department manager, front office, duty manager, property administrator, corporate viewer.
- [ ] **T2. Two credential paths** (AC: 1)
  - [ ] With an email address: an invitation issuing a credential set-up link.
  - [ ] Without: a **PIN-only account** usable on a Shared Device. Provisioning the PIN credential is this story's job; the sign-in behaviour is Story 4.1 (FR-4 is owned by E4).
- [ ] **T3. Property context switching** (AC: 3)
  - [ ] Switch without signing out; permissions are **re-resolved server-side** for the new Property on every request, never cached client-side as a permission set.
- [ ] **T4. Permission is a server decision** (AC: 4, 5)
  - [ ] Every denial is refused server-side. Test with a crafted payload carrying another Property's id, not only through the interface.
  - [ ] Corporate-scoped users receive records only from Properties within their own Tenant — through lists, search, reports, exports **and** API responses.

## Dev Notes

**Prerequisites:** 1.1, 1.2. Consumed by 4.1 (which uses the PIN credential this story creates).

**The wire contract already exists.** SIX operations are designed in
`contracts/openapi.yaml` under `x-story: "1.3"` / `x-implemented: false`, today answering
501 `not_implemented` (see `docs/decisions/0002`): `GET /auth/session`,
`POST /auth/context`, and — added 2026-09-04 — the **password fallback** that this story's
credential set-up link implies: `POST /auth/sign-in`, `POST /auth/credential/set-up`,
`POST /auth/password/forgot`, `POST /auth/password/reset`. This story implements them and
flips their flags — and flipping a flag without a handler behind it turns the smoke suite
red, so the flag cannot be used to mark the work done.

**The password fallback is not optional.** The console's Sign in surface is "SSO first,
password fallback, property picker", and FR-1 has a Jazzware operator create the first
administrator with **no identity connection**, so that administrator must sign in before
SSO exists. Unlike a PIN, this credential carries the holder's full role — the capability
limit in T2 belongs to the PIN specifically, not to "not-SSO". The token in an emailed
link travels in a URL **fragment**, never a query string, so it reaches no access log and
no `Referer` header. **Story 1.1 issues the FIRST administrator's invitation and this
story redeems it**: agree the token's shape with 1.1 before starting either, because until
both are built a provisioned Tenant has an administrator who cannot sign in.
**Recovery policy settled 2026-09-04: self-service password reset IS permitted**, so
`/auth/password/forgot` and `/auth/password/reset` are this story's to build as specified —
`forgot` always answering 202, `reset` returning 204 and revoking every other session.
The second factor that makes self-service reset safe is **not this story's**: it is FR-84
and FR-85, owned by Epic 12 in R2, and a Staff Member with no factor enrolled is exactly
the case a reset takeover exploits. Say so when this ships rather than discovering it in a
security review — see ADR 0002. `/auth/session` IS the
single decision point T4 asks for; its `permissions` array is the server's answer that the
interface renders from. Two decisions recorded there are binding: a context switch **mints
a new token** rather than reinterpreting the old one (AD-3), and a `propertyId` in another
Tenant answers `not_found`, never `forbidden`, so the response cannot be used to discover
that a Property exists elsewhere. A shape that needs to change is a change to
`contracts/` first, exactly as a criterion that needs to change is a change to epics.md.

**Scope guards.** Individual invitation and role assignment only. Bulk import is 1.10. Custom role definition is 1.4. SSO is 1.5. Do not build a role **editor** here — assignment picks from existing roles.

**Implementation notes.**
- AD-11 is the whole story: the interface only hides what the server would refuse. Implement authorisation as a single server-side decision point that the interface queries, so there is exactly one place where a permission question is answered. Two answers is how a hidden button becomes a security bug.
- A PIN alone must never authorise configuration or reporting surfaces (FR-4) — encode that as a property of the **credential type**, not of the role, or a PIN-holding administrator becomes a hole.
- Staff language is a Staff Member attribute applied at sign-in (FR-61); store it here even though the handset consumes it in 4.6.
- Staff data is governed by DG-5. Do not add payroll identifiers or dates of birth to this model, and do not accept them from any caller.

**Testing.** Multi-Property switching with re-resolution. Crafted cross-Property payload refused. PIN-credential scope test. Extend the isolation gate with a Staff Member holding roles at two Properties.

### Project Structure Notes

New: `core/staff/`, `app/staff/`, and the authorisation decision point in `edge/` alongside tenancy resolution.

### References

- [Source: planning-artifacts/epics.md#Story 1.3]
- [Source: prd.md#FR-2], [#FR-4] (credential scope), [#FR-61] (language attribute), [#§11 DG-5]
- [Source: EXPERIENCE-WEB.md] Invite User surface
- [Source: ARCHITECTURE-SPINE.md#AD-11], [#AD-3]

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

claude-opus-5 (Cowork, remote session linked to tanim-m4-pro-local). Contracts-first, in
the order the standing constraints require: `contracts/openapi.yaml` before any handler,
bindings regenerated, then core -> adapters -> app -> edge, then the gates.

### Debug Log References

`.dev-refresh.log` (gitignored) is the loop: `npm run refresh` rebuilds both images,
applies migrations, verifies the cell, and - new in this story - runs the suite and the
gates and prints its own `TEST RESULT` line. That step is reported and never fatal, so a
suite failing for an environment reason cannot make "did the containers rebuild"
unanswerable.

### Completion Notes List

**All five acceptance criteria are built and asserted at the boundary, from provisioning
onward.** `tests/staff.test.ts` starts where a real Tenant starts - a Jazzware operator
provisions it (Story 1.1), which issues the first administrator's invitation and creates no
Properties and no Staff Members - and redeems that invitation as its first act. Seeding a
Staff Member row directly would have tested the handlers without testing the seam, and the
seam was the half actually at risk: **until both halves existed, a provisioned Tenant had
an administrator who could not sign in.**

**The 1.1 / 1.3 token agreement, which the story required before either started.**
Provisioning records an invitation with an email address and nothing else - a Jazzware
operator has no business typing a customer administrator's name or choosing their language
- so `CredentialSetUpRequest` now requires `name` and `languageTag`, and redemption is
where the person describes themselves. Required for *every* redemption rather than only the
first-administrator case: one code path, no leak, and the person's own spelling wins over
whatever an administrator typed. Redemption creates the Staff Member when the invitation has
none, with a **Tenant-wide `property_administrator`** grant.

**Six operations flipped from designed-ahead to built** (`/auth/session`, `/auth/context`,
`/auth/sign-in`, `/auth/credential/set-up`, `/auth/password/forgot`, `/auth/password/reset`),
so the unbuilt count went 20 -> 14. Three additions were needed and are in the contract
first: `POST /staff`, `GET /staff`, `GET /roles`.

**The single decision point (T4, AD-11, ADR 0003).** `resolvePermissions` in
`core/src/staff/roles.ts` is pure and has no I/O; `edge/src/authorise.ts` is its only
caller; `GET /v1/auth/session` serves its output to the interface; every gated route reaches
it through one `gate()` helper. What the console renders and what the server enforces are
the same array. Grants are read per request for the token's Property, so AC-3's
re-resolution is structural rather than something a handler remembers to do.

**FR-4 is on the credential, not the role.** Each permission declares a class
(`operational` / `configuration` / `reporting`) and each credential type declares which
classes it carries; `pin` and `badge` carry `operational` only. A permission with no class
is a compile error. Tested at the boundary as well as in units, by constructing the session
Story 4.1 will produce - a real session row with `credential_type = 'pin'` held by a full
administrator - and asserting the server refuses `POST /v1/staff` and `GET /v1/staff`.

**Two decisions taken that were not in the story, and why.**

1. **A session may be TENANT-scoped.** `Session.propertyId` and `Session.region` are now
   optional. FR-1 creates an administrator before any Property exists, so their first
   session has no Property to be scoped to - the same single AD-3 exception
   `POST /properties` already was, and `core/src/tenancy.ts` has carried the type
   distinction since Story 1.2. A Property-scoped route answers **403 naming the property
   picker**, not 401: telling an authenticated person their credential was rejected sends
   them looking for a token that was never the problem. This changed one isolation-gate
   expectation from `401` to `401 or 403`, and the gate was **strengthened** in the same
   edit to assert what actually matters - that no Property data comes back either way.
2. **`property.create` and `property.deactivate` require Tenant-wide authority.** A
   property administrator responsible for the Harbour should not be able to create - or
   retire - a Property elsewhere in the estate, and AC-4 asks for that refusal to be
   server-side rather than an absent menu item.

**Dead code a gate was watching, removed.** `resolvePrincipal` and
`resolveTenantPrincipal` in `edge/src/auth.ts` are gone: the server no longer calls them,
and **negative controls 23 and 28 pointed at them.** Leaving them exported would have left
two gates passing while testing functions nothing served - false assurance, which is worse
than no gate. Both controls now exercise the live path (`resolveCellPrincipal`, and the
server's own Property demand), and control 23 was strengthened to set all **three** signing
secrets alike rather than two.

**Six new negative controls, 29-34**: the permission gate answering yes to everything; a
PIN carrying configuration permissions; per-pair authorisation permitting everything; the
session secret falling back instead of failing closed; the outbox becoming readable to the
cell; and Jazzware being granted SELECT on customer staff. Controls 33 and 34 need the cell
up, like 26.

**What is NOT built, flagged rather than worked around.**

- **Nothing delivers an invitation.** The AD-8 notification adapter does not exist, so a
  set-up link and a reset link are written to `control_plane.outbox` and go no further. The
  suite reads that table the way the adapter will. **This is an R1 release blocker, not a
  test inconvenience**: today a real administrator cannot complete a sign-up without
  somebody reading a database table.
- **Self-service reset with no second factor.** The policy is settled and deliberate, and
  what it costs is now written at the endpoint as well as in ADR 0002: until FR-84/FR-85
  ship in Epic 12 (R2), every password account here is a mailbox away from takeover.
- **An email address does not identify a person across Tenants.** Unique within a Tenant,
  deliberately not across them - global uniqueness would make an invitation's 409 reveal an
  account at another Tenant, the exact leak FR-1 exists to prevent. Sign-in resolves an
  address against every Tenant and requires exactly one password to match; the same address
  and the same password at two Tenants cannot be resolved and is refused generically, and
  logged. The fix is a Tenant hint, and the slug that carries it arrives with SSO in Story
  1.5. Raised as ADR 0002 question 7.
- **Rate limiting is per process.** `edge/src/rate-limit.ts` is an in-memory fixed window;
  two replicas double the effective limit. Real, and not dressed up as more. The durable
  version belongs with ADR 0002's still-unowned PIN lockout policy. Question 8.
- **PIN sign-in needs a way to resolve a person.** This story provisions the credential;
  4.1 owns the sign-in. The assumption left for it is a **staff picker then a PIN** on the
  Shared Device. Question 9, to be confirmed there rather than inherited silently.
- **No role editor and no revocation path**, per the scope guards - and enforced rather
  than merely omitted: `jt_app` holds no DELETE on `staff_roles`, `staff_members`,
  `staff_credentials` or `sessions`, so a handler written for something else cannot reach
  one by accident. Story 1.4 grants what it needs.

**VERIFIED BY EXECUTION, and it found three defects.** The bridge VM has no Docker and
no Postgres, so the source tree was mirrored into this session's cloud container, all
eight migrations applied to a real Postgres 16 from scratch, and the suite and the
controls run there. **The results below are from that sandbox and are not a substitute
for `npm run refresh` on the Mac** - two defects in earlier stories lived precisely in
the gap between the two - but they are what reading could not have found:

- **136/136 tests pass; 33 of 35 negative controls red-verified**, 0 failures, 1
  unverifiable (the Dart half, no SDK), 1 skipped (console dependencies not installed
  there). Every one of the six new controls goes red on demand.
- **Defect 1, a leak in `GET /v1/staff?propertyId=`.** A Tenant-wide caller has no
  per-Property authority list, so the authority check could not fire, and the query's
  `property_id IS NULL` branch then returned every Tenant-wide Staff Member for a filter
  naming **another Tenant's** Property. No other Tenant's records ever came back, so
  cross-tenant isolation held - but the answer was wider than what the caller asked for,
  which is the exact thing that function's own comment promised could not happen. Fixed
  by confirming the filter's Property is in the caller's Tenant first, and the test now
  asserts **both** halves so the empty answer cannot pass by accident.
- **Defect 2, a boundary I had quietly reversed.** Redeeming an invitation needs to read
  one, so the first version granted `jt_app` SELECT on `control_plane.invitations` -
  which migration 004 had revoked on purpose and `tests/provisioning.test.ts` asserts.
  The suite caught it. The cell now holds **no privilege on that table at all** and gets
  three SECURITY DEFINER functions instead: a lookup by token hash (which cannot
  enumerate, and takes a row lock so single-use is a database property rather than a
  timing accident), a redemption that refuses a second attempt, and an issue function
  whose scope is hard-coded to `staff_member` so a cell can never mint a
  `tenant_administrator` invitation. Strictly stronger than what was there before, and
  negative control 35 proves the assertion bites.
- **Defect 3, a third dead gate - control 14 had gone vacuous.** It flipped
  `x-story: "1.3"` + `x-implemented: false` and expected the smoke suite to go red;
  Story 1.3 built all six of those operations, so the patch matched nothing and the
  control passed while testing nothing. It is now story-agnostic - it flips whichever
  operation is unbuilt first - and reports UNVERIFIED rather than passing once the last
  flag flips. **That is three gates in one story found watching something that had moved**
  (23, 28 and 14), which is worth saying out loud: a gate is only as good as the last
  time somebody checked what it was pointed at.

**Housekeeping done:** `_to_delete/` (19 git lock files from the bridge's
delete-permission workaround) was tracked in git; it is now untracked and gitignored,
along with `*.tgz`.

### File List

**New**

- `contracts/openapi.yaml` - `/roles`, `/staff` (post, get); schemas `Role`,
  `RoleAssignment`, `InviteStaffMemberRequest`, `StaffMember`, `InvitedStaffMember`
- `ops/migrations/008_staff_and_sessions.sql`
- `core/src/staff/roles.ts` - the permission model (pure)
- `core/src/staff/invite.ts` - the Staff Member aggregate (pure)
- `app/src/staff/sessions.ts` - the decision, both credential paths, recovery, switching
- `app/src/staff/invite-staff-member.ts` - invitation, staff list, role picker
- `edge/src/session-token.ts` - real session tokens: own secret, own audience, fail closed
- `edge/src/authorise.ts` - the single decision point's only caller
- `edge/src/rate-limit.ts`
- `docs/decisions/0003-one-permission-decision-point.md`
- `tests/unit/staff.test.ts` (24 tests), `tests/staff.test.ts`

**Changed**

- `contracts/openapi.yaml` - six operations flipped to built; `Session` gains `region`,
  `credentialType` gains `password` and `fixture`, `propertyId`/`region` become optional;
  `PropertyRef` gains `region` and `active`; `CredentialSetUpRequest` gains `name` and
  `languageTag`; the settled recovery policy and the address-collision limitation written
  where the endpoints are
- `contracts/generated/ts/*` - regenerated
- `edge/src/server.ts` - auth routes, staff and role routes, permission gates on the
  Story 1.2 Property routes, one clock reading per request, new error mappings
- `edge/src/auth.ts` - `resolveFixtureClaims` added; the two dead resolvers removed
- `edge/src/main.ts` - `SESSION_TOKEN_SECRET` checked at boot, as its own call
- `adapters/src/crypto/credential.ts` - `generatePin`, `generateOneTimeToken`,
  `hashOneTimeToken`
- `adapters/src/postgres/pool.ts` - `withoutScope`, for the identity-resolution step only
- `docs/decisions/0002-...md` - questions 4, 5 and 6 closed; 7-10 raised
- `tests/isolation.test.ts` - a Staff Member with roles at two Properties; Jazzware cannot
  read customer staff; the outbox is write-only to the cell; the Tenant-scope refusal
  assertion strengthened
- `tests/control-plane.test.ts` - `staff_members.email` allowlisted, with its reason
- `tests/smoke.test.ts` - unbuilt count 20 -> 14, with the six named
- `scripts/negative-controls.sh` - controls 23 and 28 rewired, 29-34 added
- `scripts/dev-refresh.sh` - asserts the flipped operations no longer 501, and runs the
  suite and the gates
- `.env.example`, `docker-compose.yml`, `tests/harness.ts`, `package.json`
