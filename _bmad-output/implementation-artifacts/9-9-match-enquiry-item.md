# Story 9.9: Match an enquiry to an item

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **front office user**,
I want to search the register while the guest is on the phone,
So that "we'll look into it" becomes an answer.

## Acceptance Criteria

**Given** a Property's twelve-month register
**When** I search by date range, Location and category
**Then** results return within two seconds (FR-48, NFR-3).

**Given** an enquiry I cannot match
**When** I record it
**Then** it is retained and re-checked against later item records for the configurable period (FR-48).

**Given** a matched enquiry
**When** I record the outcome
**Then** the outcome is stored and the item's custody state advances (FR-47, FR-48).

## Tasks / Subtasks

- [ ] **T1. Search within two seconds over twelve months** (AC: 1)
  - [ ] By date range, Location and category over a Property's twelve-month register, returning **within two seconds** (NFR-3).
- [ ] **T2. Unmatched enquiries are retained and re-checked** (AC: 2)
  - [ ] Retained and re-checked against later item records for the configurable period.
- [ ] **T3. Recording the outcome advances custody** (AC: 3)
  - [ ] A matched enquiry's outcome is stored and the item's custody state advances (9.8).

## Dev Notes

**Prerequisites:** 9.7, 9.8.

**Scope guards.** Enquiry search, retention and outcome. Not item creation (9.7), not custody mechanics (9.8).

**T2 is the feature guests actually notice.** A guest phones from the airport; the item has not been handed in yet. An enquiry that is retained and re-checked turns "we don't have it" into a call back two days later. Implement the re-check as a saga over new item records, not as a manual re-search someone must remember.

**Implementation notes.**
- Two seconds over twelve months means Postgres full-text plus indexed date/Location/category filters — which the spine says serves R1's register searches, with a search engine deferred as an evidence-driven addition. Do not introduce one here without evidence.
- The re-check saga matches on category, Location and date window. Expect false positives; present them as candidates for a human, never as an automatic match.
- Enquiry records may contain guest contact details. Those are governed by DG-1's permitted set and by retention (DG-2) — hold the minimum needed to call back, and let it expire.

**Testing.** Search latency at a twelve-month fixture volume. Re-check saga surfacing a candidate when a matching item is recorded later. Outcome recording advancing custody state. Enquiry retention expiry. Guest contact fields limited to the permitted set.

### Project Structure Notes

Extends `core/lostfound/` (enquiry), `app/sagas/lostfound-recheck`, `app/lostfound/search`.

### References

- [Source: planning-artifacts/epics.md#Story 9.9]
- [Source: prd.md#FR-48], [#FR-47], [#§7 NFR-3], [#§11 DG-1, DG-2]
- [Source: ARCHITECTURE-SPINE.md#Deferred] (search)

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
