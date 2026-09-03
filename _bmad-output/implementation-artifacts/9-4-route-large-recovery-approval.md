# Story 9.4: Route a large Recovery for approval

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **general manager**,
I want recoveries above a threshold approved before they count as authorised,
So that generosity is deliberate.

## Acceptance Criteria

**Given** the per-role threshold configured in Story 1.4
**When** a Recovery exceeds the threshold for the recording user's role
**Then** it routes for approval and is not recorded as authorised until approved (FR-43, FR-81).

**Given** a pending approval
**When** the approver opens their queue
**Then** it appears there and escalates on the Property's configured interval (FR-43, FR-66).

**Given** an approval decision
**When** it is made
**Then** the approver and the decision timestamp are recorded (FR-43, FR-6).

## Tasks / Subtasks

- [ ] **T1. Threshold by role, from 1.4** (AC: 1)
  - [ ] A Recovery exceeding the threshold for the recording user's role routes for approval and is **not recorded as authorised** until approved. Thresholds come from the per-role value Story 1.4 stores.
- [ ] **T2. On the approver's queue, escalating** (AC: 2)
  - [ ] Appears on the approver's queue and escalates on the Property's configured interval (5.2's chain machinery).
- [ ] **T3. Approver and timestamp recorded** (AC: 3)

## Dev Notes

**Prerequisites:** 9.3, **1.4** (per-role thresholds), 5.1/5.2 (queues and escalation intervals).

**Scope guards.** Approval routing for Recoveries. Not the threshold's configuration (1.4), not Recovery recording (9.3), not the notification channels (5.1).

**Reuse the escalation machinery; do not build a second one.** A pending approval that escalates on an interval is structurally the same problem as an unaccepted Job (3.6) and a breached Job (3.8). If this story grows its own timer saga, the product has three escalation implementations and they will diverge on the same edge cases — the hold-at-final-role behaviour above all (5.2's T3).

**Implementation notes.**
- The threshold is evaluated against **the recording user's role**, not the Recovery's absolute value alone — a duty manager's £200 may be within threshold where a supervisor's is not.
- Authorisation is a state transition on the Recovery (9.3 was told to model it), so an unapproved Recovery is visible and countable but excluded from authorised totals in 10.2.
- Multi-currency thresholds: the threshold is per currency or per Property currency — decide, state it, and refuse an ambiguous comparison rather than converting.

**Testing.** Threshold boundary for two roles. Unapproved Recovery excluded from authorised totals. Approval recorded with approver and timestamp. Escalation of a pending approval using the shared saga, asserted to be the shared one. Currency-comparison rule asserted.

### Project Structure Notes

Extends `core/incident/` (authorisation states) and reuses `app/sagas/escalation` from 3.8/5.2.

### References

- [Source: planning-artifacts/epics.md#Story 9.4]
- [Source: prd.md#FR-43], [#FR-42], [#FR-81], [#FR-66]
- [Source: ARCHITECTURE-SPINE.md#AD-8], [#AD-9]

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
