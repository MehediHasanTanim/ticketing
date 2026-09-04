# Story 1.1: Provision a Tenant

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **Jazzware operator**,
I want to create a Tenant and its first administrator on an internal surface,
So that a new customer can be onboarded without Jazzware holding standing access to their data.

## Acceptance Criteria

**Given** I am authenticated as a Jazzware operator on the internal provisioning surface
**When** I create a Tenant with a name and a first administrator email
**Then** the Tenant exists with the shipped role set and platform defaults seeded
**And** no Properties and no identity connection are created — those are the customer's to configure
**And** the first administrator receives an invitation that grants tenant-administrator scope only.

**Given** I am authenticated as any hotel-side role, including tenant administrator
**When** I attempt Tenant creation through any interface, including a direct API call
**Then** the attempt is refused server-side with a permission error (AD-11, FR-1)
**And** the product presents no link or affordance to the internal surface.

**Given** a provisioned Tenant
**When** a Jazzware support engineer needs access to its data
**Then** access must be separately requested and is time-boxed
**And** the grant, its scope and its expiry are recorded in that Tenant's own audit trail.

**Given** a Tenant with operational records
**When** an operator attempts to delete it
**Then** deletion is prevented and only deactivation is offered.

## Tasks / Subtasks

- [ ] **T1. Tenant aggregate and the vendor-only creation path** (AC: 1, 2)
  - [ ] `core/tenant`: Tenant aggregate, event `TenantProvisioned`. ULID id. No Property is created.
  - [ ] Creation handler lives behind an **internal-only** route namespace in `edge/` (e.g. `/internal/*`), authorised by a Jazzware-operator scope that no customer role can hold.
  - [ ] Seed the shipped role set and platform defaults as part of provisioning (one event, `TenantProvisioned`, carrying the seeded set — not seven separate writes).
  - [ ] Explicit negative test: every hotel-side role, **including tenant administrator**, is refused Tenant creation server-side on the internal route and on any guessed public route.
- [ ] **T2. Invite the first administrator** (AC: 1)
  - [ ] Issue an invitation granting tenant-administrator scope only. No identity-provider connection is created (that is Story 1.5).
- [ ] **T3. Support access is requested, time-boxed and audited** (AC: 3)
  - [ ] Support-grant record: actor, requesting operator, scope, expiry. Expired grants stop authorising at next token validation.
  - [ ] The grant, its scope and its expiry are written to the **tenant's own** audit trail, not only to an internal log.
  - [ ] Provisioning itself grants no standing access: assert that a freshly provisioned Tenant is unreadable by any Jazzware operator without a grant.
- [ ] **T4. Deactivate, never delete** (AC: 4)
  - [ ] Deletion refused while operational records exist; deactivation offered instead, recorded as an event.

## Dev Notes

**Prerequisites:** Story 1.0 (repository, cell, gates). The fixture auth stub from 1.0 is replaced here only for the operator scope; real customer identity arrives in 1.3 and 1.5.

**Two contract facts, added 2026-09-04.**

*The invitation this story issues has a redemption endpoint owned elsewhere.*
`POST /auth/credential/set-up` is designed in `contracts/openapi.yaml` under
`x-story: "1.3"`. Agree the invitation token's shape with 1.3 before starting either — the
same arrangement 4.1 and 4.3 have over the offline queue — because until 1.3 lands, a
Tenant provisioned here has a first administrator who cannot sign in. The token travels in
a URL **fragment**, never a query string, so it reaches no access log and no `Referer`
header.

*AC-1's first clause is a precondition nothing builds.* "**Given** I am authenticated as a
Jazzware operator on the internal provisioning surface" — no story in `epics.md` builds
that authentication, and it deliberately does **not** belong on this cell's API: FR-1 puts
Tenant creation on a surface the product does not link to, and AD-4 puts the control plane
outside the cells `contracts/openapi.yaml` describes. It needs its own control-plane
contract and its own story. **Raise it in epics.md rather than improvising it here** — and
in particular do not add an operator credential to the cell, which would defeat FR-1's
"provisioning grants Jazzware no standing access to tenant data".

**Scope guards.** This story creates a Tenant and one administrator. It does **not** create Properties (1.2), assign roles beyond the first administrator (1.3), define custom roles (1.4), connect an identity provider (1.5), or manage Tenant defaults (1.6). Do not build a Tenant settings screen here.

**The actor split is the point of this story.** FR-1 was amended precisely because the original wording conflated the vendor and the customer: "an administrator can create a Tenant and Properties under it" would have put commercial provisioning inside the hotel application. Two consequences the dev agent must not soften: the internal surface is **not linked** from the product, and the refusal for hotel-side roles is server-side, not a hidden menu item (AD-11).

**Implementation notes.**
- Tenant creation is outside this system's own authorisation model (AD-11) — it is the one operation whose authority comes from the operator scope rather than from a Property-scoped role.
- Isolation: every row and event written here already carries `tenant_id`; `property_id` is null only for control-plane records, which is the single permitted exception and must be explicit in the schema, not incidental.
- The control plane holds tenant identity, roles and the property directory, and no guest data (AD-4). Nothing in this story touches a regional cell's guest-bearing tables.

**Testing.** Unit-test the aggregate with fake ports. Add to the **cross-tenant isolation suite** (the 1.0 gate) the case that a tenant administrator of Tenant A cannot read, list or provision against Tenant B. Add a support-grant expiry test with a fake clock.

### Project Structure Notes

New: `core/tenant/`, `app/tenant/`, `edge/internal/`. The internal namespace is a routing concern in `edge/` only — no separate deployable, and no domain logic there.

### References

- [Source: planning-artifacts/epics.md#Story 1.1]
- [Source: prd.md#FR-1] including the `[NOTE FOR PM]` recording why the actor split exists
- [Source: EXPERIENCE-WEB.md#Two audiences, two products] — the internal surface is a different product from the hotel console
- [Source: ARCHITECTURE-SPINE.md#AD-3], [#AD-4], [#AD-11]

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
