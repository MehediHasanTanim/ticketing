# Story 2.13: Keep working while Jazz Core is unavailable

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **front office user**,
I want to create, dispatch and close work during an upstream outage,
So that a Jazz Core problem is not a property-wide stoppage.

## Acceptance Criteria

**Given** Jazz Core is unreachable
**When** I sign in, create a Request, dispatch it, or close it
**Then** every one of those operations succeeds (FR-57)
**And** a Job created during the outage carries a marker that context was unavailable.

**Given** any surface that normally shows Stay or Jazz Core-sourced context
**When** that context is stale or unavailable
**Then** an explicit marker names the time of the last successful exchange, and no interaction is blocked by its presence (FR-57, UX-DR-5).

**Given** Room Status changes made locally during the outage
**When** Jazz Core recovers
**Then** they are queued and reconciled per FR-51, with any conflict resolved and recorded rather than dropped.

**Given** a Request created during the outage
**When** context becomes available again
**Then** the Stay context is attached on next read and the unavailable marker clears, with the Job's history showing when each happened (AD-2).

## Tasks / Subtasks

- [ ] **T1. Nothing user-facing blocks on Jazz Core** (AC: 1)
  - [ ] Sign-in, Request creation, dispatch and closure all succeed while Jazz Core is unreachable (NFR-11).
  - [ ] A Job created during an outage carries a marker that context was unavailable.
- [ ] **T2. Stale context is named, never silent** (AC: 2)
  - [ ] Every surface that normally shows Jazz Core-sourced context shows an explicit marker naming **the time of the last successful exchange**, and no interaction is blocked by its presence (UX-DR-5).
- [ ] **T3. Local room-status changes queue and reconcile** (AC: 3)
  - [ ] Changes made locally during the outage are queued and reconciled on recovery through 2.7's resolution function, with any conflict resolved and recorded rather than dropped.
- [ ] **T4. Context attaches on recovery** (AC: 4)
  - [ ] A Request created during the outage gains its Stay context on next read; the unavailable marker clears; the Job's history shows **when each happened** (AD-2).

## Dev Notes

**Prerequisites:** 2.2, 2.5, 2.6, 2.7, and Stories 3.1/3.2 for the operations being kept alive. Sequence it last in Epic 2 — it is the story that proves the rest degrade correctly.

**Scope guards.** Degraded-mode behaviour of the console and server during a **Jazz Core** outage. Not the mobile client's offline behaviour during a **network** outage — that is 4.3, a different failure with a different mechanism. Do not conflate them: the console is explicitly unusable during a property WAN outage (an accepted consequence of the cloud-only decision), while a Jazz Core outage leaves the console fully functional.

**This is the story that makes the Jazz Core bet safe.** Integration risk moved from "will this PMS support it" to "at what latency and availability does Jazz Core deliver it" — a dependency on another team. FR-57 is the answer to the question "what happens on the bad day", and its bar is high: **fully operable**, not read-only.

**Implementation notes.**
- Distinguish three context states in the read model: fresh, stale-with-timestamp, never-available. Two states force the interface to lie about one of them.
- The marker names a time, so hold the last-successful-exchange timestamp per event type (2.2 already does) and render the relevant one — a stale Stay marker should not quote the room-status timestamp.
- Recovery attachment must be idempotent and must not rewrite the Job's own history: append the attachment as an event, never mutate the creation event.

**Testing.** Full outage scenario test: sign in, create, dispatch, close, all succeeding, with markers asserted on each surface. Recovery test asserting context attaches, marker clears, and two distinct timestamps appear in history. Queued room-status changes reconcile with one conflict, resolved and recorded. Assert no user-facing endpoint awaits a Jazz Core call synchronously (a timeout-budget test, not a code review).

### Project Structure Notes

Touches `edge/` (read composition and markers), `app/integration` (queue and reconcile), both clients' read models. The context-state enum belongs in `contracts/` so console and handset render the same three states.

### References

- [Source: planning-artifacts/epics.md#Story 2.13]
- [Source: prd.md#FR-57], [#FR-49], [#FR-51], [#§7 NFR-2, NFR-11]
- [Source: ARCHITECTURE-SPINE.md#AD-2], [#AD-5], [#AD-6]
- [Source: EXPERIENCE-WEB.md] stale-context treatment

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
