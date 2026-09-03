# Story 7.4: Raise a fault without leaving the room card

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **room attendant**,
I want to photograph a broken thing and move on,
So that reporting it does not cost me the room I am cleaning.

## Acceptance Criteria

**Given** a Room card
**When** I raise a Fault with a photo and short description
**Then** a reactive Work Order is created carrying the Room, the photo and me as the reporter (FR-22, FR-30).

**Given** the created Work Order
**When** its lifecycle proceeds
**Then** my Room flow is not blocked by it at any point (FR-22).

**Given** no connectivity
**When** I raise the Fault
**Then** it queues with its photo and applies on reconnection (FR-58, FR-62).

## Tasks / Subtasks

- [ ] **T1. Fault to Work Order, from inside the room card** (AC: 1)
  - [ ] A Fault with a photo and short description creates a reactive Work Order carrying the Room, the photo and the reporting Staff Member (8.1's aggregate).
- [ ] **T2. The Work Order never blocks the room flow** (AC: 2)
  - [ ] The attendant's Room flow is unblocked at every point of the Work Order's lifecycle.
- [ ] **T3. Offline with its photo** (AC: 3)
  - [ ] Queues with the photo and applies on reconnection (4.3, 4.5).

## Dev Notes

**Prerequisites:** 7.3, 4.5 (photos), **and `core/job`'s WorkOrder shape**. Note the sequencing wrinkle: Epic 7 is R2 and Epic 8 is R3, so this story creates the **first** WorkOrder in the product. Either 8.1's aggregate work lands here (recommended, since `core/job` already exists from 3.1 and a WorkOrder is the same aggregate with a different origin) or this story is blocked on 8.1. Raise it at planning; do not silently build a Fault-specific record that 8.1 then has to migrate.

**Scope guards.** Raising the Fault and its non-blocking guarantee. The engineer's side of the Work Order is Epic 8. Do not build engineering queues here.

**Implementation notes.**
- Reuse `core/job` with a WorkOrder origin. Work Orders and Requests share lifecycle states, SLA behaviour and escalation (FR-30) — a separate Fault entity is the wheel-reinvention this plan's story files exist to prevent.
- Non-blocking means no synchronous dependency in either direction: the room can complete with an open Work Order, and the Work Order survives the room being reassigned (7.5 preserves raised Faults).
- The photo is required in practice for an engineer to triage; make it required by the Catalog Entry's configuration (1.8) rather than hard-coding it.

**Testing.** Fault creates a Work Order with Room, photo and reporter. Room completes with the Work Order still open. Room reassigned (7.5) preserves the Fault. Offline Fault with photo. Assert no Fault-specific aggregate exists.

### Project Structure Notes

`clients/mobile` room card action → `app/job` create with WorkOrder origin. No new aggregate.

### References

- [Source: planning-artifacts/epics.md#Story 7.4]
- [Source: prd.md#FR-22], [#FR-30], [#FR-62], [#§3 Glossary "Work Order"]
- [Source: ARCHITECTURE-SPINE.md#AD-1]

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
