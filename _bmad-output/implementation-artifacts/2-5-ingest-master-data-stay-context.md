# Story 2.5: Ingest master data and Stay context

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **front office user**,
I want rooms, room types and current Stay context to arrive from Jazz Core,
So that nobody maintains the property's inventory twice and a Request knows who is in the room.

## Acceptance Criteria

**Given** a connected Property
**When** Jazz Core reports Locations, Rooms and Room types it is authoritative for
**Then** they reconcile into JazzTicketing without manual re-entry, and a later change reconciles again (FR-53).

**Given** an ingested Stay
**When** the record is written
**Then** only the fields DG-1 permits are stored, enforced **at ingestion** so an excluded field can never reach a log or a projection (AD-10)
**And** check-in, check-out and room-move events are recorded with `occurred_at` from the source.

**Given** a Stay with open Jobs
**When** Jazz Core reports a room move
**Then** the open Jobs relocate to the new Room and the move is recorded on each Job (FR-53).

**Given** a Stay that checks out
**When** the check-out is ingested
**Then** the guest-facing follow-up window closes per FR-15.

## Tasks / Subtasks

- [ ] **T1. Master data reconciliation** (AC: 1)
  - [ ] Locations, Rooms and Room types that Jazz Core is authoritative for reconcile in without manual re-entry, and reconcile again on change.
  - [ ] Respect the ownership field Story 1.7 created: locally-owned Locations are preserved untouched.
- [ ] **T2. Minimise guest data AT INGESTION** (AC: 2)
  - [ ] Only the fields DG-1 permits are stored, enforced **at ingestion** so an excluded field can never reach a log, a projection or an export (AD-10).
  - [ ] Drop excluded fields before the payload is persisted or logged anywhere — not on display, not in a view.
  - [ ] Stay events (`StayCheckedIn`, `StayCheckedOut`, `StayRoomMoved`) carry `occurred_at` from the source, `recorded_at` from us (AD-2).
- [ ] **T3. Room move relocates open Jobs** (AC: 3)
  - [ ] On a reported room move, open Jobs for that Stay relocate to the new Room and the move is recorded **on each Job**.
- [ ] **T4. Check-out closes the follow-up window** (AC: 4)
  - [ ] Ingested check-out closes the guest-facing follow-up window per FR-15 (consumed by 6.4).

## Dev Notes

**Prerequisites:** 2.2, 1.7. Satisfies Story 1.7's deferred AC-2. Consumed by 3.3, 6.4, 7.2.

**Scope guards.** Ingestion of master data and Stay context. Not room-status synchronisation (2.6) — that is the other direction and its own story. Not the Stay timeline surface.

**A Stay is a projection of Jazz Core truth, never authored here.** That framing is what makes GDPR erasure tractable (DG-3): we hold a minimised copy we can drop, not a record of our own. Do not add a field to a Stay that JazzTicketing itself would author.

**Ingestion-time minimisation is the single most important line in this story.** AD-10 is worded as "minimised at ingestion and erasable by construction" precisely so that a later report, log line or export cannot leak a field nobody meant to keep. Filtering on display is not compliance — it is a bug waiting for a new read path.

**Open dependency.** The split between Jazz Core-owned and JazzTicketing-owned master data is unresolved (`[ASSUMPTION]`, Open Question 2, owner Tanim). Implement against the ownership field rather than assuming; raise it if the build forces the answer.

**Implementation notes.**
- Room moves are the trap: a Job carries a Room, and a Stay moving rooms must not orphan or duplicate it. Relocate and record; never create a second Job.
- Reconciliation must be idempotent — the same master-data snapshot applied twice changes nothing.
- Erasure (DG-3) must work by construction: a Stay's guest fields are removable without breaking Job history, so reference the Stay by id from Jobs and never denormalise a guest name onto one.

**Testing.** Ingest a payload containing an excluded field; assert it is absent from the database, the logs and an export. Room move with two open Jobs. Idempotent double-reconcile. Erasure test: drop a Stay's guest fields, assert Job history remains intact and readable.

### Project Structure Notes

Extends `adapters/jazzcore/` (ingestion, field allowlist), new `core/stay/` (the projection), `app/integration/ingest`. The allowlist lives in `core/stay` so the domain owns what may be stored.

### References

- [Source: planning-artifacts/epics.md#Story 2.5]
- [Source: prd.md#FR-53], [#FR-15], [#§3 Glossary "Stay"], [#§11 DG-1, DG-3], [#§14 Open Question 2]
- [Source: ARCHITECTURE-SPINE.md#AD-10], [#AD-2], [#AD-6]

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
