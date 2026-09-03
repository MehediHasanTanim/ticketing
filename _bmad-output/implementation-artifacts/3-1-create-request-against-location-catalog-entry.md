# Story 3.1: Create a Request against a Location from a Catalog Entry

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **front office user**,
I want to log a guest request in under fifteen seconds by picking what it is and where,
So that I can do it while the guest is still on the phone.

## Acceptance Criteria

**Given** a configured Catalog and Location hierarchy
**When** I type a partial catalog term
**Then** matches return within 300ms and selecting one populates Department, SLA Target and default duration from that entry (FR-7, NFR-3).

**Given** a Request in progress
**When** I attempt to save it without a Location or without a Catalog Entry
**Then** the save is refused with the missing field named
**And** free-text notes and photos remain optional.

**Given** a saved Request
**When** it is committed
**Then** a `RequestLogged` event carries `tenant_id`, `property_id`, the bound configuration version and `occurred_at` (AD-3, AD-9, AD-2)
**And** the whole path from opening the form to a dispatched Request completes in under fifteen seconds for a practised user (FR-7).

## Tasks / Subtasks

- [ ] **T1. Catalog search under 300ms** (AC: 1)
  - [ ] Partial-input matches return within 300ms at a Property-sized catalog (NFR-3); selecting an entry populates Department, SLA Target and default duration from it.
- [ ] **T2. Refuse an incomplete Request** (AC: 2)
  - [ ] No save without a Location **and** a Catalog Entry, with the missing field named. Notes and photos stay optional.
- [ ] **T3. The founding event** (AC: 3)
  - [ ] `RequestLogged` carries `tenant_id`, `property_id`, the **bound configuration version** (1.8) and `occurred_at` (AD-3, AD-9, AD-2).
  - [ ] Fifteen-second path from opening the form to a dispatched Request for a practised user — measure it, do not assume it.

## Dev Notes

**Prerequisites:** 1.7 (Locations), 1.8 (Catalog Entries and SLA Targets), 1.0. **This story is the prerequisite for most of the product** — 2.11, 2.12, 3.2 onward, and every Job-bearing epic.

**Scope guards.** Creating a Request. Lifecycle transitions are 3.2, routing is 3.5, the clock is 3.4, Stay context is 3.3, guest-call drafts are 2.11. Build the narrowest thing that produces a valid `RequestLogged`.

**A Request is a Job.** Glossary, verbatim: `Job` is the umbrella for `Request` (guest-originated) and `WorkOrder` (maintenance). Model the shared aggregate now — `core/job` — because 8.1 adds WorkOrder to the **same** lifecycle, SLA behaviour and escalation. A separate Request aggregate here means a duplicated engine there.

**Implementation notes.**
- Binding the configuration version at creation is the load-bearing detail. It is what lets 1.8's config change tomorrow without rewriting today's compliance, and what makes a projection rebuild reproduce identical SLA figures.
- Fifteen seconds is a UX budget, not a server budget: the operator is on the phone with a guest. The catalog search latency is the part you can test automatically; the rest is form design from `EXPERIENCE-WEB.md`.
- Do not add a status column. State is a fold over events (AD-1); the current state may be a projection, never the source.

**Testing.** Search latency at the NFR-4 scale point. Refusal messages name the field. Event-shape assertion including bound version. Rebuild the projection from events and assert identical state (Story 1.0's rebuild command). Isolation gate: a Request in Property A is invisible to Property B through read, list, search and export.

### Project Structure Notes

New: `core/job/` (the aggregate, shared by Request and WorkOrder), `app/job/`, `edge/` command route. `core/job` will also hold the SLA fold from 3.4 — keep the aggregate free of I/O so both stay unit-testable with fake ports.

### References

- [Source: planning-artifacts/epics.md#Story 3.1]
- [Source: prd.md#FR-7], [#FR-10], [#§3 Glossary "Job", "Request"], [#§7 NFR-3, NFR-4]
- [Source: ARCHITECTURE-SPINE.md#AD-1], [#AD-2], [#AD-3], [#AD-9]
- [Source: EXPERIENCE-WEB.md] dispatch create surface

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
