# Story 8.9: Work public areas and back of house

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As an **engineer**,
I want jobs against a lobby or a plant room to behave like jobs against a room,
So that non-guest space is maintained on the record too.

## Acceptance Criteria

**Given** the Location hierarchy of floors, public areas, outlets and back-of-house spaces
**When** I raise a Work Order against a non-Room Location
**Then** it uses the same lifecycle, SLA behaviour and reporting as any other (FR-39, FR-30).

**Given** a reporting period
**When** figures are produced
**Then** guest-facing and back-of-house work can be separated (FR-39).

## Tasks / Subtasks

- [ ] **T1. Non-Room Locations behave identically** (AC: 1)
  - [ ] Work Orders against floors, public areas, outlets and back-of-house spaces use the same lifecycle, SLA behaviour and reporting (1.7's hierarchy, 8.1).
- [ ] **T2. Guest-facing and back-of-house separable in reporting** (AC: 2)
  - [ ] Using the `guest_facing` flag 1.7 established.

## Dev Notes

**Prerequisites:** 1.7 (the hierarchy and the flag), 8.1.

**Scope guards.** Extending Work Orders to non-Room Locations and the reporting split. No new lifecycle, no location-type-specific behaviour.

**This story should be nearly free if 1.7 and 8.1 were built as specified.** The Location hierarchy already supports these types and the Job aggregate already targets a Location. If it turns out to be substantial work, the likely cause is that something upstream assumed a Room — which is worth finding, because the same assumption will break 7.11's service rooms and 8.5's OOO logic.

**Implementation notes.**
- Guest-impacting fast path (3.11) requires an **occupied Room**, so it does not apply to a public area by definition. Make sure the conjunction handles a null Room rather than throwing.
- OOO/OOS (8.5) is a Room concept. A closed restaurant is not OOO; do not extend room states to Locations.
- Occupancy context (3.3) is absent for non-Room Locations — the read model must render that as "not applicable", distinct from "unavailable" (2.13's enum needs a fourth case here, or the absence must be represented outside it; decide and document).

**Testing.** Work Order against each Location type through the full lifecycle. Fast-path evaluation with a null Room. OOO refused for a non-Room Location. Reporting split by `guest_facing`. Context rendering for a non-Room target.

### Project Structure Notes

Extends `core/job/` target handling. No new aggregate; possibly one addition to the context-state enum in `contracts/`.

### References

- [Source: planning-artifacts/epics.md#Story 8.9]
- [Source: prd.md#FR-39], [#FR-30], [#FR-36], [#FR-5]
- [Source: ARCHITECTURE-SPINE.md#AD-1]

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
