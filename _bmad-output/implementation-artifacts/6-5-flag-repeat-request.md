# Story 6.5: Flag a repeat request

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 6: Manager visibility and guest follow-up. -->

## Story

As a **front office user**,
I want to know at the moment of logging that this room already asked for this today,
So that the second call gets treated as a failure rather than as a new job.

## Acceptance Criteria

**Given** a Location and Catalog Entry that produced a Request within the configurable window on the same Stay
**When** a new Request is created
**Then** it is flagged as a repeat, visible to me at creation and on the dispatched Job (FR-16).

**Given** repeat Requests
**When** reporting is produced
**Then** they are counted separately from first-time Requests (FR-16).

**Given** the detection window
**When** a property administrator changes it
**Then** the change is Property-scoped and applies to Requests created after it (FR-16, AD-9).

## Tasks / Subtasks

- [ ] **T1. Flag at creation and on the Job** (AC: 1)
  - [ ] Same Location and Catalog Entry within the configurable window **on the same Stay** flags the new Request as a repeat, visible to the creator at creation and on the dispatched Job.
- [ ] **T2. Counted separately** (AC: 2)
  - [ ] Repeat Requests counted separately from first-time Requests in reporting.
- [ ] **T3. Property-scoped window** (AC: 3)
  - [ ] The window is Property-configurable and applies to Requests created after a change (AD-9).

## Dev Notes

**Prerequisites:** 3.1, 3.3 (Stay reference), 1.8/1.9 (configurable window).

**Scope guards.** Detection and flagging. Not the Glitch that a repeat may deserve (9.1), not follow-up (6.4). A repeat flag is information at the point of logging, not an automatic escalation — though a Property may configure the fast path separately.

**Why "on the same Stay" matters.** Two guests in sequence asking for towels in the same room on the same day is not a repeat; the same guest asking twice is a service failure in progress. Keying on the Stay rather than the Room is what makes the flag mean something, and it depends on 3.3's Stay reference being present — including during a Jazz Core outage, when the Stay may be unavailable. Decide the fallback (no flag, rather than a wrong flag) and state it.

**Implementation notes.**
- Detection must run inside the creation path fast enough not to break 3.1's fifteen-second budget: index on (property, location, catalog_entry, stay, created_at).
- The flag is derived, not stored as truth — but caching it on the Job's projection is fine, since the window cannot retroactively change for an existing Job (AD-9).
- Surface it in the console at creation time (before save), which means the check runs on the draft, not only on the saved Request.

**Testing.** Window boundary triple. Same Room, different Stay: no flag. Stay unavailable: no flag, asserted. Separate counting in a report query. Latency inside the creation path. Window change applies only to later Requests.

### Project Structure Notes

`core/job/repeat` detection (pure), `app/dispatch` read path, `clients/console` create surface.

### References

- [Source: planning-artifacts/epics.md#Story 6.5]
- [Source: prd.md#FR-16], [#FR-7], [#FR-8], [#§6 UJ-5]
- [Source: ARCHITECTURE-SPINE.md#AD-9], [#AD-10]

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
