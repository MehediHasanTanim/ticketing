# Story 2.10: Report a Room Status discrepancy

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **room attendant**,
I want to report that a room's real condition does not match what the system says, without changing occupancy myself,
So that a sleep or a skip reaches the front desk instead of being silently overwritten.

## Acceptance Criteria

**Given** a Room whose actual condition differs from the held status
**When** I report a discrepancy
**Then** I choose from a Property-configurable set covering at minimum occupied-shown-vacant (sleep), vacant-shown-occupied (skip) and bed-not-slept-in (FR-79)
**And** occupancy is not mutated by my report; it stays Jazz Core-authoritative (FR-51).

**Given** a filed discrepancy
**When** it is committed
**Then** it appears in the Front Office queue and in my supervisor's queue, and on both the Stay and the Room's history
**And** push delivery of it follows the routing rules Epic 5 configures once those exist; the queue appearance does not depend on them.

**Given** a discrepancy raised with no connectivity
**When** the device syncs
**Then** it carries the time it was **observed**, not the time it synced (FR-79, FR-58, AD-2).

**Given** a period and a Property
**When** occupancy discrepancies are reported on
**Then** a daily count is available, because a rising count is a front-desk process problem rather than a housekeeping one.

## Tasks / Subtasks

- [ ] **T1. Discrepancy types, Property-configurable** (AC: 1)
  - [ ] Cover at minimum occupied-shown-vacant (sleep), vacant-shown-occupied (skip) and bed-not-slept-in; the set is Property-configurable.
- [ ] **T2. Reporting never mutates occupancy** (AC: 1)
  - [ ] Filing a discrepancy records an observation. **Occupancy is untouched** and stays Jazz Core-authoritative (2.7, AD-6).
  - [ ] Add a test that fails if the discrepancy path writes an occupancy change.
- [ ] **T3. Routing by queue, not by push** (AC: 2)
  - [ ] The discrepancy appears in the **Front Office queue** and the **reporter's supervisor's queue**, and on both the Stay and the Room's history.
  - [ ] Push delivery follows Epic 5's routing rules once they exist; queue appearance must not depend on them.
- [ ] **T4. Offline carries the observation time** (AC: 3)
  - [ ] A discrepancy raised offline queues per FR-58 and carries the time it was **observed**, not the time it synced (AD-2).
- [ ] **T5. Daily count per Property** (AC: 4)
  - [ ] Occupancy discrepancies reportable as a daily count, because a rising count is a front-desk process problem rather than a housekeeping one.

## Dev Notes

**Prerequisites:** 2.1, 2.5, 2.7. The offline criterion (T4) is fully exercised once Story 4.3 exists; until then test it against the queue contract.

**Scope guards.** The discrepancy record and where it lands. Not occupancy correction — that is the front desk's job in the PMS, and this story deliberately gives staff a way to report without the authority to change. Not notification routing (5.1).

**Why this FR exists.** It was added late (FR-79) because the room-status model gave an attendant no way to say "someone slept in this vacant room" without either lying about occupancy or doing nothing. The design answer is an observation with a route, and the invariant in T2 is what keeps AD-6 intact.

**Implementation notes.**
- `Discrepancy` is the glossary term — use it verbatim in code (`DiscrepancyFiled`), never "issue" or "exception".
- The daily count is per Property per type. Emit it as a projection so 10.1's GM dashboard can drill into it later without a new query path.
- Queue appearance for two different roles from one record: model the record once and let each queue's read model select it. Do not write two rows.

**Testing.** Type-set configurability. Occupancy-immutability test (T2). Both queues receive it from one record. Offline observation-time test with a fake clock and a delayed sync. Daily count over a fixture spanning a date boundary in Property timezone.

### Project Structure Notes

New: `core/room/discrepancy` (the event and rules — it belongs to the Room aggregate's writing owner, per AD-13), `app/discrepancy` read models.

### References

- [Source: planning-artifacts/epics.md#Story 2.10]
- [Source: prd.md#FR-79], [#FR-51], [#FR-58], [#§3 Glossary "Discrepancy"]
- [Source: ARCHITECTURE-SPINE.md#AD-2], [#AD-6], [#AD-13]

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
