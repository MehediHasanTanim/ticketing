# Story 5.3: Suppress what is no longer worth sending

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 5: Escalation and notification routing. -->

## Story

As a **room attendant**,
I want to stop being paged about work someone else already took,
So that I keep paying attention to the notifications that matter.

## Acceptance Criteria

**Given** a Job accepted before a queued notification is delivered
**When** delivery is attempted
**Then** other candidates are not notified (FR-67, FR-60).

**Given** repeated escalations on the same Job to the same recipient
**When** they occur inside the configured window
**Then** they coalesce into one notification (FR-67).

**Given** a Breach notification addressed to a management role
**When** suppression rules are evaluated
**Then** suppression **never** applies to it (FR-67).

**Given** the suppression contract
**When** it is evaluated
**Then** it is evaluated once, in the domain, and the delivery adapter makes no suppression decision of its own (AD-8).

## Tasks / Subtasks

- [ ] **T1. Accepted before delivery means no one else is told** (AC: 1)
  - [ ] A Job accepted before a queued notification is delivered does not notify other candidates (4.7).
- [ ] **T2. Coalesce repeats to the same recipient** (AC: 2)
  - [ ] Repeated escalations on the same Job to the same recipient coalesce inside the configurable window.
- [ ] **T3. Breach to management is never suppressed** (AC: 3)
  - [ ] Suppression **never** applies to Breach notifications to management roles. Encode it as an exemption in the contract, not a special case in a handler.
- [ ] **T4. Evaluated once, in the domain** (AC: 4)
  - [ ] The suppression contract is evaluated once in the domain; the delivery adapter makes **no** suppression decision of its own (AD-8).

## Dev Notes

**Prerequisites:** 5.1, 5.2, 4.7.

**Scope guards.** Suppression and coalescing. Not quiet hours (5.4 — a different reason not to send, with its own override), not channel selection (5.1).

**Why suppression is a product feature and not an optimisation.** The epic's own goal statement names the failure: a system that becomes noise staff learn to ignore. Every unnecessary push spends the credibility the escalation chain depends on. But over-suppression is worse in one specific place, hence T3: a breach that management never hears about is the whole product failing quietly.

**Implementation notes.**
- Suppression decisions are time-dependent — a notification queued at T and delivered at T+5s must be re-evaluated **at delivery**, against the Job's state then. Deciding at enqueue time is what lets an accepted Job still page four people.
- Because delivery-time evaluation is required, the adapter must ask the domain rather than decide. Keep it a query the adapter calls, and assert in a test that the adapter has no suppression branch of its own.
- Coalescing window is configuration (5.1's store), not a constant.

**Testing.** Accept-then-deliver race asserting no candidate notification. Coalescing over a burst of five escalations. Breach-to-management exemption asserted under conditions that would otherwise suppress. Adapter-has-no-decision test. Delivery-time re-evaluation test.

### Project Structure Notes

`core/notification/suppression` (pure, the single decision point), queried by `adapters/push|email|sms`.

### References

- [Source: planning-artifacts/epics.md#Story 5.3]
- [Source: prd.md#FR-67], [#FR-60], [#FR-14]
- [Source: ARCHITECTURE-SPINE.md#AD-8]

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
