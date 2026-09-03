# Story 3.6: Escalate a Request nobody accepted

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **department manager**,
I want a dispatched request that nobody picks up to escalate on its own,
So that work does not sit unaccepted because everyone assumed someone else had it.

## Acceptance Criteria

**Given** a dispatched Request and a configured acceptance window
**When** the window expires without acceptance
**Then** escalation occurs with no human intervention (FR-11)
**And** the window is configurable per Catalog Entry with a Department default.

**Given** an escalation
**When** it is recorded
**Then** escalation on non-acceptance is distinguishable in reporting from escalation on completion Breach (FR-11, FR-14).

**Given** a Request accepted moments before the window expires
**When** the window passes
**Then** no escalation is raised, and the acceptance timestamp is what decides it (AD-2).

## Tasks / Subtasks

- [ ] **T1. The window expires without a human** (AC: 1)
  - [ ] A dispatched Request unaccepted within the Property's configured acceptance window escalates with **no human intervention**.
  - [ ] Window configurable per Catalog Entry with a Department default, read from the Job's **bound** configuration version (1.8, AD-9).
- [ ] **T2. Two escalation causes, distinguishable** (AC: 2)
  - [ ] Escalation on non-acceptance is distinguishable **in reporting** from escalation on completion Breach. Two event types or one event with a cause — either way, reportable separately.
- [ ] **T3. Acceptance just before expiry wins** (AC: 3)
  - [ ] The acceptance timestamp decides. A Request accepted moments before expiry raises no escalation.

## Dev Notes

**Prerequisites:** 3.4 (the fold derives the window's expiry), 3.5, 1.8/1.9. Consumed by Epic 5 as a chain trigger.

**Scope guards.** Detecting expiry and raising the escalation. **Who gets told is Epic 5** (5.1 routing, 5.2 chains) — this story owns the trigger, E5 owns the delivery, and the split is declared in epics.md's owner-vs-consumer table.

**Implementation notes.**
- Expiry is a **derivation**, not a timer row. The fold knows when the window closes; a saga wakes up to act on it. Storing a "escalate_at" timestamp that a config change could contradict is the mistake AD-9 exists to prevent.
- The timing test is where implementations fail: use a fake clock and assert at the boundary (one tick before, exactly at, one tick after). Real sleeps in tests produce flaky gates.
- `occurred_at` on the escalation is the moment the window closed, not the moment the saga ran (AD-2) — otherwise a slow worker rewrites history.

**Testing.** Boundary triple with a fake clock. Cause-distinguishability asserted in a report query, not just in the event. Bound-version test: shorten the window after dispatch, assert the Job keeps its original. No-escalation case for late acceptance.

### Project Structure Notes

Extends `core/job/` (window derivation), `app/sagas/acceptance-window`. The saga is in `app/`, the decision is in `core/`.

### References

- [Source: planning-artifacts/epics.md#Story 3.6], [#Ownership and consumption]
- [Source: prd.md#FR-11], [#FR-14], [#FR-66]
- [Source: ARCHITECTURE-SPINE.md#AD-1], [#AD-2], [#AD-9], [#AD-14]

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
