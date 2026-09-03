# Story 9.3: Record a Recovery

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **duty manager**,
I want what we gave the guest recorded against the failure,
So that the cost of service recovery is a known number.

## Acceptance Criteria

**Given** a Glitch
**When** I record a Recovery with type, value and currency
**Then** types come from the Property-configurable list — comp, discount, points, upgrade, amenity, other (FR-42).

**Given** recorded value
**When** reporting runs
**Then** it is reportable by Department, category and period, in minor units with an ISO-4217 code and no conversion in v1 (FR-42, FR-73).

**Given** v1 scope
**When** a Recovery is recorded
**Then** nothing is posted to a PMS folio or any financial system (FR-42, PRD §5).

## Tasks / Subtasks

- [ ] **T1. Record type, value and currency** (AC: 1)
  - [ ] Types from the Property-configurable list: comp, discount, points, upgrade, amenity, other.
- [ ] **T2. Reportable, in minor units, per currency** (AC: 2)
  - [ ] By Department, category and period; **minor units as integers plus an ISO-4217 code, no conversion in v1**.
- [ ] **T3. Records, never posts** (AC: 3)
  - [ ] **Nothing is posted to a PMS folio or any financial system** (§5).

## Dev Notes

**Prerequisites:** 9.1, 1.9 (the type list).

**Scope guards.** Recording a Recovery. Approval routing is 9.4; reporting is 10.2. The §5 boundary is absolute: no folio posting, no charge, no refund, no integration with a financial system. JazzTicketing records what the hotel gave; the hotel gives it.

**Implementation notes.**
- `Recovery` is the glossary term; the event is `RecoveryRecorded`. Points and upgrades have a value too — capture it in the Property's currency as an estimate, and make clear in the model that it is an estimate rather than a charge.
- "No conversion in v1" means a multi-property report shows totals **per currency**, side by side. Do not add a display-only conversion; someone will treat it as real.
- A Recovery is not authorised until it clears 9.4's threshold check — model an authorisation state now so 9.4 does not have to restructure the aggregate.

**Testing.** Each Recovery type recorded. Multi-currency reporting with no conversion. Minor-unit arithmetic (no floats). Assert no financial-posting code path exists. Authorisation state present and defaulting correctly.

### Project Structure Notes

Extends `core/incident/` (Recovery on the Glitch aggregate — one writing owner, AD-13).

### References

- [Source: planning-artifacts/epics.md#Story 9.3]
- [Source: prd.md#FR-42], [#FR-43], [#FR-73], [#§5 Non-Goals]
- [Source: ARCHITECTURE-SPINE.md#Consistency Conventions] (money), [#AD-13]

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
