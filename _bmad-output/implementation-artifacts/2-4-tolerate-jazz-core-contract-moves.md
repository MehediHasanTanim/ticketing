# Story 2.4: Tolerate a Jazz Core contract that moves

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **JazzTicketing engineer**,
I want the consumed Jazz Core contract pinned and version-tolerant,
So that a Jazz Core release ahead of or behind us degrades predictably instead of taking a property down.

## Acceptance Criteria

**Given** a pinned contract version per environment
**When** Jazz Core sends an unknown event type or an unknown field
**Then** it is ignored and counted, never fatal, and the occurrence is visible in health (FR-77).

**Given** a required capability that a Property's Jazz Core does not report
**When** the dependent feature would be used
**Then** it is already disabled with an explicit reason surfaced in health, rather than failing at the point of use (FR-77, FR-78).

**Given** the CI pipeline
**When** it runs
**Then** contract-level integration tests execute against a Jazz Core test environment, and a contract break fails the build (FR-77, OR-4).

## Tasks / Subtasks

- [ ] **T1. Pin the contract per environment** (AC: 1)
  - [ ] The consumed Jazz Core contract version is pinned per environment and recorded in health.
- [ ] **T2. Unknown is ignored and counted, never fatal** (AC: 1)
  - [ ] An unknown event type or field is ignored, counted, and the occurrence is visible in health. Never throw, never drop the whole batch.
- [ ] **T3. Missing capability fails early, not at point of use** (AC: 2)
  - [ ] A required capability a Property's Jazz Core does not report disables the dependent feature **in advance** with an explicit reason (2.3), rather than producing a runtime error when a user taps it.
- [ ] **T4. Contract tests in CI** (AC: 3)
  - [ ] Contract-level integration tests run against a Jazz Core test environment in CI; a contract break fails the build.

## Dev Notes

**Prerequisites:** 2.2, 2.3.

**Scope guards.** Version tolerance and contract testing. Not capability discovery (2.3), not degraded-mode operation (2.13).

**Blocked dependency to raise, not to work around.** A Jazz Core **test environment** for CI is part of Open Question 1 and is not yet agreed (owner: Tanim with the Jazz Core owner). If it does not exist when this story is picked up, implement T4 against a recorded-fixture double **and mark the story incomplete on T4** rather than deleting the criterion. A contract test against your own mock proves only that the mock agrees with itself.

**Implementation notes.**
- Tolerance is asymmetric: unknown **inbound** fields are ignored; unknown **outbound** requirements are a hard failure, because sending a payload Jazz Core cannot parse is not a degradation, it is a lost write. Do not implement one rule for both directions.
- Count ignored unknowns per type and surface them. A rising unknown-field count is the earliest signal that Jazz Core has moved ahead of the pin.
- The `retryable` flag in the error envelope is how the rest of the system decides whether to queue or surface. Map Jazz Core failures onto it deliberately.

**Testing.** Payloads with an unknown event type, an unknown field, a missing optional field and a missing required field — assert ignore/ignore/ignore/refuse. Pin mismatch surfaces in health. CI job present and failing on a deliberately broken contract fixture (the negative control pattern from Story 1.0).

### Project Structure Notes

Extends `adapters/jazzcore/`, `contracts/jazzcore/` (the pinned schema and recorded fixtures), `ops/` CI job.

### References

- [Source: planning-artifacts/epics.md#Story 2.4]
- [Source: prd.md#FR-77], [#FR-78], [#§8 OR-4], [#§14 Open Question 1]
- [Source: ARCHITECTURE-SPINE.md#AD-5], [#Consistency Conventions] (errors)

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
