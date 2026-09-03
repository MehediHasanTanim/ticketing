# Story 7.6: Inspect a room and reject it back with evidence

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **housekeeping supervisor**,
I want to inspect against our checklist and send a room back with photos,
So that a rejection is specific rather than a conversation.

## Acceptance Criteria

**Given** the Property's Inspection checklist, scored or pass/fail
**When** I inspect a completed Room
**Then** I can pass or reject it against those items (FR-24).

**Given** a rejection
**When** I record it with notes and photos
**Then** the Room re-enters the originating attendant's board **ahead of unstarted Rooms**, flagged with those notes and photos (FR-24).

**Given** inspection outcomes over a period
**When** reporting is produced
**Then** they are reportable by attendant and by supervisor (FR-24).

## Tasks / Subtasks

- [ ] **T1. Inspect against the Property's checklist** (AC: 1)
  - [ ] Pass or reject a completed Room against the checklist from 1.9, whose items may be scored or pass/fail.
- [ ] **T2. Rejection returns the Room with evidence, ahead of unstarted work** (AC: 2)
  - [ ] Notes and photos attached; the Room **re-enters the originating attendant's board ahead of unstarted Rooms**, flagged.
- [ ] **T3. Reportable both ways** (AC: 3)
  - [ ] Inspection outcomes reportable **by attendant and by supervisor**.

## Dev Notes

**Prerequisites:** 7.3 (a completed Room), 1.9 (checklists), 4.5 (photos).

**Scope guards.** Inspection and rejection. Not the Inspected room state's definition (2.1), not checklist configuration (1.9), not attendant performance reporting beyond outcomes.

**"By attendant and by supervisor" is deliberate and slightly uncomfortable.** Rejection rates say something about the attendant *and* about the inspector — a supervisor who rejects nothing and one who rejects everything are both signals. Report both dimensions; do not build a one-sided quality metric.

**Implementation notes.**
- Priority re-entry (T2) interacts with 7.2's ordering and any manual pin. Define the precedence explicitly: pinned, then rejected, then departure priority, then the rest — and put it in the one ordering function so the board cannot disagree with itself.
- Only a supervisor may set Inspected (7.3's restriction). Inspection is the path by which that state is legitimately reached.
- Rejection evidence is photos plus notes; the attendant must see them on the room card, not in a separate inbox.

**Testing.** Pass and reject against both checklist item types. Rejected Room's board position asserted against unstarted and pinned rooms. Evidence visible on the attendant's card. Reporting by both dimensions. Attendant cannot set Inspected directly (still green from 7.3).

### Project Structure Notes

Extends `core/housekeeping/` (inspection outcome), `core/room` (the Inspected transition, through its owner), `app/housekeeping/inspection`. Ordering precedence lives in the single ordering function from 7.2.

### References

- [Source: planning-artifacts/epics.md#Story 7.6]
- [Source: prd.md#FR-24], [#FR-21], [#FR-62]
- [Source: ARCHITECTURE-SPINE.md#AD-13], [#AD-11]

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
