# Story 7.9: See the floor live

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As an **executive housekeeper**,
I want live room status across floors with attendant progress,
So that I can tell who needs help while there is still time to help.

## Acceptance Criteria

**Given** live Room Status
**When** I open the floor view
**Then** it distinguishes not started, in progress, DND, refused, clean awaiting inspection and inspected, and refreshes without manual action (FR-27).

**Given** an attendant whose elapsed time on a started Room exceeds the Property's rolling median for that Room type and clean type by the configured percentage (default 25%)
**When** the view renders
**Then** they are flagged as behind, with the flag computed **server-side** (FR-27).

**Given** the state vocabulary
**When** I compare this view to the grid and to the handset
**Then** a state means exactly the same thing in all three (UX-DR-3).

## Tasks / Subtasks

- [ ] **T1. Six states, refreshing without action** (AC: 1)
  - [ ] Distinguish **not started, in progress, DND, refused, clean awaiting inspection, inspected**, refreshing without manual action.
- [ ] **T2. Behind-median flag, computed server-side** (AC: 2)
  - [ ] An attendant whose elapsed time on a started Room exceeds the Property's **rolling median for that Room type and clean type** by the configured percentage (default 25%) is flagged as behind. **Computed server-side**; the visual treatment is UX's.
- [ ] **T3. One vocabulary across three surfaces** (AC: 3)
  - [ ] A state means exactly the same thing in this view, in the grid, and on the handset (UX-DR-3).

## Dev Notes

**Prerequisites:** 7.3 (the states exist), 2.1 (Room status), 7.6 (inspection states). Ships on **both** mobile and console.

**Scope guards.** The live floor view. Not the plan view (7.11 — same vocabulary, different layout), not board editing (7.1/7.5).

**Supervisor Floor ships on mobile and console with a division of labour, not a shrunken grid.** Mobile is act-while-walking; console is plan-the-whole-property. Shared data, vocabulary and state semantics — **not** shared layout. Do not build one responsive grid and call it both.

**Why the median is server-side.** FR-27 specifies it deliberately: two clients computing "behind" from their own view of durations would disagree, and a supervisor comparing a handset to a console would lose confidence in both. Same reasoning as AD-14 applied to a different derived figure.

**Implementation notes.**
- Rolling median per (Property, Room type, clean type) is a maintained aggregate, not a per-request percentile over all history. Update it as cleans complete.
- The percentage is configuration (default 25%), Property-scoped.
- Six states in greyscale is the hardest greyscale case in the product — glyph plus word plus number, verified by an actual greyscale render at arm's length. This is where the design phase caught real defects.

**Testing.** All six states rendered and greyscale-verified on both surfaces. Median computation against a fixture with a known distribution. Flag threshold boundary. Vocabulary equivalence test comparing the three surfaces' state labels from one source in `contracts/`.

### Project Structure Notes

`app/housekeeping/floor` (projection + median aggregate), surfaces in both clients. State labels and their meanings live in `contracts/` so the three surfaces cannot drift.

### References

- [Source: planning-artifacts/epics.md#Story 7.9]
- [Source: prd.md#FR-27], [#FR-21], [#§7 NFR-6]
- [Source: EXPERIENCE.md] Floor; [Source: EXPERIENCE-WEB.md] Floor as a peer surface
- [Source: ARCHITECTURE-SPINE.md#AD-14] (the same discipline for a derived figure)

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
