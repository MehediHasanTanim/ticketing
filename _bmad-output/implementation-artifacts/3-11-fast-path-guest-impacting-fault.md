# Story 3.11: Fast-path a guest-impacting fault

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **duty manager**,
I want no-hot-water in an occupied room to jump the queue by rule,
So that the jobs a guest is actually suffering through are not sorted with a light-bulb change.

## Acceptance Criteria

**Given** a Property-configured guest-impacting set (hot/cold, no hot water, no power, lock failure)
**When** a Job is raised against an **occupied** Room for one of those Catalog Entries
**Then** it receives the Property's priority SLA Target and priority Escalation chain (FR-36).

**Given** a fast-path Job
**When** it appears in any queue on either client
**Then** it is visually distinct, and the distinction survives greyscale (UX-DR-1).

**Given** an unavailable Staff Member
**When** a fast-path Job is assigned to them
**Then** the assignment requires an explicit override and the override is logged (FR-36).

**Given** Property quiet hours
**When** a fast-path Job escalates
**Then** quiet hours are overridden and the override is logged (FR-68).

## Tasks / Subtasks

- [ ] **T1. The configured guest-impacting set** (AC: 1)
  - [ ] Property-configurable set (hot/cold, no hot water, no power, lock failure). A Job raised against an **occupied** Room for one of those Catalog Entries takes the Property's priority SLA Target and priority Escalation chain.
- [ ] **T2. Visually distinct in every queue, on both clients** (AC: 2)
  - [ ] Distinct on the console list and the handset queue, and the distinction **survives greyscale** (UX-DR-1).
- [ ] **T3. Assignment to an unavailable member needs an override** (AC: 3)
  - [ ] Refused without an explicit override; the override is logged.
- [ ] **T4. Quiet hours are overridden** (AC: 4)
  - [ ] A fast-path Job escalating during quiet hours overrides them, and the override is logged (5.4).

## Dev Notes

**Prerequisites:** 3.1, 3.4, 3.5, 3.8, 1.8/1.9. Consumed by 2.12 (failed wake-up takes the same priority treatment) and 5.4 (quiet-hours override).

**Scope guards.** The fast-path rule and its consequences. Not the notification channel (5.1), not the quiet-hours configuration (5.4 owns it; this story supplies the override reason). Not Work Orders' own priority — 8.1 inherits this mechanism rather than adding one.

**Implementation notes.**
- The trigger is a **conjunction**: configured catalog entry **and** occupied Room. A no-hot-water report on a vacant room is ordinary work. Get the occupancy read from `core/room` (2.1), and remember occupancy may be unavailable during a Jazz Core outage (2.13) — decide and document the fallback (treat as occupied is the safer default; state it in the code).
- One priority mechanism, used by 2.12 and 8.1 later. Do not hard-code "priority" anywhere; it is a resolved SLA Target and chain from configuration.
- Overrides are logged with actor and reason — both the unavailable-assignment override and the quiet-hours override, in the audit trail (1.11).

**Testing.** Truth table: occupied+configured, occupied+other, vacant+configured, vacant+other. Occupancy-unavailable fallback asserted. Both clients' greyscale render checks. Override refusal then override-with-log for the unavailable member. Quiet-hours override logged.

### Project Structure Notes

Extends `core/job/` (priority resolution), `app/job/routing`. Both clients' queue components read a `priority` flag from the projection — they must not re-derive it.

### References

- [Source: planning-artifacts/epics.md#Story 3.11]
- [Source: prd.md#FR-36], [#FR-55], [#FR-68], [#FR-63]
- [Source: ARCHITECTURE-SPINE.md#AD-9], [#AD-6]
- [Source: EXPERIENCE.md], [Source: EXPERIENCE-WEB.md] priority treatment

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
