# Story 6.2: Report SLA against this property's own baseline

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 6: Manager visibility and guest follow-up. -->

## Story

As a **general manager**,
I want compliance shown against what this property was doing before we arrived,
So that the number means improvement rather than comparison to a stranger.

## Acceptance Criteria

**Given** a Property with a captured pre-launch baseline
**When** I run SLA and response reporting
**Then** the baseline is shown alongside current figures for the same definitions (FR-71, OR-2).

**Given** a reporting request
**When** I choose its shape
**Then** I can report by Department, Catalog Entry, shift and period, with medians and percentiles available — not only means (FR-71).

**Given** Jobs that were paused
**When** figures are produced
**Then** paused time is separable from active time, and the treatment of paused time is the fold's, identical to the dashboard's (FR-71, FR-13, AD-14).

**Given** the same period requested from the dashboard and from this report
**When** both are produced
**Then** they return the same compliance figure — verified by a test that runs both paths over one fixture (AD-14, SM-2).

## Tasks / Subtasks

- [ ] **T1. The Property's own baseline, alongside** (AC: 1)
  - [ ] The pre-launch baseline captured at onboarding is stored **per Property** and shown alongside current figures for the same definitions (OR-2/OR-3).
- [ ] **T2. The dimensions managers actually use** (AC: 2)
  - [ ] Report by Department, Catalog Entry, shift and period, with **medians and percentiles**, not only means.
- [ ] **T3. Paused time separable, by the fold** (AC: 3)
  - [ ] Paused time separable from active time, and its treatment is the fold's — identical to the dashboard's (3.7, AD-14).
- [ ] **T4. The agreement test** (AC: 4)
  - [ ] A test runs the dashboard path and the report path over one fixture and asserts the **same compliance figure**.

## Dev Notes

**Prerequisites:** 3.4, 3.7, 6.1, and a captured baseline (OR-3 onboarding).

**Scope guards.** SLA and response reporting. Not the dashboard (6.1), not exports and the evidence pack (10.3), not adoption (6.3).

**This story exists to make SM-2 real.** "SLA compliance improvement measured against the reference period defined in RO-2 — the Property's own first thirty days, or its supplied historical data" is the success metric. Comparing a hotel to a vendor benchmark proves nothing to a GM; comparing it to itself before JazzTicketing is the argument. Which means the baseline must be captured, stored, and shown — not computed on the fly from whatever data happens to exist.

**T4 is the fix for the worst hole the architecture review found.** Two readers of the same events, each free to treat paused time its own way, both "compliant", producing 94% and 91% for the same month. Write that test first and let the implementation satisfy it.

**Implementation notes.**
- Medians and percentiles over 4,000 Jobs/Property/day need pre-aggregation. Aggregate from the **fold's outputs**, never from raw timestamps in SQL.
- Shift as a reporting dimension needs the shift model from 5.4 — coordinate rather than inventing a second definition of "shift".
- `[ASSUMPTION]` flag: onboarding tooling has no FRs of its own while SM-1 measures it (a known gap in the plan). If the baseline capture has no home, raise it rather than improvising a hidden admin screen.

**Testing.** The agreement test (T4) as a first-class test. Percentile correctness against a known distribution. Baseline displayed for a Property that has one and gracefully absent for one that does not. Paused-time separability asserted against the fixture vectors.

### Project Structure Notes

`app/reporting/sla` (aggregations over fold outputs), baseline storage on `core/property`. Never a second fold.

### References

- [Source: planning-artifacts/epics.md#Story 6.2]
- [Source: prd.md#FR-71], [#FR-13], [#§8 OR-2, OR-3], [#§13 SM-1, SM-2]
- [Source: ARCHITECTURE-SPINE.md#AD-14], [#AD-1]

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
