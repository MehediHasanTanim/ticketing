# Story 7.11: Define a floor layout and view rooms by it

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **property administrator**,
I want to describe how a floor is actually arranged,
So that supervisors can look at the floor rather than at a numeric list.

## Acceptance Criteria

**Given** a floor
**When** I define its layout
**Then** I enter structured data — wing, corridor side, sequence, and the position of service rooms and vertical circulation — with no CAD import and no drawing canvas in scope (FR-80).

**Given** a floor **without** a layout
**When** a user opens the plan view
**Then** the plan view is absent for that floor, not broken, and the numeric grid remains the default view everywhere (FR-80).

**Given** a Room state in the plan view
**When** compared with the same Room in the grid
**Then** the state vocabulary is identical — a tile never means something different between views (FR-80, UX-DR-3).

**Given** the plan view in Arabic
**When** it renders
**Then** corridor sides and sequence follow logical direction, so the layout mirrors coherently rather than reading backwards (AD-12, UX-DR-2).

## Tasks / Subtasks

- [ ] **T1. Structured layout, not a drawing** (AC: 1)
  - [ ] Per floor: **wing, corridor side, sequence**, and the position of service rooms and vertical circulation. Structured data only — **no CAD import, no drawing canvas** (§5 and FR-80's scope note).
- [ ] **T2. Absent, not broken, without a layout** (AC: 2)
  - [ ] The plan view is absent for floors with no layout; the **numeric grid remains the default view everywhere**.
- [ ] **T3. Identical vocabulary to the grid** (AC: 3)
  - [ ] A tile never means something different between views (UX-DR-3, 7.9).
- [ ] **T4. Arabic mirrors coherently** (AC: 4)
  - [ ] Corridor sides and sequence follow logical direction so the layout mirrors rather than reading backwards (AD-12).

## Dev Notes

**Prerequisites:** 1.7 (floors), 7.9 (the state vocabulary and the grid).

**Scope guards and a cost warning.** FR-80 carries an explicit `[NOTE FOR PM]`: this is **new scope arising from UX review, not from the original PRD**, it belongs in R2 at the earliest, and it should be **priced as configuration tooling rather than as a view**, because someone has to enter a layout per floor and the layout **editor** is a further undesigned screen. Before starting, confirm whether the editor is in scope for this story or is separate work — the story as written covers definition and viewing, and an undesigned editor is not something to invent mid-implementation.

**The design constraint that keeps this cheap.** A layout is wing + corridor side + sequence, which is enough to draw a corridor with rooms on both sides and place the lift and linen room. It is not geometry. Resisting the pull toward a floor-plan editor is what keeps FR-80 from becoming its own project.

**Implementation notes.**
- Corridor side is a **logical** concept (start side / end side), not left/right — that is what makes T4 work rather than requiring a mirrored data set.
- The design phase had a real defect here: labels described wings while rows were corridor sides. Relabelled so that north/south side is the row and wings are marked along the corridor. Keep that vocabulary.
- Plan and grid read one projection; the plan is a layout applied to the same tiles.

**Testing.** Floors with and without layouts. Vocabulary equivalence between plan and grid from one source. Arabic render of a full floor, checked visually and in greyscale. Assert no drawing or import surface exists.

### Project Structure Notes

`core/location/layout` (structured layout), `app/housekeeping/floor` (plan projection), both clients' plan surfaces.

### References

- [Source: planning-artifacts/epics.md#Story 7.11]
- [Source: prd.md#FR-80] including its `[NOTE FOR PM]`, [#FR-27], [#§5 Non-Goals]
- [Source: EXPERIENCE-WEB.md] floor plan; [Source: DESIGN.md] tile states
- [Source: ARCHITECTURE-SPINE.md#AD-12], [#Deferred] (floor layout editor)

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
