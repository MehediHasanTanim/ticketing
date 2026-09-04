# Story 1.3: Invite a Staff Member and assign roles per Property

Status: ready-for-dev

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
**`forgot`/`reset` are designed at the shape level only and must not be built until
epics.md settles the recovery and MFA policy** — ADR 0002, open questions 4 and 5. `/auth/session` IS the
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

_(to be filled by the dev agent)_

### Debug Log References

### Completion Notes List

### File List
