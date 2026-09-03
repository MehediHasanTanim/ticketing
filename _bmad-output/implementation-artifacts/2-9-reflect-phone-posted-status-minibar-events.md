# Story 2.9: Reflect phone-posted status and minibar events

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **housekeeping supervisor**,
I want a status posted from a room phone to behave exactly like one posted in the app,
So that attendants who use the handset in the room are not a second class of data.

## Acceptance Criteria

**Given** a room-status code posted through a room phone and reported by Jazz Core
**When** it is ingested
**Then** it is treated identically to an in-app status change for synchronisation (FR-50) and conflict resolution (FR-51), with its origin recorded (FR-56).

**Given** a minibar posting reported by Jazz Core
**When** it is ingested
**Then** it attaches to the Stay and is visible on the Stay timeline
**And** JazzTicketing records it and never posts financially — that stays a Jazz Core/PMS function (FR-56).

## Tasks / Subtasks

- [ ] **T1. Phone-posted room status is not a second class of data** (AC: 1)
  - [ ] A room-status code posted through a room phone and reported by Jazz Core is treated **identically** to an in-app status change for synchronisation (2.6) and conflict resolution (2.7).
  - [ ] Record its origin (`phone`) so reporting can distinguish channel without changing behaviour.
- [ ] **T2. Minibar postings attach to the Stay** (AC: 2)
  - [ ] Ingested minibar postings attach to the Stay and appear on the Stay timeline.
  - [ ] **JazzTicketing records, never posts.** No financial posting path exists here — that stays a Jazz Core/PMS function.

## Dev Notes

**Prerequisites:** 2.1, 2.5, 2.6, 2.7. Capability-gated by 2.3 (a Property whose Jazz Core does not report phone events shows nothing).

**Scope guards.** Ingestion and equivalence. No new status semantics, no financial behaviour, no minibar billing, no charge posting — §5 non-goals.

**Implementation notes.**
- "Treated identically" means the phone-posted change goes through the same `core/room` writing owner and the same conflict function. If it needs its own branch, the branch is the bug.
- Minibar data is Stay-attached and therefore governed by DG-1's ingestion filter (2.5). Store the item and quantity if permitted; do not accumulate a guest spending profile.
- Origin belongs on the event, not in a side table, so 1.11's audit trail and any later channel report read one source.

**Testing.** Same-payload equivalence test: apply a status change via app and via phone origin, assert identical resulting state and identical conflict behaviour. Minibar posting appears on the Stay. Assert no code path can trigger a financial post.

### Project Structure Notes

Extends `adapters/jazzcore/` ingestion and `core/stay/`. No new aggregate.

### References

- [Source: planning-artifacts/epics.md#Story 2.9]
- [Source: prd.md#FR-56], [#FR-50], [#FR-51], [#§5 Non-Goals]
- [Source: ARCHITECTURE-SPINE.md#AD-6], [#AD-10], [#AD-13]

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
