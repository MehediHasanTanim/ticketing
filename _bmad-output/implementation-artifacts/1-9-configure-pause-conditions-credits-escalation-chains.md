# Story 1.9: Configure Pause Conditions, Credits, Escalation chains and Inspection checklists

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property administrator**,
I want to configure the reasons work legitimately stops, what a room is worth, who gets escalated to, and what "clean" means here,
So that the property's own operating rules govern the product rather than a vendor's defaults.

## Acceptance Criteria

**Given** the versioned, effective-dated configuration mechanism established in Story 1.8
**When** I configure Pause Conditions, Credit values by Room type and clean type, Escalation chains, or Inspection checklists
**Then** each is stored as a versioned, effective-dated Property-scoped record with a Tenant-level default, using that same mechanism and adding no second one (AD-9).

**Given** a Catalog Entry
**When** I attach Pause Conditions to it
**Then** only those attached Pause Conditions will be offered to a Staff Member pausing a Job of that type (FR-13, FR-5).

**Given** a Pause Condition
**When** I set its maximum paused duration
**Then** a Job exceeding it re-escalates rather than remaining parked, and the maximum is Property-configurable (FR-13).

**Given** an Inspection checklist
**When** I define its items
**Then** items may be scored or pass/fail, and the checklist is Property-scoped (FR-5, FR-24).

**Given** a running Job bound to an earlier version of any of these
**When** I change the current version
**Then** that Job continues under the version it was bound to, including for later escalation steps (AD-9).

**Given** any change I make here
**When** it is saved
**Then** it is attributed to me with a timestamp (FR-5, FR-6).

## Tasks / Subtasks

- [ ] **T1. Reuse the mechanism, add none** (AC: 1)
  - [ ] Pause Conditions, Credit values by Room type and clean type, Escalation chains and Inspection checklists are each stored through the **versioned, effective-dated mechanism from Story 1.8**, Property-scoped with a Tenant default.
  - [ ] Explicit check in review: no second versioning path, no bespoke `updated_at` column on any of these.
- [ ] **T2. Pause Conditions attach to Catalog Entries** (AC: 2, 3)
  - [ ] Only the Pause Conditions attached to a Catalog Entry are offered to a Staff Member pausing a Job of that type (consumed by 3.7).
  - [ ] Maximum paused duration per Pause Condition; a Job exceeding it re-escalates rather than remaining parked.
- [ ] **T3. Credits** (AC: 1)
  - [ ] Credit values by Room type and clean type, consumed by Story 7.1's board generation and 7.5's recalculation.
- [ ] **T4. Escalation chains** (AC: 1)
  - [ ] Ordered role lists per Department. Story 5.2 owns the per-step intervals and the hold-at-final-role behaviour; this story stores the chain itself.
- [ ] **T5. Inspection checklists** (AC: 4)
  - [ ] Items may be scored or pass/fail; Property-scoped. Consumed by Story 7.6.
- [ ] **T6. Bound versions and attribution** (AC: 5, 6)
  - [ ] A running Job stays on the version it was bound to, including for later escalation steps.
  - [ ] Every change attributed with actor and timestamp.

## Dev Notes

**Prerequisites:** Story 1.8 — hard. If 1.8's resolution function does not exist, stop and build it there rather than improvising a second one here.

**Scope guards.** Configuration storage only. The behaviours that consume these values belong elsewhere and must not be pre-implemented: pausing is 3.7, escalation intervals and chain traversal are 5.2 and 3.8, board generation is 7.1, inspection is 7.6.

**Why this story exists separately.** It was split from 1.8 at Tanim's decision on 2026-09-02 for size. The split is deliberate about direction: 1.8 *establishes* the versioning mechanism, 1.9 *consumes* it. That is the whole reason the split is safe — AD-9 stays specified in one place.

**Implementation notes.**
- These four config types have different shapes but one lifecycle. Resist a shared "settings" table with a JSON blob: reporting needs to query Credits by Room type and Escalation chains by Department, and a blob makes both a scan.
- Escalation chains are configurable per Department (FR-14) and one chain serves both non-acceptance and Breach with **separately configurable intervals** (FR-66). Model the chain and its two interval sets so 5.2 does not need a schema change.

**Testing.** Reuse assertion: every one of the four types resolves through the 1.8 function (a test that fails if a new resolution path appears). Attachment test: a Job of type X is offered only X's Pause Conditions. Bound-version test across a chain edit mid-Job.

### Project Structure Notes

Extends `core/configuration/`. New: `core/housekeeping/credits` (values only — no board logic), `core/escalation/chain` (structure only — no traversal).

### References

- [Source: planning-artifacts/epics.md#Story 1.9], [#Findings raised, and how Tanim resolved them]
- [Source: prd.md#FR-5], [#FR-13], [#FR-14], [#FR-20], [#FR-24], [#FR-66]
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
