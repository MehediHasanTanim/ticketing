# Story 5.2: Configure escalation chains with an interval per step

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 5: Escalation and notification routing. -->

## Story

As a **property administrator**,
I want ordered chains by role with my own intervals,
So that escalation matches how this property is actually staffed at night.

## Acceptance Criteria

**Given** a Department
**When** I define an Escalation chain
**Then** it is an ordered list of roles, each step carrying its own interval (FR-66).

**Given** one chain
**When** it is applied
**Then** it serves both non-acceptance (FR-11) and Breach (FR-14) with **separately configurable** intervals for each (FR-66).

**Given** a chain that reaches its final step
**When** the Job is still not accepted or closed
**Then** it holds at the final role and continues to remind, rather than stopping silently (FR-66).

**Given** a Job with a bound configuration version
**When** the chain is edited mid-life
**Then** that Job continues to use the version it was bound to, including for later escalation steps (AD-9).

## Tasks / Subtasks

- [ ] **T1. Ordered roles with per-step intervals** (AC: 1)
  - [ ] A chain is an ordered list of roles per Department, **each step carrying its own interval**.
- [ ] **T2. One chain, two triggers, separate intervals** (AC: 2)
  - [ ] The same chain serves non-acceptance (3.6) and Breach (3.8) with **separately configurable** intervals for each.
- [ ] **T3. The end of the chain is not the end of the reminders** (AC: 3)
  - [ ] A chain reaching its final step **holds at the final role and continues to remind**, rather than stopping silently.
- [ ] **T4. Bound version governs a running Job** (AC: 4)
  - [ ] Editing a chain mid-life does not change a Job already bound to an earlier version, including for later escalation steps (AD-9).

## Dev Notes

**Prerequisites:** 1.9 (chain structure), 3.6, 3.8 (the triggers), 5.1.

**Scope guards.** Chain configuration and traversal intervals. The breach derivation is 3.8's, the window derivation is 3.6's; this story supplies the intervals and the hold behaviour.

**T3 is the requirement that makes escalation trustworthy.** A chain that ends quietly means a breached Job with a sleeping duty manager and no further signal — the failure mode the whole escalation feature exists to prevent. "Holds at the final role and continues to remind" must be implemented as an explicit terminal state, not as an off-by-one at the end of a loop.

**Implementation notes.**
- Two interval sets on one chain is the shape FR-66 requires; 1.9 was told to model it so no schema change is needed here. Verify that before starting.
- The reminder cadence at the final step needs a bound in practice — reuse the coalescing window from 5.3 rather than inventing a second throttle, or the final role gets paged every interval forever.
- The saga holds only "last step notified"; the decision to continue re-derives from the Job's live state, so acceptance between steps stops the chain without a race (3.8).

**Testing.** Three-role chain traversal with distinct intervals per step, fake clock. Non-acceptance and Breach on the same chain using different intervals. Final-step hold asserted over several intervals, with coalescing applied. Mid-Job chain edit leaving the bound version in force.

### Project Structure Notes

Extends `core/escalation/` (intervals, terminal hold), `app/sagas/escalation` from 3.8. One saga, not two.

### References

- [Source: planning-artifacts/epics.md#Story 5.2]
- [Source: prd.md#FR-66], [#FR-11], [#FR-14], [#FR-67]
- [Source: ARCHITECTURE-SPINE.md#AD-8], [#AD-9]

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
