# Story 6.1: See my Department's live state

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 6: Manager visibility and guest follow-up. -->

## Story

As a **department manager**,
I want live open load, SLA distribution, breaches and staff workload for my Department,
So that I can move someone before the shift is lost rather than read about it tomorrow.

## Acceptance Criteria

**Given** my Department at my Property
**When** I open the dashboard
**Then** I see open load, SLA state distribution, breaches and per-Staff-Member workload, current within thirty seconds (FR-69, NFR-3).

**Given** the SLA distribution
**When** it renders
**Then** breached, breaching and within-target Jobs are distinguished, and the distinction survives greyscale (FR-69, UX-DR-1).

**Given** my role
**When** the dashboard loads
**Then** it is scoped to my Department unless my role spans more, and a request for another Department's data is refused server-side (FR-69, AD-11).

**Given** every SLA figure shown
**When** it is computed
**Then** it comes from the single SLA fold, not from a dashboard-specific query (AD-14).

## Tasks / Subtasks

- [ ] **T1. Live load, distribution, breaches, workload** (AC: 1)
  - [ ] Open load, SLA state distribution, breaches and per-Staff-Member workload for my Department at my Property, **current within thirty seconds** (NFR-3).
- [ ] **T2. Three states, distinguishable in greyscale** (AC: 2)
  - [ ] Breached, breaching and within-target distinguished, and the distinction survives greyscale (UX-DR-1).
- [ ] **T3. Scope is a server decision** (AC: 3)
  - [ ] Scoped to my Department unless my role spans more; a request for another Department's data is refused server-side (AD-11).
- [ ] **T4. Every figure from the one fold** (AC: 4)
  - [ ] All SLA figures come from the single fold (3.4), never from a dashboard-specific query. **No SQL computes elapsed time.**

## Dev Notes

**Prerequisites:** 3.4, 3.10, 1.3.

**Scope guards.** The Department dashboard. The open-work **list** is 3.10 (FR-18 is owned there and consumed here — this story adds no criteria for it). The Property-wide GM dashboard is 10.1. Adoption and data quality are 6.3.

**T4 is not a style rule.** A dashboard projection that computes its own elapsed time is precisely the AD-14 violation the adversarial review found: it will disagree with 6.2's report over paused time, and SM-2 stops meaning anything. If the projection needs a breach flag, it **stores the fold's output** keyed to the event position it was computed at.

**Implementation notes.**
- Thirty-second freshness at 4,000 Jobs per Property per day (NFR-4) is comfortably a projection refresh, not a live query over the event log. Build the projection; do not read events per page load.
- "Breaching" is a derived middle state (within target but close). Define its threshold as configuration, and get it from the fold's remaining-time output so it cannot drift from the badge on 3.10's list.
- Per-Staff-Member workload is the same open-load projection 3.5 uses for routing. One projection, two readers.

**Testing.** Freshness assertion. Greyscale render check of the three states. Cross-Department request refused (added to the isolation gate as a scope case). Agreement test: the dashboard's compliance figure equals 6.2's report figure over one fixture — the test that AD-14 exists for.

### Project Structure Notes

`app/reporting/department-dashboard` projection, `clients/console` surface. Reads `core/job`'s fold; owns no arithmetic.

### References

- [Source: planning-artifacts/epics.md#Story 6.1], [#Ownership and consumption]
- [Source: prd.md#FR-69], [#FR-18], [#§7 NFR-3, NFR-4, NFR-6]
- [Source: ARCHITECTURE-SPINE.md#AD-14], [#AD-11]
- [Source: DESIGN.md] console density; [Source: EXPERIENCE-WEB.md] dashboard surfaces

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
