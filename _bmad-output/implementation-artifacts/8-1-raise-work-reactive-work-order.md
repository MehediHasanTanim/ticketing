# Story 8.1: Raise and work a reactive Work Order

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As an **engineer**,
I want to work a fault through the same lifecycle as any other job,
So that engineering is measured on the same terms as everyone else.

## Acceptance Criteria

**Given** a Location or an Asset
**When** I raise a Work Order against it
**Then** it uses the same lifecycle states, SLA behaviour and escalation as a Request, with no separate engine (FR-30, FR-10).

**Given** a Work Order origin
**When** it is created
**Then** it can come from a Fault (FR-22), from the console, or from a guest Request that is reclassified, and its origin is recorded and reportable (FR-30).

**Given** a guest Request reclassified as a Work Order
**When** the reclassification is committed
**Then** the SLA Clock, history and attachments are preserved (FR-9).

## Tasks / Subtasks

- [ ] **T1. One lifecycle, no second engine** (AC: 1)
  - [ ] A Work Order against a Location or Asset uses the **same lifecycle states, SLA behaviour and escalation** as a Request (3.2, 3.4, 3.8). No separate engine.
- [ ] **T2. Three origins, recorded** (AC: 2)
  - [ ] From a Fault (7.4), from the console, or from a guest Request that is **reclassified**. Origin recorded and reportable.
- [ ] **T3. Reclassification preserves everything** (AC: 3)
  - [ ] SLA Clock, history and attachments preserved when a Request becomes a Work Order (3.5's reassignment discipline).

## Dev Notes

**Prerequisites:** 3.1–3.8. **Note the release wrinkle:** Epic 8 is R3, but Story 7.4 (R2) raises the first Work Order. Either the WorkOrder origin lands with 7.4 and this story completes the engineer-facing side, or 7.4 waits. Settle it at planning; the wrong answer is a Fault-specific record in R2 that R3 has to migrate.

**Scope guards.** The Work Order as a Job. Assets are 8.2, closure quality is 8.3, parts are 8.4, OOO/OOS is 8.5, PM is 8.6, queues are 8.8.

**`WorkOrder` is the glossary term and `core/job` is the aggregate.** FR-30 states the shared lifecycle as a requirement, not an implementation hint. If this story introduces `core/workorder`, the SLA fold, the escalation saga, the pause logic and the conflict rules all acquire a second home — which is the wheel-reinvention failure mode these story files exist to prevent.

**Implementation notes.**
- Reclassification is a change of origin/type on one Job, expressed as an event — not a create-and-close pair, which would break the SLA Clock and split the history.
- A Work Order may target an **Asset** as well as a Location; model the target as a discriminated reference so 8.2's history accrual works without a join through Location.
- Guest-impacting fast path (3.11) applies to Work Orders too, via the same mechanism.

**Testing.** Equivalence test: a Work Order and a Request with the same SLA Target behave identically through the whole lifecycle including pause and escalation. Reclassification preserving clock, history and attachments. All three origins recorded and reportable. Assert no second job aggregate exists.

### Project Structure Notes

Extends `core/job/` (WorkOrder origin, Asset target), `app/job`. No new aggregate.

### References

- [Source: planning-artifacts/epics.md#Story 8.1]
- [Source: prd.md#FR-30], [#FR-22], [#FR-36], [#§3 Glossary "Work Order", "Job"]
- [Source: ARCHITECTURE-SPINE.md#AD-1], [#AD-14]

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
