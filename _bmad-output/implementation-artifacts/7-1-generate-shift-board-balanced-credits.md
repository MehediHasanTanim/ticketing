# Story 7.1: Generate a shift board balanced by Credits

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **housekeeping supervisor**,
I want the day's assignments generated and then adjustable,
So that the board is fair before the shift starts instead of argued about after it.

## Acceptance Criteria

**Given** a Property with Credit values configured by Room type and clean type
**When** I generate Room Assignments for a shift
**Then** generation completes for a 400-Room Property in under ten seconds and balances by Credits (FR-20, NFR-3).

**Given** generated assignments
**When** I review the board
**Then** any Room not assigned is visible **as unassigned** rather than silently dropped (FR-20).

**Given** a generated board
**When** I adjust an assignment before the shift starts
**Then** Credits recalculate for the affected attendants and the adjustment is attributed to me (FR-6).

## Tasks / Subtasks

- [ ] **T1. Generate, balanced by Credits, under ten seconds** (AC: 1)
  - [ ] Generation completes for a **400-Room Property in under ten seconds** and balances by Credits from 1.9 (Room type × clean type).
- [ ] **T2. Unassigned is visible, never dropped** (AC: 2)
  - [ ] A Room not assigned appears **as unassigned** on the board rather than silently disappearing.
- [ ] **T3. Adjust before the shift, with recalculation** (AC: 3)
  - [ ] Manual adjustment recalculates Credits for affected attendants and is attributed (FR-6).

## Dev Notes

**Prerequisites:** 1.9 (Credit values), 2.1 (Room status), 2.5 (occupancy and arrivals), 1.3 (attendants). Epic 7 opens **R2**.

**Scope guards.** Board generation and pre-shift adjustment. Departure ordering is 7.2, mid-shift reassignment is 7.5, the attendant's own flow is 7.3, turndown is 7.7.

**A Room Assignment is deliberately NOT a Job.** Glossary, binding: `RoomAssignment` is housekeeping's unit of planned work measured in **Credits**, while `Job` is a Request or WorkOrder with an SLA Clock. This distinction survives even on the dual-role Board screen, where Job cards and Room cards stay distinct types and no card does double duty. Do not model assignments as Jobs to reuse the lifecycle — they have no SLA Clock, and giving them one would put a second clock in the system.

**Implementation notes.**
- Ten seconds for 400 rooms is a real constraint on the balancing algorithm. A greedy Credit-balancing pass is sufficient; do not reach for an optimiser.
- Credits come from configuration at the board's bound version (AD-9) so a mid-day Credit change does not retroactively rebalance a running shift.
- "Visible as unassigned" is the anti-silence guard of this epic, the same shape as 5.1's fallback: the board must never lose a room by omission.

**Testing.** Generation performance at 400 rooms. Credit balance within tolerance across attendants. Unassigned rooms present in the output for an under-staffed fixture. Adjustment recalculation for both affected attendants. Bound-version test across a Credit change.

### Project Structure Notes

`core/housekeeping/` (RoomAssignment aggregate, Credit arithmetic — pure), `app/housekeeping/board`. Credits arithmetic lives in `core` and is the only place it exists (7.5 recalculates through it).

### References

- [Source: planning-artifacts/epics.md#Story 7.1]
- [Source: prd.md#FR-20], [#§3 Glossary "Room Assignment", "Credits"], [#§7 NFR-3]
- [Source: EXPERIENCE.md] Board, dual-role home
- [Source: ARCHITECTURE-SPINE.md#AD-9], [#AD-13]

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
