# Story 9.8: Keep a chain of custody

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **property administrator**,
I want every change of possession recorded immutably,
So that the register answers a legal question, not just an operational one.

## Acceptance Criteria

**Given** a Lost & Found Item
**When** it moves through found → stored → matched → returned or disposed
**Then** every change of possession or state is recorded with actor and timestamp (FR-47).

**Given** custody history
**When** it is read or exported
**Then** it is immutable and exportable (FR-47, FR-6).

**Given** a return
**When** it is recorded
**Then** the recipient and the release method are required (FR-47).

**Given** a disposal
**When** it is recorded
**Then** a reason is required and, above a configurable value, an approver (FR-47).

**Given** the retention and disposal timers in DG-2
**When** I open an item
**Then** its timers are visible on the item (FR-48).

## Tasks / Subtasks

- [ ] **T1. Every change of possession, recorded** (AC: 1)
  - [ ] found then stored then matched then returned or disposed — each with actor and timestamp.
- [ ] **T2. Immutable and exportable** (AC: 2)
  - [ ] Custody history immutable (1.11's storage guarantees) and exportable.
- [ ] **T3. Return requires recipient and release method** (AC: 3)
- [ ] **T4. Disposal requires a reason, and above a value an approver** (AC: 4)
  - [ ] Threshold configurable; approval reuses 9.4's routing.
- [ ] **T5. Retention timers visible on the item** (AC: 5)
  - [ ] Per DG-2, visible on the item itself.

## Dev Notes

**Prerequisites:** 9.7, 1.11 (immutability guarantees), 9.4 (approval routing to reuse).

**Scope guards.** The custody chain and its guards. Not matching (9.9), not the item's creation (9.7).

**Treat this as the story most likely to be read by a lawyer.** "Immutable and exportable" plus "recipient and release method" plus "an approver above a value" is a chain of custody, and its value is entirely in being complete and unalterable. Implement immutability at the storage layer as 1.11 did — append-only with UPDATE and DELETE revoked for the application role — not by omitting an edit endpoint.

**Implementation notes.**
- Reuse 9.4's approval saga for high-value disposal rather than writing a second approval path — the same reuse argument as 9.4 itself made about escalation.
- Retention timers are derived from the found date (9.7) and Tenant retention configuration (1.6). Show the computed date, not a countdown that a config change silently moves.
- Disposal is the one irreversible action in this aggregate. Require the reason, record the approver, and make the record survive the item.

**Testing.** Full chain through return and through disposal. Immutability attempt via API and via direct SQL as the application role. Return refused without recipient or release method. Disposal below and above the value threshold. Retention date correct across a Tenant retention change. Export completeness.

### Project Structure Notes

Extends `core/lostfound/` (custody events, guards) with storage constraints in `ops/` migrations. Approval via `app/sagas/escalation`.

### References

- [Source: planning-artifacts/epics.md#Story 9.8]
- [Source: prd.md#FR-47], [#FR-43], [#FR-48], [#§11 DG-2]
- [Source: ARCHITECTURE-SPINE.md#AD-1], [#AD-9]

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
