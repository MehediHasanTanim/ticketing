# Story 3.2: Move a Request through its lifecycle

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **department supervisor**,
I want every state change on a Request recorded with who did it and when,
So that "what happened to this job" is answerable from the record rather than from memory.

## Acceptance Criteria

**Given** a Request
**When** it moves logged → dispatched → accepted → in progress → completed → closed
**Then** each transition records actor and timestamp as an event, and the sequence is the source of the Job's state (FR-10, AD-1).

**Given** any state
**When** an illegal transition is attempted through any interface
**Then** it is refused server-side with the current state named.

**Given** a Request before completion
**When** a permitted user cancels it
**Then** a reason is required and recorded, and the Request cannot be cancelled after completion.

**Given** a Catalog Entry with required completion fields
**When** completion is attempted without them
**Then** completion is refused and the missing fields are named (FR-10).

## Tasks / Subtasks

- [ ] **T1. The lifecycle, as events** (AC: 1)
  - [ ] logged then dispatched then accepted then in progress then completed then closed. Each transition records actor and timestamp as an event, and **the sequence is the source of state** (AD-1).
- [ ] **T2. Illegal transitions refused** (AC: 2)
  - [ ] Refused server-side with the current state named. Test every illegal pair, not a sample.
- [ ] **T3. Cancellation with a reason** (AC: 3)
  - [ ] Cancellable from any state **before completed**, reason required and recorded. Not cancellable after completion.
- [ ] **T4. Completion requires the configured fields** (AC: 4)
  - [ ] Completion refused without the Catalog Entry's required fields — which may include a photo — and the missing fields are named.
  - [ ] Read the requirement from the **bound** configuration version, not the current one.

## Dev Notes

**Prerequisites:** 3.1, 1.8.

**Scope guards.** Transitions and their guards. Not the clock (3.4), not escalation (3.6/3.8), not assignment (3.5). Shared by WorkOrders from 8.1 and by closure-quality rules in 8.3 — so keep the required-fields check **data-driven**, or 8.3 becomes a second implementation.

**Implementation notes.**
- Express the state machine as a transition table in `core/job` and derive both the guard and the interface's available-actions list from it. Two lists is how a button appears for a transition the server refuses (AD-11's exact failure mode).
- Required-field validation must name fields from configuration, never from code. 8.3 adds root cause and photo requirements to the same mechanism.
- Reassignment (3.5) and room moves (2.5) both mutate a Job without a lifecycle transition — make sure the table does not treat every change as a state change.

**Testing.** Exhaustive illegal-transition matrix. Cancellation permitted before completion and refused after. Completion refused with each missing required field, using two different Catalog Entry configurations. Bound-version test: change the required fields after creation, assert the Job still uses its bound set.

### Project Structure Notes

Extends `core/job/` (transition table, guards), `app/job/` (handlers). The available-actions projection is what both clients read.

### References

- [Source: planning-artifacts/epics.md#Story 3.2]
- [Source: prd.md#FR-10], [#FR-37] (the same mechanism later), [#FR-6]
- [Source: ARCHITECTURE-SPINE.md#AD-1], [#AD-9], [#AD-11]

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
