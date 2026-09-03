# Story 4.3: Work with no signal

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want to start, pause, complete and annotate work in a stairwell with no bars,
So that the dead spots in the building are not dead spots in the record.

## Acceptance Criteria

**Given** no connectivity
**When** I start, pause, complete or annotate a Job or a Room
**Then** the action applies locally and is written to the durable queue in the **same transaction** as the local state change, so I never see a completion the queue does not hold (FR-58, AD-7).

**Given** queued actions
**When** the app is killed or the device restarts
**Then** every queued action survives — this is a requirement, not a best effort (FR-58).

**Given** connectivity returns
**When** the queue drains
**Then** each action carries the timestamp of **when I did it**, not of the sync (FR-58, AD-2)
**And** the queue drains without the app in the foreground.

**Given** anything unsynced
**When** I look at the interface
**Then** what is queued and unsynced is visible to me, per item, not as a global spinner (FR-58).

## Tasks / Subtasks

- [ ] **T1. One transaction, no window** (AC: 1)
  - [ ] Start, pause, complete and annotate on a Job or Room apply locally with the intent and its idempotency key written to SQLite **in the same transaction** as the optimistic local state change — so the user never sees a completion the queue does not hold (AD-7).
- [ ] **T2. Survive process death** (AC: 2)
  - [ ] Every queued action survives an app kill and a device restart. **A requirement, not a best effort.**
- [ ] **T3. Action time, not sync time** (AC: 3)
  - [ ] Each action carries the time it was performed (AD-2), and the queue drains **without the app in the foreground** (background scheduling from 1.0).
- [ ] **T4. Per-item visibility** (AC: 4)
  - [ ] What is queued and unsynced is visible **per item**, not as a global spinner — plus the header queue count from the UX spine.

## Dev Notes

**Prerequisites:** 4.1, 1.0 (Drift + background scheduling), 3.2 (the transitions being queued).

**Scope guards.** The durable local write path. Conflict **resolution** is 4.4; photos are 4.5; the server's idempotency enforcement is shared with 4.4. Do not implement a state-diff sync.

**Sync is a batch of intents, never a state diff.** The client sends **what the user did**, not what it thinks the world should look like (AD-7). A diff-based sync is how a stale handset silently reverts a supervisor's reassignment, and it makes 4.4's conflict rules unexpressible.

**Offline is a normal state, not an error.** The UX spine is explicit: optimistic durable actions, per-item "Waiting to send", header queue count, conflicts surfaced to both sides, never silently discarded. Do not render offline as a failure banner.

**Implementation notes.**
- The same-transaction requirement is the one thing to get right. Optimistic UI + a queue insert in a separate transaction leaves a window where the user's completion exists only on screen — and on a handset that window ends with a dropped room.
- Server idempotency on `(tenant_id, property_id, staff_member_id, client_key)` for 30 days; the client generates `client_key` per intent and reuses it on every retry.
- Photos upload **separately** from the action; a failed photo never rolls back a completion (4.5).
- Background drain must be resilient to the OS killing the worker mid-batch — resume from the queue, not from memory.

**Testing.** Kill-during-write test asserting no orphaned local state. Restart-with-queue test. Retry-duplicate test asserting server idempotency. Action-time assertion after a delayed sync. Background drain with the app closed. Per-item indicator states.

### Project Structure Notes

`clients/mobile/lib/queue` (Drift schema, intent envelopes), `edge/sync` (the one batch endpoint). The intent envelope shape lives in `contracts/`.

### References

- [Source: planning-artifacts/epics.md#Story 4.3], [#Cross-cutting requirements that are release gates]
- [Source: prd.md#FR-58], [#FR-59], [#FR-62], [#§7 NFR-2]
- [Source: EXPERIENCE.md] offline treatment
- [Source: ARCHITECTURE-SPINE.md#AD-7], [#AD-2], [#Revision log] (Drift, background sync)

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
