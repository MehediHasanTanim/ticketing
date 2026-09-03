# Story 9.5: Assign a root cause and close the loop

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **department manager**,
I want to say why a failure happened and mark it reviewed,
So that the same failure is not rediscovered every month.

## Acceptance Criteria

**Given** a Glitch
**When** I assign a root cause from the configurable list and mark it reviewed
**Then** both are recorded with actor and timestamp (FR-44).

**Given** unreviewed Glitches older than the configurable age
**When** the GM's view loads
**Then** they are surfaced there (FR-44, FR-70).

**Given** a period and a Department
**When** reporting runs
**Then** root-cause distribution is reportable (FR-44, FR-73).

## Tasks / Subtasks

- [ ] **T1. Root cause from a configurable list, plus reviewed** (AC: 1)
  - [ ] Both recorded with actor and timestamp.
- [ ] **T2. Unreviewed ages into the GM's view** (AC: 2)
  - [ ] Glitches older than the configurable age surface on the GM's view (10.1).
- [ ] **T3. Distribution reportable** (AC: 3)
  - [ ] By Department and period (10.2).

## Dev Notes

**Prerequisites:** 9.1, 1.9 (the list), 10.1 or its projection for the GM surface.

**Scope guards.** Classification and review state. Not the Glitch itself (9.1), not linkage (9.2), not the report (10.2).

**The same pattern as 8.7's flag.** Review is an explicit human action with a record, and unreviewed items age into a more senior person's view rather than expiring. Two stories, one discipline: nothing important clears itself.

**Implementation notes.**
- Root cause here (a Glitch's cause) and root cause in 8.3 (a Work Order's cause) are **different vocabularies** for different aggregates. Do not share one list; do share the versioned-configuration mechanism.
- Reviewed is a state with an actor, not a boolean flag — 9.5's value is the audit that someone looked.
- The ageing threshold is Property configuration.

**Testing.** Root cause restricted to the configured list, versioned. Reviewed recorded with actor. Ageing boundary surfacing to the GM view. Distribution query by Department and period. Assert the two root-cause vocabularies are separate.

### Project Structure Notes

Extends `core/incident/` (root cause, review state), `app/incident/` read models.

### References

- [Source: planning-artifacts/epics.md#Story 9.5]
- [Source: prd.md#FR-44], [#FR-37], [#FR-70], [#FR-73]
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
