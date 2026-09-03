# Story 4.4: See what happened when a sync conflicted

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want to be told when my queued action lost to someone else's change and what won,
So that I do not repeat work or believe a completion that was moved.

## Acceptance Criteria

**Given** a queued action that conflicts with a server-side change
**When** the queue drains
**Then** it resolves by the documented rule for that intent type — a supervisor's reassignment beats a queued start; a completion is never lost and lands on the reassigned Job (FR-59, AD-7).

**Given** a resolved conflict
**When** it is resolved
**Then** both the affected Staff Member and their supervisor can see that a conflict occurred and what won (FR-59).

**Given** the per-intent conflict rules
**When** CI runs
**Then** they are verified as a suite that gates the release, not as a per-story assertion (AD-7).

**Given** the same action synced twice after a retry
**When** the server receives it
**Then** it is idempotent on `(tenant_id, property_id, staff_member_id, client_key)` and creates no duplicate (AD-7).

## Tasks / Subtasks

- [ ] **T1. Documented rules per intent type** (AC: 1)
  - [ ] Resolution by the documented rule for that intent: **a supervisor's reassignment beats a queued start; a completion is never lost and lands on the reassigned Job.**
- [ ] **T2. Visible to both sides** (AC: 2)
  - [ ] The affected Staff Member **and** their supervisor can see that a conflict occurred and what won.
- [ ] **T3. The rules are a release gate** (AC: 3)
  - [ ] The per-intent conflict rules are verified as a suite that gates the release, not as a per-story assertion (AD-7, and the gate list in epics.md).
- [ ] **T4. Idempotent on retry** (AC: 4)
  - [ ] The same action synced twice creates no duplicate — idempotent on `(tenant_id, property_id, staff_member_id, client_key)`.

## Dev Notes

**Prerequisites:** 4.3, 3.5 (reassignment), 3.2.

**Scope guards.** Deterministic resolution and its visibility. Not the queue itself (4.3), not room-status conflicts with Jazz Core (2.7 — a different conflict between two systems rather than two humans).

**"Never silently discarded" is the same promise as 2.7, for the same reason.** An attendant whose completion vanished stops trusting the handset, and SM-3 (mobile adoption above 80% by day 30) is the metric most exposed by having no design partner. Both sides seeing the resolution is what keeps the trust.

**Implementation notes.**
- Enumerate intent types and write the rule table as **data in `contracts/`**, so the suite and the implementation read one source and the rules are reviewable by a non-engineer.
- "A completion lands on the reassigned Job" means the intent references the **Job**, not the assignment. If your intent envelope carries an assignment id, this rule cannot be honoured.
- Surface the resolution as an event on the Job so 1.11's audit trail picks it up automatically.
- Out-of-order arrival is normal: fold over `occurred_at`, and never let insertion order decide an outcome.

**Testing.** Rule-table suite covering every intent type, run in CI as a gate with a negative control. Reassignment-beats-start and completion-never-lost scenarios end to end. Duplicate-sync idempotency. Both-sides visibility asserted from two different roles' read models.

### Project Structure Notes

`contracts/conflict-rules/` (the table + fixtures), `core/job` (resolution — pure), `edge/sync` application. The client displays the outcome; it never decides it.

### References

- [Source: planning-artifacts/epics.md#Story 4.4], [#Cross-cutting requirements that are release gates]
- [Source: prd.md#FR-59], [#FR-58], [#FR-9], [#§13 SM-3]
- [Source: ARCHITECTURE-SPINE.md#AD-7], [#AD-2]

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
