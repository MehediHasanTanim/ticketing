# Story 5.4: Respect quiet hours without burying an emergency

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 5: Escalation and notification routing. -->

## Story

As an **off-shift engineer**,
I want routine work to wait for my shift while a guest emergency still reaches me,
So that quiet hours are respected without becoming a safety problem.

## Acceptance Criteria

**Given** Property-configured shift and quiet-hour rules
**When** routine work is dispatched or escalated outside a recipient's shift
**Then** they are not paged, and the routing falls to whoever is on shift (FR-68).

**Given** a guest-impacting fast-path Job (FR-36)
**When** it is dispatched or escalates during quiet hours
**Then** quiet hours are overridden, the notification is delivered, and the override is logged (FR-68).

**Given** a Property with no shift configuration
**When** an event occurs
**Then** routing falls to the Department default rather than to no one (FR-68).

## Tasks / Subtasks

- [ ] **T1. Off-shift staff are not paged for routine work** (AC: 1)
  - [ ] Property-configured shift and quiet-hour rules mean routine dispatch and escalation outside a recipient's shift do not page them; routing falls to whoever is on shift.
- [ ] **T2. The fast path overrides, and says so** (AC: 2)
  - [ ] A guest-impacting fast-path Job (3.11) delivered during quiet hours **overrides** them, and the override is **logged**.
- [ ] **T3. No configuration falls to the Department default** (AC: 3)
  - [ ] A Property with no shift configuration routes to the Department default, never to no one (5.1's anti-silence guard).

## Dev Notes

**Prerequisites:** 5.1, 5.2, 5.3, 3.11 (the fast-path flag).

**Scope guards.** Shift and quiet-hour routing plus the fast-path override. Not roster management (a shift is configuration here, and the roster import in 1.10 supplies people, not shifts). Not suppression (5.3).

**Two independent reasons not to send, and they compose.** Suppression (5.3) says the notification is no longer actionable; quiet hours say this person should not be woken for it. A Job can be both suppressed and quiet-hours-blocked; a fast-path Job can be quiet-hours-exempt but still suppressed if someone already accepted it. Model them as separate predicates over one intent, and test the combinations — collapsing them into one flag produces exactly the wrong answer in the fourth quadrant.

**Implementation notes.**
- "Falls to whoever is on shift" needs a shift model. Keep it simple and Property-configured (recurring windows per Department/role); do not build rostering.
- Overrides are logged with actor, Job and reason (1.11). An override that is not logged is indistinguishable from a bug in the quiet-hours rule.
- Quiet hours are evaluated in the **Property's timezone**, not UTC and not the recipient's device timezone (AD-2's presentation rule).

**Testing.** Four-quadrant matrix over (suppressed × quiet-hours) with a fast-path and a routine Job. Timezone test across a Property whose quiet hours straddle midnight UTC. Unconfigured Property falls back with a non-empty recipient set. Override logged.

### Project Structure Notes

Extends `core/notification/` with a shift/quiet-hours predicate alongside suppression — two predicates, one intent, one evaluation point (AD-8).

### References

- [Source: planning-artifacts/epics.md#Story 5.4]
- [Source: prd.md#FR-68], [#FR-36], [#FR-65], [#FR-67]
- [Source: ARCHITECTURE-SPINE.md#AD-8], [#AD-2]

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
