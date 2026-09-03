# Story 2.7: Resolve a Room Status conflict by declared authority

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **property administrator**,
I want a conflicting room status resolved by a rule I can see, with the losing change kept,
So that no attendant's recorded work disappears and I can tell how often it happens.

## Acceptance Criteria

**Given** Jazz Core and JazzTicketing holding different status for the same Room
**When** the conflict is detected
**Then** it resolves by the configured authority rule, defaulting to Jazz Core-authoritative for occupancy and JazzTicketing-authoritative for cleanliness, Property-configurable (FR-51, AD-6).

**Given** a resolved conflict
**When** the losing side was a Staff Member's recorded action
**Then** that action is preserved and visible in the Room's history — a conflict is never resolved by discarding it without a record (FR-51).

**Given** conflict volume above the configured threshold
**When** the threshold is crossed
**Then** the property administrator is notified and the conflict count is reportable.

## Tasks / Subtasks

- [ ] **T1. Authority rule, configurable** (AC: 1)
  - [ ] Default: **Jazz Core-authoritative for occupancy, JazzTicketing-authoritative for cleanliness**, Property-configurable (AD-6).
  - [ ] Read the authority from the axis metadata Story 2.1 established; do not hard-code a direction.
- [ ] **T2. The losing change is never discarded** (AC: 2)
  - [ ] Where the losing side was a Staff Member's recorded action, that action is **preserved and visible** in the Room's history. A conflict is never resolved by discarding it without a record.
- [ ] **T3. Volume threshold notifies** (AC: 3)
  - [ ] Conflict volume above the configured threshold notifies the property administrator; conflict count is reportable.

## Dev Notes

**Prerequisites:** 2.1, 2.6.

**Scope guards.** Deterministic resolution of a detected conflict. Not detection plumbing (2.6), not discrepancy reporting (2.10 — which is a human saying the world disagrees with the record, not two systems disagreeing).

**The rule that protects the product's credibility.** An attendant who cleaned a room and watched the status flip back will stop using the handset, and SM-3 (line-staff adoption above 80%) is the metric most at risk in this plan because there is no design partner to catch it. "Never resolved by discarding a Staff Member's recorded action without a record of it" is therefore a product requirement, not a data-hygiene nicety.

**Implementation notes.**
- Resolution is a pure function of (our state, their state, authority rule) — put it in `core/room` and unit-test it exhaustively over the state matrix. Both axes, plus OOO/OOS, plus unknown.
- Preserve the loser as an event (`RoomStatusConflictResolved` carrying both sides and the winner), not as a log line. History must show it, and 1.11's audit trail must pick it up.
- Emit the conflict count as a first-class metric so 2.2's health and the reporting layer read the same number.

**Testing.** Full state-matrix table test of the resolution function. Attendant-action-loses case: assert the action is retrievable from Room history afterwards. Threshold notification. Property-level override of the default rule.

### Project Structure Notes

Extends `core/room/` (resolution function, conflict event) and `app/integration/sync`. The function must be callable from the offline reconciliation path in 2.13 without going through HTTP.

### References

- [Source: planning-artifacts/epics.md#Story 2.7]
- [Source: prd.md#FR-51], [#FR-19], [#§13 SM-3]
- [Source: ARCHITECTURE-SPINE.md#AD-6], [#AD-13]
- [Source: EXPERIENCE.md#Room Status Authority]

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
