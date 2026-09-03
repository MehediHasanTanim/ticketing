# Story 4.2: See my work ordered by urgency

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want my queue to tell me what to do next without opening anything,
So that I am working rather than navigating.

## Acceptance Criteria

**Given** my assigned and available Jobs
**When** I open the queue
**Then** they are ordered by SLA urgency with enough information on each row to act without opening it (FR-63).

**Given** a Job's SLA state
**When** I look at the queue at arm's length in low corridor light
**Then** the state is distinguishable without relying on colour and survives greyscale (FR-63, NFR-6, UX-DR-1).

**Given** the queue
**When** I accept, start or complete a Job from it
**Then** every one of those controls is reachable one-handed in the thumb zone on the baseline device, verified gloved and ungloved (FR-63, NFR-5, UX-DR-4).

**Given** a dispatch while I am online
**When** it is routed to me
**Then** the queue reflects it within five seconds (FR-63, NFR-3).

**Given** a countdown displayed while the device is offline
**When** it is computed
**Then** it comes from the single Dart port of the SLA fold, which passes the same fixture vectors as the server implementation (AD-14).

## Tasks / Subtasks

- [ ] **T1. Ordered by urgency, actionable without opening** (AC: 1)
  - [ ] Assigned and available Jobs ordered by SLA urgency, with enough on each row to act without opening it.
- [ ] **T2. State without colour, at arm's length** (AC: 2)
  - [ ] SLA state distinguishable without relying on colour, surviving greyscale, legible at arm's length in low corridor light (NFR-6, UX-DR-1).
- [ ] **T3. One-handed, gloved** (AC: 3)
  - [ ] Accept, start and complete reachable one-handed in the thumb zone on the baseline device, **verified gloved and ungloved** (NFR-5, UX-DR-4).
  - [ ] Tap-only for core actions — no long-press, because of gloves. One primary action per screen in the thumb zone; destructive actions never in it.
- [ ] **T4. Five seconds to a dispatch** (AC: 4)
  - [ ] Online, the queue reflects a dispatch within five seconds.
- [ ] **T5. The offline countdown comes from the Dart port** (AC: 5)
  - [ ] Any countdown shown while offline is computed by the **single Dart port of the SLA fold**, which passes the same fixture vectors as the server implementation (AD-14, 3.4).

## Dev Notes

**Prerequisites:** 4.1, 3.4 (both fold implementations with real semantics), 3.5.

**Scope guards.** The queue surface and its rendering rules. Not offline queueing (4.3), not push (4.7), not the housekeeping board (7.1/7.3 — a different home screen for a different role).

**Home by role, and the delegated decision.** Attendant → Board, Engineer/Runner → My Work, Supervisor → Floor. For a **dual-role** user the designer decision (delegated by Tanim) was: Board wins, with a **Now group** of dispatched Jobs above the rooms — because Board is the stable habit and a home that moves by state cannot be learned, but Jobs carry SLA Clocks and Rooms do not, so urgent work must not depend on a tab switch. Job cards and Room cards stay **distinct types** on one screen; no card does double duty. This is flagged as the piece most worth user-testing at the first demo.

**Implementation notes.**
- Urgency ordering reads the fold's output. Do not sort by a stored deadline.
- Ticking countdowns anchor to server timestamps and re-anchor on each sync; between syncs the Dart fold advances them locally.
- Arabic: the row mirrors, but the SLA number and any Room number stay Western digits inside a bidi isolate **with any adjacent separator inside the isolate** — the middot-beside-Eastern-digits bug turned 19 minutes into 190 during design and is the reason this rule is absolute (UX-DR-2, AD-12).

**Testing.** Greyscale render of every SLA state. Thumb-zone measurement on baseline dimensions; gloved usability check. Dispatch-to-queue latency. Fixture-gate agreement between Dart and TypeScript folds. RTL render of a mixed-direction row with a duration and a Room number.

### Project Structure Notes

`clients/mobile` queue surface + `clients/mobile/lib/sla` (the Dart port from 1.0/3.4). No SLA arithmetic anywhere else in the client.

### References

- [Source: planning-artifacts/epics.md#Story 4.2]
- [Source: prd.md#FR-63], [#FR-12], [#§7 NFR-5, NFR-6]
- [Source: EXPERIENCE.md] queue, dual-role home, numeral-form rule
- [Source: ARCHITECTURE-SPINE.md#AD-14], [#AD-12]

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
