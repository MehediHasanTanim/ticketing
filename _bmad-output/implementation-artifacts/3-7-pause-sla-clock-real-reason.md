# Story 3.7: Pause an SLA Clock for a real reason

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **room attendant**,
I want to pause the clock when I cannot proceed for a reason the property recognises,
So that waiting for a part is not recorded as me being slow.

## Acceptance Criteria

**Given** a Job whose Catalog Entry has configured Pause Conditions
**When** I pause it
**Then** only those Pause Conditions are offered, a reason from the configured list is required, and the pause is recorded as an event (FR-13).

**Given** a paused interval
**When** SLA is measured
**Then** the interval is excluded from measurement by the one fold, retained in history, and total paused duration is visible on the Job and reportable separately from active time (FR-13, FR-71).

**Given** a Job paused beyond the configured maximum
**When** the maximum is exceeded
**Then** it re-escalates rather than remaining parked (FR-13).

## Tasks / Subtasks

- [ ] **T1. Only the configured conditions, with a reason** (AC: 1)
  - [ ] Only the Pause Conditions attached to the Job's Catalog Entry (1.9) are offered; a reason from the configured list is required; the pause is an event.
- [ ] **T2. Paused time leaves measurement but stays in history** (AC: 2)
  - [ ] The paused interval is excluded from SLA measurement **by the one fold** (3.4), retained in history, and total paused duration is visible on the Job and reportable separately from active time.
- [ ] **T3. A pause cannot become a parking space** (AC: 3)
  - [ ] A Job paused beyond the configured maximum **re-escalates** rather than remaining parked.

## Dev Notes

**Prerequisites:** 3.4 (the fold must already handle pauses), 1.9 (Pause Conditions), 3.2.

**Scope guards.** Pausing and resuming, and the maximum-duration re-escalation. Not the pause vocabulary (1.9), not the arithmetic (3.4 — this story *uses* it and adds no second calculation).

**Why paused time is the highest-risk arithmetic in the product.** It is the exact hole the adversarial architecture pass found: two readers treating paused time differently produce two compliance numbers for the same month. 6.2 will assert that the dashboard and the report agree over one fixture — that test is only meaningful if this story routes every pause question through the fold.

**Implementation notes.**
- Consecutive and nested pauses need a defined answer. Pick one (a pause while paused is refused, or it extends) and put it in the fixture vectors so both languages agree. Do not leave it to whichever code path runs first.
- Total paused duration is a fold output, not a stored accumulator. An accumulator drifts on projection rebuild.
- The maximum-duration sweep is a saga with a fake-clock test, like 3.6's window.
- An offline pause carries the time it was performed (4.3, AD-2) — the fold must accept out-of-order arrival, which is why it folds over `occurred_at` rather than insertion order.

**Testing.** Offered-conditions test against two Catalog Entries. Fold agreement on paused totals in both languages via the fixture gate. Maximum-duration re-escalation with a fake clock. Out-of-order pause/resume arrival producing the same result as in-order.

### Project Structure Notes

Extends `core/job/` (pause events feeding the fold), `app/sagas/pause-maximum`. New fixture vectors in `contracts/sla-fixtures/`.

### References

- [Source: planning-artifacts/epics.md#Story 3.7]
- [Source: prd.md#FR-13], [#FR-71], [#§13 SM-2]
- [Source: ARCHITECTURE-SPINE.md#AD-14], [#AD-1], [#AD-2], [#AD-9]

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
