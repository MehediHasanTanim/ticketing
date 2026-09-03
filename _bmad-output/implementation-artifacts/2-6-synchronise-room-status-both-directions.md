# Story 2.6: Synchronise Room Status in both directions

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **room attendant**,
I want a status I set to reach the PMS and a status the PMS sets to reach me,
So that the front desk and the floor are looking at the same room.

## Acceptance Criteria

**Given** a cleanliness change made in JazzTicketing
**When** it is committed
**Then** it is submitted to Jazz Core and JazzTicketing's own share of the propagation budget is under five seconds, within a target end-to-end budget of thirty seconds (FR-50, NFR-3).

**Given** a status change originating in the PMS
**When** Jazz Core reports it
**Then** it applies to the Room without manual entry and is visible on every open Room view.

**Given** any synchronisation event in either direction
**When** it completes or fails
**Then** direction, outcome and latency are logged with JazzTicketing-side and Jazz Core-side latency separable (FR-50, NFR-8).

**Given** sustained synchronisation failure
**When** the threshold is crossed
**Then** it surfaces through integration health rather than silently diverging (FR-49).

## Tasks / Subtasks

- [ ] **T1. Outbound: our cleanliness reaches Jazz Core** (AC: 1)
  - [ ] A committed cleanliness change is submitted to Jazz Core. **JazzTicketing's own share of the propagation budget is under five seconds**, inside a target end-to-end budget of thirty seconds.
  - [ ] Submit asynchronously from a durable outbox — a failed submission must not fail the user's action, and must not be lost.
- [ ] **T2. Inbound: PMS-originated changes reach us** (AC: 2)
  - [ ] Applied without manual entry, through the single Room writing owner (2.1, AD-13), and visible on every open Room view.
- [ ] **T3. Log every exchange with separable latency** (AC: 3)
  - [ ] Direction, outcome and latency, with JazzTicketing-side and Jazz Core-side latency **separable** (2.2 established the measurement).
- [ ] **T4. Sustained failure surfaces** (AC: 4)
  - [ ] Crossing the failure threshold surfaces through integration health rather than diverging silently.

## Dev Notes

**Prerequisites:** 2.1, 2.2, 2.5.

**Scope guards.** Propagation in both directions. Conflict resolution is 2.7 — this story detects and hands off; it does not decide. OOO/OOS write-back is 2.8 (a different payload with different outcome states).

**Why the five-second split matters.** The thirty-second end-to-end target is `[ASSUMPTION]` pending an agreed SLO (Open Question 1); our five seconds is not. Measuring only the total means that when the target is missed, nobody can tell whose budget was blown — and the whole point of NFR-11's posture is that Jazz Core's availability and latency are reported **independently** of ours.

**Implementation notes.**
- Use a transactional outbox: the room-status event and the outbound submission record commit together, then a worker drains. Anything else either loses submissions or blocks the user on a network call.
- Inbound and outbound must not loop. Tag the origin on each status change so a change we received from Jazz Core is not submitted straight back. This is the classic two-way sync bug and it is silent.
- Never block a user-facing operation on Jazz Core (NFR-11). A cleanliness change succeeds locally whether or not the submission does.

**Testing.** Round-trip with a fake port at healthy, slow, and failing. Loop test: inbound change produces no outbound submission. Outbox durability: kill the worker mid-drain, restart, assert exactly-once submission. Latency separation asserted in the log record. Threshold surfacing in health.

### Project Structure Notes

Extends `adapters/jazzcore/`, `app/integration/sync` (outbox and drain worker), `core/room` (origin tagging). The outbox pattern here is the same shape 4.3's client queue uses — different transport, same discipline.

### References

- [Source: planning-artifacts/epics.md#Story 2.6]
- [Source: prd.md#FR-50], [#FR-19], [#§7 NFR-3, NFR-11], [#§14 Open Question 1]
- [Source: ARCHITECTURE-SPINE.md#AD-6], [#AD-13]

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
