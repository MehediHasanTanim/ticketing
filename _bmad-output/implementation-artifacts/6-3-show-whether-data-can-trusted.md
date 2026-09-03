# Story 6.3: Show whether the data can be trusted

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 6: Manager visibility and guest follow-up. -->

## Story

As a **general manager**,
I want to see which departments are actually using the handsets,
So that I do not make a decision from a department's figures when half its staff never signed in.

## Acceptance Criteria

**Given** a rostered Department
**When** I open adoption reporting
**Then** I see daily active line staff as a percentage of rostered line staff, per Department (FR-74, SM-3).

**Given** a Department below the configured usage threshold
**When** its figures appear **anywhere** in reporting
**Then** they are marked as having incomplete data (FR-74).

**Given** that indicator
**When** any user attempts to hide or disable it
**Then** it cannot be turned off from within reporting (FR-74).

**Given** a feature disabled at a Property by Jazz Core capability absence
**When** adoption is computed
**Then** it is excluded rather than counted as non-adoption (FR-78).

## Tasks / Subtasks

- [ ] **T1. Daily active against rostered** (AC: 1)
  - [ ] Daily active line staff as a percentage of rostered line staff, per Department (SM-3).
- [ ] **T2. The mark travels with the figures** (AC: 2)
  - [ ] A Department below the configured usage threshold is marked as having incomplete data **wherever its figures appear** — dashboards, reports, exports, the evidence pack.
- [ ] **T3. It cannot be switched off** (AC: 3)
  - [ ] No user can hide or disable the indicator from within reporting. Not a permission, not a preference.
- [ ] **T4. Capability absence is not non-adoption** (AC: 4)
  - [ ] A feature disabled at a Property by Jazz Core capability absence is **excluded** rather than counted against adoption (2.3).

## Dev Notes

**Prerequisites:** 1.10 (roster gives the denominator), 4.1 (sign-ins give the numerator), 2.3 (capability state with period), 6.1/6.2.

**Scope guards.** Adoption and data-quality indication. Not the underlying dashboards, not the export mechanics (10.3 — but the mark must survive into them).

**Why the indicator cannot be disabled.** With no design partner, adoption is the metric most at risk in this plan — SM-3 targets above 80% daily active by day 30 and is explicitly flagged as the most exposed. A GM who reads a department's SLA figures without knowing half its staff never signed in will make a decision on fiction. The indicator is a truth-in-reporting control, so it is not a display option.

**Implementation notes.**
- Propagate the mark as **metadata on the figure**, not as a separate lookup the caller may forget. Then 10.3's export and pack inherit it by construction rather than by remembering.
- The denominator is rostered **line staff**, which requires the roster to say who is line staff — a real dependency on 1.10's role mapping.
- Capability exclusion needs capability state **with the period** (2.3 was told to store it that way); verify before building.

**Testing.** Threshold marking asserted in a dashboard read, a report, an export and a pack. Disable attempt refused through API and interface. Capability-absent Property excluded rather than penalised, across a period boundary where the capability appeared. Denominator correctness against a roster fixture.

### Project Structure Notes

`app/reporting/adoption`; the incomplete-data mark is a field on the reporting envelope in `contracts/` so every consumer carries it.

### References

- [Source: planning-artifacts/epics.md#Story 6.3]
- [Source: prd.md#FR-74], [#FR-78], [#FR-4], [#§13 SM-3]
- [Source: ARCHITECTURE-SPINE.md#AD-11]

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
