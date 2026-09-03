# Story 1.2: Create a Property under a Tenant

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **tenant administrator**,
I want to create a Property and choose its region,
So that the hotel has a scope for its rooms, staff and configuration before anyone starts work in it.

## Acceptance Criteria

**Given** I am a tenant administrator
**When** I create a Property with a name, timezone, currency and region
**Then** the Property exists in the chosen region's cell, inherits the Tenant defaults, and is marked as setup-incomplete until its required configuration is present
**And** the region is displayed as immutable from this point forward (DG-4, AD-4).

**Given** an existing Property
**When** anyone attempts to change its region through any interface
**Then** the change is refused, with residency named as the reason.

**Given** a Property with operational records
**When** a tenant administrator attempts to delete it
**Then** deletion is prevented and only deactivation is offered (FR-1)
**And** a deactivated Property's records remain readable to authorised users and stop accepting new Jobs.

**Given** a Property that is setup-incomplete
**When** a tenant administrator opens it
**Then** the outstanding configuration steps are listed in the order they must be completed.

## Tasks / Subtasks

- [ ] **T1. Property aggregate and creation** (AC: 1)
  - [ ] `core/property`: name, timezone, currency (ISO-4217), region. Event `PropertyCreated`.
  - [ ] Property inherits Tenant defaults at creation by **reference to the Tenant default's version**, not by copying values (AD-9, and 1.6 depends on this distinction).
  - [ ] Mark the Property `setup_incomplete` until its required configuration is present.
- [ ] **T2. Region is immutable and it is a residency rule** (AC: 1, 2)
  - [ ] The Property is created in the chosen region's cell; the control plane records which cell holds it.
  - [ ] Any region change is refused through every interface with residency named as the reason (DG-4, AD-4). Test the direct API call, not only the absent form field.
- [ ] **T3. Deactivate, never delete** (AC: 3)
  - [ ] Deletion refused while operational records exist. A deactivated Property stops accepting new Jobs and stays readable to authorised users.
- [ ] **T4. Continue-setup list** (AC: 4)
  - [ ] Outstanding configuration steps listed **in the order they must be completed**, derived from what is actually missing rather than a hard-coded checklist.

## Dev Notes

**Prerequisites:** 1.1 (a Tenant exists).

**Scope guards.** Creating the Property and its setup state only. Departments, Locations and Rooms are 1.7; catalog and SLA configuration are 1.8/1.9; the Jazz Core connection is 2.2. The continue-setup list *names* those steps but must not implement them.

**Implementation notes.**
- Region choice is the one irreversible decision a customer makes in this product. Surface it as such at creation (UX: the region field carries its own permanence note) and enforce it in the domain, not the form.
- Inheritance-by-reference matters: Story 1.6 requires that a Property which overrides a default **stops inheriting permanently** and that a later Tenant change does not silently re-apply. That is only expressible if inheritance is a link plus an override flag, never a copy at creation time.
- Timezone is presentation only; storage stays UTC (AD-2).

**Testing.** Region immutability through every write path. Inheritance test: change a Tenant default, assert an inheriting Property sees it and an overriding Property does not. Add the new Property to the isolation gate's fixture so cross-property reads are covered as well as cross-tenant.

### Project Structure Notes

New: `core/property/`, `app/property/`. Cell placement is recorded in the control plane; the Property's operational rows live only in its own cell.

### References

- [Source: planning-artifacts/epics.md#Story 1.2]
- [Source: prd.md#FR-1], [#FR-83] (region is display-only at Tenant level), [#§11 DG-4]
- [Source: EXPERIENCE-WEB.md#Property lifecycle]
- [Source: ARCHITECTURE-SPINE.md#AD-4], [#AD-9]

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
