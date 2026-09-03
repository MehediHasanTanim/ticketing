# Story 3.5: Route a Request to candidates and let a supervisor override

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **department supervisor**,
I want a new request to reach the right people automatically and still be mine to redirect,
So that dispatch does not wait for me but never escapes me either.

## Acceptance Criteria

**Given** a new Request
**When** it is dispatched
**Then** candidates are selected by Department, role and current open-Job load — rule-based in v1, not skill-graph or predictive (FR-9)
**And** an unassigned Request appears in the Department queue where any eligible Staff Member can accept it.

**Given** a Request at any point in its lifecycle
**When** a supervisor reassigns it
**Then** the SLA Clock, history and attachments are preserved and the reassignment is recorded with actor and reason where configured (FR-9).

**Given** a Request assigned to a Staff Member
**When** a second Staff Member attempts to accept it
**Then** the attempt is refused and the current owner is named.

## Tasks / Subtasks

- [ ] **T1. Rule-based candidate selection** (AC: 1)
  - [ ] Candidates by Department, role and **current open-Job load**. `[ASSUMPTION]` v1 is rule-based only — not a skill graph, not predictive (§5).
  - [ ] An unassigned Request appears in the Department queue where any eligible Staff Member can accept it.
- [ ] **T2. Supervisor override at any point** (AC: 2)
  - [ ] Reassignment at any lifecycle point **preserves the SLA Clock, history and attachments**, and is recorded with actor and reason where configured.
- [ ] **T3. One owner at a time** (AC: 3)
  - [ ] A second Staff Member attempting to accept an assigned Request is refused and the current owner is named.

## Dev Notes

**Prerequisites:** 3.1, 3.2, 3.4, 1.3 (roles).

**Scope guards.** Routing and reassignment. Notification of candidates is Epic 5; the acceptance **window** is 3.6; the mobile accept action is 4.2. Do not build a skills model — the `[ASSUMPTION]` in FR-9 is the scope line and widening it is a PRD change.

**Implementation notes.**
- "Preserves the SLA Clock" is free if you did 3.4 correctly: the clock is a fold over events, so a reassignment event does not restart anything. If reassignment appears to need clock arithmetic, the fold is wrong.
- Reassignment also arrives from the offline path: 4.4's conflict rule says a supervisor's reassignment **beats** a queued start, and a completion is never lost — it lands on the reassigned Job. Design the reassignment event so that rule is expressible without special-casing.
- Open-Job load is a projection. Keep it cheap: 500 concurrent mobile sessions per Property (NFR-4) will read it constantly.
- Acceptance is a compare-and-set on the Job's owner, enforced in the domain. A read-then-write in the handler is a race that shows two attendants the same room.

**Testing.** Candidate selection over a fixture with uneven load. Reassignment at each lifecycle state, asserting clock, history and attachments intact. Concurrent-accept race test asserting exactly one winner and a named owner in the refusal. Unassigned Request visible to every eligible member and to no ineligible one.

### Project Structure Notes

Extends `core/job/` (assignment, acceptance CAS), `app/job/routing` (candidate rules — pure, table-driven so the rule set is inspectable).

### References

- [Source: planning-artifacts/epics.md#Story 3.5]
- [Source: prd.md#FR-9] and its `[ASSUMPTION]`, [#FR-59], [#§5 Non-Goals], [#§7 NFR-4]
- [Source: ARCHITECTURE-SPINE.md#AD-1], [#AD-7]

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
