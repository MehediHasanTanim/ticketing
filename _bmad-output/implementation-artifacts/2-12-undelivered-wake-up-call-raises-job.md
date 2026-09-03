# Story 2.12: An undelivered wake-up call raises a Job

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

*Sequenced after Stories 3.1 and 3.2.*

As a **duty manager**,
I want a failed wake-up call to become work with a priority deadline,
So that the guest who was not woken is dealt with rather than discovered at checkout.

## Acceptance Criteria

**Given** wake-up calls reported by Jazz Core
**When** I open a Stay
**Then** scheduled wake-up calls are visible as scheduled items against that Stay (FR-55)
**And** scheduling remains a Jazz Core/PBX function — JazzTicketing offers no scheduling affordance.

**Given** a wake-up call Jazz Core reports as failed to deliver
**When** the failure is ingested
**Then** a Job is created on the configured Department with the Property's priority SLA Target (FR-55, FR-36).

## Tasks / Subtasks

- [ ] **T1. Scheduled wake-up calls are visible** (AC: 1)
  - [ ] Wake-up calls reported by Jazz Core appear as scheduled items against the Stay.
  - [ ] **Offer no scheduling affordance** — scheduling stays a Jazz Core/PBX function (`[ASSUMPTION]`: scope is visibility and exception handling only).
- [ ] **T2. A failed wake-up raises a Job** (AC: 2)
  - [ ] A wake-up Jazz Core reports as failed to deliver creates a Job on the configured Department with the Property's **priority SLA Target** (FR-36's fast-path treatment).

## Dev Notes

**Prerequisites:** 2.2, 2.3, 2.5, **and Stories 3.1 and 3.2** — the Job must exist and have a lifecycle. Declared cross-epic dependency; schedule after 3.2.

**Scope guards.** Visibility and the failure exception. No scheduling, no rescheduling, no wake-up configuration. If a stakeholder asks for scheduling, that is a change to raise in the PRD, not a story extension — and the `[ASSUMPTION]` tag on FR-55 is where the boundary is recorded.

**Implementation notes.**
- The created Job takes the priority SLA Target via the same fast-path mechanism as 3.11, not a hard-coded target. One path for "this is urgent by rule".
- Wake-up items on the Stay are projections of Jazz Core state, like the Stay itself — do not author or mutate them here.
- Capability-gate this: a Property whose Jazz Core does not report wake-up events shows no wake-up section rather than an empty one (2.3).

**Testing.** Scheduled items render from ingested events. Failure event creates exactly one Job on the configured Department with the priority target, verified against the Catalog/SLA configuration rather than a literal. Capability-off Property shows no section. Idempotency: the same failure event twice creates one Job.

### Project Structure Notes

Extends `adapters/jazzcore/` and `core/stay/` (wake-up items as projected state); Job creation goes through `app/job` from Story 3.1.

### References

- [Source: planning-artifacts/epics.md#Story 2.12], [#Backlog order vs epic number]
- [Source: prd.md#FR-55] and its `[ASSUMPTION]`, [#FR-36], [#FR-78]
- [Source: ARCHITECTURE-SPINE.md#AD-5]

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
