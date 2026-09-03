# Story 3.10: See every open Request for my scope

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **department manager**,
I want a live list of open work filtered the way I think about it,
So that I can act on the floor rather than read a report about yesterday.

## Acceptance Criteria

**Given** open Requests in my scope
**When** I open the view
**Then** I can filter by Department, status, SLA state and Location, sorted by urgency (FR-18).

**Given** a state change anywhere in my scope
**When** it occurs
**Then** the view reflects it within five seconds without a manual refresh (FR-18, NFR-3).

**Given** breaching and breached Jobs
**When** they appear in the list
**Then** they are visually distinct from within-target Jobs, and that distinction survives greyscale (UX-DR-1, NFR-6).

**Given** the current filter and scope
**When** I export the view
**Then** the export respects my Property and Department scope and is recorded in the audit trail (FR-18, FR-75).

## Tasks / Subtasks

- [ ] **T1. Filters that match how a manager thinks** (AC: 1)
  - [ ] Filter by Department, status, SLA state and Location, sorted by urgency, within the requester's scope.
- [ ] **T2. Live within five seconds** (AC: 2)
  - [ ] Any state change in scope is reflected within five seconds **without a manual refresh** (NFR-3), over the realtime channel 2.11 established.
- [ ] **T3. State without colour** (AC: 3)
  - [ ] Breaching and breached Jobs visually distinct from within-target ones, and the distinction **survives greyscale** (UX-DR-1, NFR-6).
- [ ] **T4. Export respects scope** (AC: 4)
  - [ ] Export honours the requester's Property and Department scope and is recorded in the audit trail (1.11, FR-75).

## Dev Notes

**Prerequisites:** 3.1–3.8, 1.11 (export recording), 2.11 or wherever the realtime channel landed first.

**Scope guards.** The dispatch working view. The Department **dashboard** with load distribution and staff workload is 6.1 — this story is the list a supervisor works from, not the analytics. FR-18 is owned here and consumed by E6, which is why 6.1 adds no criteria for it.

**Implementation notes.**
- Sorted by urgency means sorted by the fold's output, not by created-at. Compute urgency in the projection from the fold so the list order and the row's badge cannot disagree.
- Five-second liveness at 4,000 Jobs per Property per day peak (NFR-4) means pushing deltas over the channel, not polling a full list. Budget the payload.
- Greyscale is a real check, not a claim: render the list and verify state distinction with colour removed, at arm's length in low light. The rendered-and-greyscale-checked habit caught six real defects in the design phase.
- Density comes from `DESIGN.md`'s web console section; tokens only, no hard-coded hex.

**Testing.** Filter matrix. Liveness test asserting a state change appears within five seconds. Greyscale render check. Export scope test from three roles, plus the audit entry. Load test at the NFR-4 peak.

### Project Structure Notes

`app/dispatch/views` projections, `edge/realtime` subscription, `clients/console` list surface.

### References

- [Source: planning-artifacts/epics.md#Story 3.10], [#Ownership and consumption]
- [Source: prd.md#FR-18], [#FR-75], [#§7 NFR-3, NFR-4, NFR-6]
- [Source: DESIGN.md] web console density; [Source: EXPERIENCE-WEB.md] dispatch surfaces

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
