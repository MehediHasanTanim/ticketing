# Story 7.7: Run turndown as its own pass

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **housekeeping supervisor**,
I want an evening pass with its own credits and window,
So that turndown is planned work rather than an overwrite of the morning's record.

## Acceptance Criteria

**Given** a day with completed cleans
**When** I generate a turndown pass
**Then** it is a separate Room Assignment with its own Credits and time window (FR-25).

**Given** a Room with a completed clean
**When** its turndown is completed on the same date
**Then** both records exist independently and neither overwrites the other (FR-25).

## Tasks / Subtasks

- [ ] **T1. A separate pass with its own Credits and window** (AC: 1)
  - [ ] Turndown generates as a **separate RoomAssignment** with its own Credits and time window.
- [ ] **T2. Two completed records on one date** (AC: 2)
  - [ ] A Room may carry a completed clean **and** a completed turndown on the same date; neither overwrites the other.

## Dev Notes

**Prerequisites:** 7.1, 7.3.

**Scope guards.** Turndown as a second pass. No new room states, no new flow — turndown uses 7.3's attendant flow with a different assignment type.

**T2 is the trap.** The naive model stores "cleaned today" on the Room, which turndown then overwrites, destroying the day's cleaning record. The correct model is that completion belongs to the **RoomAssignment**, not to the Room — the Room carries status, the assignment carries the work record. If 7.1 modelled it that way, this story is small; if it did not, fix 7.1 rather than adding a turndown flag to the Room.

**Implementation notes.**
- Assignment type (`clean` | `turndown`) with its own Credit table entry from 1.9. Both types resolve Credits through the same arithmetic.
- The time window is the assignment's, and it does not create an SLA Clock — a RoomAssignment is not a Job (7.1's glossary note).
- Reporting must be able to distinguish the two passes per Room per date.

**Testing.** Same Room, same date, both passes completed, both records retrievable and distinct. Credit values differ by type. No SLA Clock created. Turndown generation does not disturb the day's board.

### Project Structure Notes

Extends `core/housekeeping/` with assignment type. No change to `core/room`.

### References

- [Source: planning-artifacts/epics.md#Story 7.7]
- [Source: prd.md#FR-25], [#FR-20], [#§3 Glossary "Room Assignment"]
- [Source: ARCHITECTURE-SPINE.md#AD-9]

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
