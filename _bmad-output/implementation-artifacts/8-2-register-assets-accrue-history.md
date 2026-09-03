# Story 8.2: Register assets and accrue their history

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As a **property administrator**,
I want every job against a piece of equipment to stick to that equipment,
So that "this unit again" is a fact rather than a feeling.

## Acceptance Criteria

**Given** an Asset
**When** I register it with a type, Location, identifier and optional warranty and installation dates
**Then** it exists Property-scoped and is selectable on a Work Order (FR-31).

**Given** an Asset with Work Order history
**When** an engineer opens a Job against it on the handset
**Then** the Asset's full Work Order history is visible from that Job (FR-31).

**Given** a roster of assets
**When** I bulk-import them
**Then** the import uses the same explicit-mapping and pre-write validation flow as FR-82, and partial import is supported (FR-31, FR-82).

**Given** an Asset moved to a new Location
**When** the move is saved
**Then** its history is preserved and the move is recorded (FR-31).

## Tasks / Subtasks

- [ ] **T1. Asset registry** (AC: 1)
  - [ ] Type, Location, identifier, optional warranty and installation dates. Property-scoped, selectable on a Work Order.
- [ ] **T2. History visible from the Job, on the handset** (AC: 2)
  - [ ] An Asset's **full Work Order history** is reachable from a Job against it, on mobile.
- [ ] **T3. Bulk import reuses the roster flow's shape** (AC: 3)
  - [ ] Explicit column mapping, pre-write validation, per-row resolution, partial import supported — the same discipline as 1.10, with **its own destination allowlist**.
- [ ] **T4. Moving an Asset preserves history** (AC: 4)
  - [ ] Location change recorded; history intact.

## Dev Notes

**Prerequisites:** 8.1, 1.7 (Locations), 1.10 (the import pattern to reuse).

**Scope guards.** The registry, its history and its import. Not recurring-fault detection (8.7), not asset reporting (8.10), not parts (8.4).

**"This unit again" is the product value here.** FR-33's recurring-fault flag and 8.10's capital-decision reporting both stand on Asset history being complete. An Asset whose history resets when it moves rooms — the naive implementation — silently destroys both.

**Implementation notes.**
- Accrue history by **Asset reference on the Job**, so a Location move changes the Asset's Location without touching any Job. If history is derived by "Jobs at this Location", T4 is unachievable.
- History on the handset means a mobile-friendly read model, not a link to a console report — an engineer standing at the unit is the use case.
- Reuse 1.10's mapping and validation components; the allowlist differs (asset fields are not staff data, so DG-5 does not apply, but the fail-closed rule still does).

**Testing.** Move an Asset and assert history intact and the move recorded. History reachable from a mobile Job within the same number of taps the UX specifies. Import with a duplicate identifier, a bad date and a missing required field. Partial import. Cross-property asset access added to the isolation gate.

### Project Structure Notes

New: `core/asset/`, `app/asset/`, reusing `app/import/` from 1.10 with a different allowlist.

### References

- [Source: planning-artifacts/epics.md#Story 8.2]
- [Source: prd.md#FR-31], [#FR-33], [#FR-72], [#FR-82]
- [Source: ARCHITECTURE-SPINE.md#AD-3]

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
