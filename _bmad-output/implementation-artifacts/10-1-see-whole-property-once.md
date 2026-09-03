# Story 10.1: See the whole property at once

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 10: Full reporting and evidence. -->

## Story

As a **general manager**,
I want one view across departments,
So that I can run the morning meeting from the product rather than from five people's notes.

## Acceptance Criteria

**Given** my Property
**When** I open the operations dashboard
**Then** I see open Jobs, breaches, Rooms not ready against arrivals, OOO/OOS count and open Glitches across Departments (FR-70).

**Given** any figure on it
**When** I select it
**Then** it drills to the underlying records within my scope (FR-70).

**Given** the dashboard
**When** it renders
**Then** it names its own data freshness, and a stale Jazz Core-sourced figure names the last successful exchange (FR-70, UX-DR-5).

**Given** every SLA figure shown
**When** it is computed
**Then** it comes from the single SLA fold (AD-14).

## Tasks / Subtasks

- [ ] **T1. Cross-department, one view** (AC: 1)
  - [ ] Open Jobs, breaches, **Rooms not ready against arrivals**, OOO/OOS count, open Glitches.
- [ ] **T2. Every figure drills** (AC: 2)
  - [ ] Selecting a figure reaches the underlying records within the requester's scope.
- [ ] **T3. It names its own freshness** (AC: 3)
  - [ ] And a stale Jazz Core-sourced figure names the last successful exchange (UX-DR-5, 2.13).
- [ ] **T4. Every SLA figure from the one fold** (AC: 4)

## Dev Notes

**Prerequisites:** 6.1 (the dashboard pattern), 3.4, 7.x (rooms and arrivals), 8.7 (recurring flags), 9.5 (unreviewed Glitches). Epic 10 is **R4**.

**Scope guards.** The GM's Property-wide view. Department dashboards are 6.1; reports are 10.2 and 8.10; exports are 10.3.

**"Rooms not ready against arrivals" is the number a GM actually opens this for.** It joins housekeeping progress (7.9), occupancy from Jazz Core (2.5) and arrival demand (7.2) — three sources with three freshness profiles. Which is why T3 is a requirement and not a nicety: a "12 rooms not ready" figure computed from arrivals that stopped updating an hour ago is worse than no figure. Name the freshness of each contributing source, or name the oldest.

**Implementation notes.**
- Assemble from existing projections; introduce no new arithmetic. This story is composition, and every number it shows already has an owner (6.1, 7.9, 8.7, 9.5, 3.4).
- Drill-through must respect scope server-side (AD-11) — a GM's scope is the Property, and the drill query must not widen it.
- Unreviewed Glitches (9.5) and recurring-fault flags (8.7) both surface here; both were designed to age into this view.
- Incomplete-data marks (6.3) travel with the figures.

**Testing.** Each tile against a fixture, with drill-through asserted to the right records. Freshness naming with one stale source. Scope refusal on a widened drill query. Agreement with 6.1 and 6.2 over one fixture — the AD-14 discipline applied at the third reader.

### Project Structure Notes

`app/reporting/property-dashboard` composing existing projections. No new aggregate, no new arithmetic.

### References

- [Source: planning-artifacts/epics.md#Story 10.1]
- [Source: prd.md#FR-70], [#FR-69], [#FR-33], [#FR-44], [#FR-74]
- [Source: ARCHITECTURE-SPINE.md#AD-14], [#AD-11]
- [Source: EXPERIENCE-WEB.md] GM surfaces

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
