# Story 8.5: Take a room out of service from a Work Order

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As a **chief engineer**,
I want a room taken out of order from the job that requires it, and blocked from resale until that job is done,
So that a room under repair cannot be sold by accident.

## Acceptance Criteria

**Given** a Work Order requiring the Room out of service
**When** I set OOO or OOS from it with a reason and expected return date
**Then** the write-back path delivered in Story 2.8 submits it to Jazz Core and the outcome is displayed on this Work Order (FR-34, FR-52)
**And** no second submission path is introduced.

**Given** an open OOO-linked Work Order
**When** anyone attempts to return the Room to sale
**Then** it is refused, unless an explicit override is used — and that override is logged (FR-34).

**Given** the Work Order completes
**When** closure is recorded
**Then** the Room is returned to sale and the return is submitted to Jazz Core with its outcome visible (FR-34, FR-52).

## Tasks / Subtasks

- [ ] **T1. Set OOO/OOS from the Work Order, reusing 2.8's path** (AC: 1)
  - [ ] Reason and expected return date; **Story 2.8's write-back path** submits it and the outcome shows on this Work Order. **No second submission path.**
- [ ] **T2. The return-to-sale guard** (AC: 2)
  - [ ] While an OOO-linked Work Order is open, returning the Room to sale is refused **unless** an explicit override is used — and the override is logged.
- [ ] **T3. Closure returns the Room to sale** (AC: 3)
  - [ ] On closure the Room returns to sale, submitted to Jazz Core with its outcome visible.

## Dev Notes

**Prerequisites:** **2.8** (the write-back path, delivered in R1), 8.1, 8.3 (closure).

**Scope guards.** The Work Order origin for OOO/OOS and the resale guard. The submission mechanics, its three outcome states and the retry schedule are 2.8's and must not be reimplemented — epics.md's note on 2.8 says so explicitly and this story is where that promise is kept or broken.

**Why the guard has an override at all.** A room under repair that must be sold anyway is a real hotel decision (a full house, a guest already walked). The product's job is to make it deliberate and traceable, not impossible. Refuse by default, allow with an override, log the override — the same pattern as 3.11's unavailable-assignee and 5.4's quiet hours.

**Implementation notes.**
- Link the OOO state to the originating Work Order so the guard is a query on that link, not a heuristic over open Work Orders at the Location.
- Room state is written through `core/room`'s single owner (AD-13), as everywhere else.
- The expected-return-date sweep already exists from 2.8; this story adds the Work Order context to what the chief engineer sees.

**Testing.** Set OOO from a Work Order; assert the submission used 2.8's path (assert one submission implementation exists). Resale refused with the Work Order open; permitted with a logged override. Closure returns to sale with the outcome visible. Rejection from Jazz Core surfaces on the Work Order as a distinct state.

### Project Structure Notes

Extends `core/job/` (the OOO link) and reuses `app/integration/sync` from 2.8. Nothing new in `adapters/jazzcore/`.

### References

- [Source: planning-artifacts/epics.md#Story 8.5], [#Story 2.8]
- [Source: prd.md#FR-34], [#FR-52], [#FR-72]
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
