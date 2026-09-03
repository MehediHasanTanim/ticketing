# Story 7.3: Work a room from the handset

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **room attendant**,
I want to start, pause and complete a room, and to say when I could not,
So that the record matches what actually happened on the floor.

## Acceptance Criteria

**Given** a Room on my board
**When** I start, pause and complete it
**Then** start and complete timestamps are recorded per Room per attendant (FR-21).

**Given** a Room I cannot service
**When** I record DND or refuse-service
**Then** the Room is not completed, and a configured re-attempt reminder is set (FR-21).

**Given** the clean flow
**When** I attempt to mark a Room clean without having started it
**Then** it is refused; **and** a direct cleanliness change through Set status is permitted, attributed to me, and distinguishable in reporting from a completed clean (FR-21).

**Given** the Inspected state
**When** I attempt to set it
**Then** it is refused for my role, and a supervisor override of either restriction is logged (FR-21, AD-11).

**Given** any of these actions taken with no connectivity
**When** the device syncs
**Then** each carries the time I performed it (FR-58, AD-2).

## Tasks / Subtasks

- [ ] **T1. Start, pause, complete — per Room per attendant** (AC: 1)
  - [ ] Start and complete timestamps recorded per Room per attendant.
- [ ] **T2. DND and refuse-service without completing** (AC: 2)
  - [ ] Recording either leaves the Room incomplete and sets the configured **re-attempt reminder**.
- [ ] **T3. Two ways to change cleanliness, deliberately different** (AC: 3)
  - [ ] Through the **clean flow**: marking clean without having started is refused.
  - [ ] Through **Set status**: a direct cleanliness change is permitted, attributed, and **distinguishable in reporting** from a completed clean.
- [ ] **T4. Inspected is not the attendant's to set** (AC: 4)
  - [ ] Refused for the attendant role; a supervisor override of either restriction is logged (AD-11).
- [ ] **T5. Offline carries the action time** (AC: 5)
  - [ ] Every one of these actions queues offline and carries the time performed (4.3, AD-2).

## Dev Notes

**Prerequisites:** 4.1, 4.2, 4.3 (offline queue), 2.1 (Room status and its **single writing owner**), 7.1.

**Scope guards.** The attendant's room flow. Not inspection (7.6), not board reassignment (7.5), not Faults (7.4), not supply requests (7.8).

**All cleanliness writes go through `core/room`'s writing owner.** This is the story AD-13 was written to constrain: housekeeping completing a room and `core/room` owning status could both emit room-status events with different semantics. 2.1's ownership test must stay green — if this flow needs to write status, it calls the owner.

**T3 is a genuinely subtle requirement, and it came from Tanim's own question.** "How can a housekeeper update Room Status only?" The answer designed into FR-21 is two paths with different meanings: the clean flow records **work done** (and therefore requires a start), while Set status records **a fact about the room** (and therefore does not). Both are legitimate; conflating them makes either the work record or the status unusable. Reporting must be able to tell them apart.

**Implementation notes.**
- Distinct events: `RoomCleanStarted` / `RoomCleanCompleted` versus `RoomCleanlinessChanged` with a `direct` origin. One event with a flag will get aggregated wrongly by someone.
- DND and refuse-service are outcomes, not errors — they close the attempt and schedule a re-attempt, and the room stays on the board.
- Two-way sync (2.6) submits the resulting cleanliness; the attendant's action must not wait on it.

**Testing.** Refusal: mark clean without start. Permission: direct Set status attributed and distinguishable in a report query. Inspected refused for attendant, permitted with logged supervisor override. DND sets a reminder and leaves the room incomplete. Offline versions of all five with action-time assertions. Ownership test still green.

### Project Structure Notes

`clients/mobile` room card + `core/room` (writes) + `core/housekeeping` (the assignment's progress). Two aggregates, one writing owner each — the assignment tracks progress, the room tracks status.

### References

- [Source: planning-artifacts/epics.md#Story 7.3]
- [Source: prd.md#FR-21], [#FR-19], [#FR-58]
- [Source: EXPERIENCE.md] room card, Set status, Room Status Authority
- [Source: ARCHITECTURE-SPINE.md#AD-13], [#AD-6], [#AD-2], [#AD-11]

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
