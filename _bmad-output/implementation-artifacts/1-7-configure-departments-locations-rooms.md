# Story 1.7: Configure Departments, Locations and Rooms

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property administrator**,
I want to define the property's Departments and its Location hierarchy,
So that work can be routed somewhere real and reported by area.

## Acceptance Criteria

**Given** a Property
**When** I create Departments and a Location hierarchy of floors, Rooms, public areas, outlets and back-of-house spaces
**Then** each is Property-scoped and available to every later routing and reporting choice (FR-5, FR-39)
**And** reporting can separate guest-facing from back-of-house Locations.

**Given** Locations and Rooms that Jazz Core is authoritative for
**When** the Jazz Core connection is configured (Story 2.5)
**Then** those records reconcile from Jazz Core rather than being maintained twice, and locally-created Locations outside Jazz Core's ownership are preserved.

**Given** any configuration change I make
**When** it is saved
**Then** it is attributed to me with a timestamp (FR-5, FR-6).

## Tasks / Subtasks

- [ ] **T1. Departments** (AC: 1)
  - [ ] Property-scoped Departments, each usable as a routing target and a reporting dimension.
- [ ] **T2. Location hierarchy** (AC: 1)
  - [ ] Hierarchy supporting floors, Rooms, public areas, outlets and back-of-house spaces, with a `guest_facing` flag so reporting can separate guest-facing from back-of-house work (FR-39).
  - [ ] Room numbers are **external strings** and are never re-keyed (AD-9 conventions); the internal id is a ULID.
- [ ] **T3. Reconciliation seam with Jazz Core** (AC: 2)
  - [ ] Mark each Location record with its owner: Jazz Core-sourced or locally created.
  - [ ] Once Story 2.5 exists, Jazz Core-owned records reconcile from Jazz Core and are not editable here; locally created Locations outside Jazz Core's ownership are preserved untouched.
  - [ ] Until 2.5 exists, everything is locally created — implement the ownership field now so 2.5 does not have to migrate data.
- [ ] **T4. Attribution** (AC: 3)
  - [ ] Every configuration change attributed with actor and timestamp (FR-5, FR-6).

## Dev Notes

**Prerequisites:** 1.2. **One criterion (AC-2) waits for Story 2.5** — this is one of the four declared cross-epic dependencies in epics.md. The rest of the story is complete and testable without it; verify AC-2 when 2.5 lands.

**Scope guards.** Departments and Locations only. Catalog Entries and SLA Targets are 1.8; Credits and checklists are 1.9. The floor **layout** (wing, corridor side, sequence) and the plan view are Story 7.11 (FR-80, R2) — this story stores floors as hierarchy, not geometry. Do not build a layout editor.

**Implementation notes.**
- `[ASSUMPTION]` in the PRD, still open: the split between Jazz Core-owned and JazzTicketing-owned master data is unresolved (Open Question 2, owner Tanim). Implement the ownership field so either answer is expressible, and **do not hard-code** which side owns Rooms. If the build forces the answer, raise it rather than deciding it.
- Location hierarchy depth: model as an adjacency structure with a materialised path for scope queries, because reporting filters by area at every level and a recursive query per dashboard read will not meet NFR-3.

**Testing.** Guest-facing vs back-of-house separation in a reporting query. Ownership field survives a simulated 2.5 reconciliation without data migration. Isolation gate extended with Locations in two Properties.

### Project Structure Notes

New: `core/location/`, `core/department/`, `app/configuration/`. `core/room` arrives in Story 2.1 and owns Room **status**; this story owns the Room's existence and identity. Keep those two concerns separate — AD-13 gives one writing owner per aggregate.

### References

- [Source: planning-artifacts/epics.md#Story 1.7], [#Backlog order vs epic number]
- [Source: prd.md#FR-5], [#FR-39], [#FR-53] and its `[ASSUMPTION]`, [#§14 Open Question 2]
- [Source: ARCHITECTURE-SPINE.md#AD-6], [#AD-13], [#Consistency Conventions] (ids)

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
