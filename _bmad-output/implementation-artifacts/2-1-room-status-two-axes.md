# Story 2.1: Room Status on two axes

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **property administrator**,
I want every Room to carry an occupancy state and a cleanliness state independently, plus OOO and OOS,
So that "vacant and dirty" is expressible and the two axes never overwrite each other.

## Acceptance Criteria

**Given** a Room
**When** its status is read
**Then** occupancy and cleanliness are separate values, each with its own history, plus OOO and OOS states (FR-19)
**And** OOO and OOS are mutually exclusive; setting one clears the other with the transition recorded.

**Given** a cleanliness change and an occupancy change arriving for the same Room
**When** both are applied
**Then** neither overwrites the other axis, and each is recorded as its own event with `occurred_at` and `recorded_at` (AD-2).

**Given** the Room aggregate
**When** any component writes to it
**Then** the write goes through the single writing owner for Room status; no other module emits a room-status event (AD-13).

## Tasks / Subtasks

- [ ] **T1. Two independent axes** (AC: 1)
  - [ ] `core/room` status: an **occupancy** value and a **cleanliness** value, each with its own history, plus OOO and OOS.
  - [ ] OOO and OOS are mutually exclusive; setting one clears the other and the transition is recorded.
- [ ] **T2. Neither axis overwrites the other** (AC: 2)
  - [ ] A cleanliness change and an occupancy change for the same Room apply independently, each as its own event carrying `occurred_at` and `recorded_at` (AD-2).
  - [ ] Events: `RoomCleanlinessChanged`, `RoomOccupancyChanged`, `RoomTakenOutOfOrder`, `RoomTakenOutOfService`, `RoomReturnedToService`. Past tense, domain-first, one per real-world fact.
- [ ] **T3. One writing owner** (AC: 3)
  - [ ] All room-status writes go through the single writing owner for the Room aggregate. No other module emits a room-status event (AD-13).
  - [ ] Add a test that fails if a room-status event is emitted from outside `core/room`.

## Dev Notes

**Prerequisites:** 1.0, 1.7 (Rooms exist as Locations).

**Scope guards.** The status model and its invariants. Not synchronisation (2.6), not conflict resolution (2.7), not the housekeeping flow that changes cleanliness (7.3), not the floor view (7.9). This story gives every later story one place to write room status.

**AD-13 exists because of this aggregate.** The adversarial architecture pass found that housekeeping completing a room and `core/room` owning status could **both** emit room-status events with different semantics while obeying every other invariant. That is why T3 is a test and not a comment: Story 7.3 will want to write cleanliness directly, and it must go through this owner.

**Implementation notes.**
- Cleanliness is ours, occupancy is Jazz Core's (AD-6). Model that ownership on the axis itself, so 2.7's authority rule reads it rather than hard-coding a direction.
- Cleanliness vocabulary must match what the handset and console both show. One state vocabulary across grid, plan view and mobile (UX-DR-3) — define the enum here, once.
- Do not store a derived "ready to sell" flag. It is a function of the two axes plus OOO/OOS; a stored flag is a fourth state to get out of sync.

**Testing.** Independence: apply both axes concurrently, assert both survive. OOO/OOS exclusivity. Ownership test (T3). Greyscale check of the state vocabulary is deferred to the stories that render it (7.9, 7.11).

### Project Structure Notes

New: `core/room/` — status, transitions, authority metadata. Room identity and existence stay in `core/location` from Story 1.7.

### References

- [Source: planning-artifacts/epics.md#Story 2.1]
- [Source: prd.md#FR-19], [#FR-50], [#FR-51]
- [Source: ARCHITECTURE-SPINE.md#AD-6], [#AD-13], [#AD-2], [#Consistency Conventions] (events)
- [Source: EXPERIENCE.md#Room Status Authority]

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
