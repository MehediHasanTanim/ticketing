# Story 3.4: Run the SLA Clock from one fold

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **user who can see a Job**,
I want the remaining time to be the same number everywhere I look,
So that the handset and the console never disagree about whether a job is late.

## Acceptance Criteria

**Given** a Job with an SLA Target
**When** remaining time is displayed on any surface
**Then** it is derived by the single SLA fold over the Job's event sequence — elapsed, paused, remaining, breached — and never read from a stored countdown (FR-12, AD-1, AD-14).

**Given** the same Job open on mobile and on the console, both online
**When** both are observed
**Then** the displayed remaining time agrees within one second (FR-12)
**And** elapsed time is computed from server-side timestamps, never from a client clock (NFR-9).

**Given** a Property timezone
**When** any time is presented
**Then** it renders in the Property's local timezone while remaining UTC in storage (AD-2).

**Given** the fixture vectors in `contracts/`
**When** CI runs
**Then** the TypeScript fold and the Dart port both execute them and both runs gate the release (AD-14).

## Tasks / Subtasks

- [ ] **T1. Extend the fold Story 1.0 established — do not replace it** (AC: 1)
  - [ ] The SLA fold in `core/job` computes elapsed, paused, remaining and breached as a **pure function over the Job's event sequence**. Never a stored countdown (AD-1, AD-14).
  - [ ] Story 1.0 shipped the trivial elapsed case in TypeScript and Dart. This story adds the real semantics **to both**, and adds the fixture vectors that prove they agree.
- [ ] **T2. One second of agreement** (AC: 2)
  - [ ] The same Job on mobile and console, both online, shows remaining time agreeing within one second.
  - [ ] Elapsed time is computed from **server-side timestamps**, never from a client clock (NFR-9).
- [ ] **T3. Presentation in Property timezone** (AC: 3)
  - [ ] Rendered in the Property's local timezone; storage stays UTC (AD-2).
- [ ] **T4. The gate does the arguing** (AC: 4)
  - [ ] New fixture vectors in `contracts/` for every semantic added here; the two-language gate runs them and both runs gate the release.

## Dev Notes

**Prerequisites:** 1.0 (the fold skeleton and the gate), 3.1, 3.2. **Prerequisite for 3.6, 3.7, 3.8, 4.2, 6.1, 6.2, 10.1** — every surface that shows an SLA figure.

**Scope guards.** The fold and its two implementations. Pause *conditions* are configured in 1.9 and applied in 3.7; breach *escalation* is 3.8. This story computes; those stories act.

**This is the story AD-14 was written for.** The adversarial architecture pass found the worst hole in the design here: the dashboard projection and the month-end report could each decide independently how to treat paused time, reassignment, or a Job that breached while offline — both obeying every other invariant, both "correct", producing different compliance numbers and destroying SM-2 as a metric. The rule that follows is absolute: **one fold, called everywhere, never reimplemented.** The only permitted second copy in the entire system is the Dart port, and it exists solely because Dart cannot import TypeScript.

**Implementation notes.**
- No SQL computes elapsed time. If a projection needs a breach flag, it stores the fold's output, not its own arithmetic.
- The fold takes time through `ClockPort`. A `Date.now()` inside `core` breaks both the fake-clock tests and the reproducibility of a projection rebuild.
- Client countdowns tick locally between reads but **anchor to server timestamps** — the client renders a projection of the fold's inputs, it does not re-derive the deadline from its own clock.
- Fixture vectors must cover: plain elapsed, one pause, nested/consecutive pauses, reassignment mid-clock, a breach whose `occurred_at` precedes its `recorded_at` (the offline case), and a Job paused past its maximum.

**Testing.** The fixture suite **is** the test, in both languages, as a release gate. Add the cross-path test 6.2 will depend on: the dashboard read and the report read over one fixture must return the same compliance figure. Negative control: break the Dart port deliberately and confirm CI goes red.

### Project Structure Notes

`core/job/sla` (TypeScript, authoritative), `clients/mobile/lib/sla` (the one Dart port), `contracts/sla-fixtures/` (vectors). No third location, in any language, ever.

### References

- [Source: planning-artifacts/epics.md#Story 3.4], [#Cross-cutting requirements that are release gates]
- [Source: prd.md#FR-12], [#FR-13], [#§7 NFR-9], [#§13 SM-2]
- [Source: ARCHITECTURE-SPINE.md#AD-14], [#AD-1], [#AD-2], [#Revision log]

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
