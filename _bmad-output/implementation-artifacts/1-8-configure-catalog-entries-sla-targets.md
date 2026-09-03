# Story 1.8: Configure Catalog Entries and SLA Targets

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property administrator**,
I want to configure the vocabulary of work the property does and the time each kind is allowed to take,
So that a Request created later carries the right Department, deadline and required fields without engineering involvement.

## Acceptance Criteria

**Given** a Property
**When** I create a Catalog Entry
**Then** I can set its Department, SLA Target, default duration, acceptance window, required completion fields (which may include a photo) and whether guest follow-up is prompted (FR-5, FR-7, FR-11, FR-15)
**And** every value has a Tenant-level default and is Property-overridable.

**Given** a saved Catalog Entry or SLA Target
**When** it is written
**Then** it is stored as a versioned, effective-dated record and the version in force is recorded, so no configuration value is ever updated in place (AD-9).

**Given** a running SLA Clock on an existing Job
**When** I change the SLA Target or acceptance window of its Catalog Entry
**Then** the change applies to Jobs created after it and never retroactively alters that running clock (FR-5, AD-9)
**And** the Job keeps its bound configuration version for its whole life, including later escalation.

**Given** an incomplete Catalog Entry
**When** I attempt to save it without a Department or SLA Target
**Then** the save is refused with the missing field named.

**Given** any change I make here
**When** it is saved
**Then** it is attributed to me with a timestamp (FR-5, FR-6).

## Tasks / Subtasks

- [ ] **T1. The versioned configuration mechanism** (AC: 2, 5) — **this story establishes it; Story 1.9 consumes it**
  - [ ] Configuration records are versioned and effective-dated. A change writes a **new version**; nothing is updated in place.
  - [ ] Resolution function: given a Property, a config key and an instant, return the version in force. One implementation, used everywhere.
  - [ ] A Job binds the config version in force at creation and keeps it **for life**, including later escalation (AD-9).
- [ ] **T2. Catalog Entry** (AC: 1)
  - [ ] Fields: Department, SLA Target, default duration, acceptance window, required completion fields (may include a photo), follow-up prompted yes/no.
  - [ ] Every value has a Tenant-level default and is Property-overridable, using the 1.6 inheritance mechanics.
- [ ] **T3. Refusals and attribution** (AC: 3, 4, 5)
  - [ ] Save refused without Department or SLA Target, with the missing field named.
  - [ ] Changing an SLA Target or acceptance window never retroactively alters a running clock — assert against a live Job.
  - [ ] Every change attributed with actor and timestamp.

## Dev Notes

**Prerequisites:** 1.2, 1.6, 1.7. **Story 1.9 depends on this one** for the versioning mechanism, and Stories 3.1, 3.6, 3.7 and 6.4 all read Catalog Entry fields.

**Scope guards.** Catalog Entries, SLA Targets and the versioning mechanism. Pause Conditions, Credits, Escalation chains and Inspection checklists are Story 1.9 — they *attach* to Catalog Entries but are configured there. Do not implement the SLA clock (3.4) or the pause behaviour (3.7); this story stores the numbers they will use.

**Why this is the highest-leverage story in Epic 1.** Every SLA figure the product ever reports depends on which configuration version governed a Job. Get "bound version, kept for life" wrong here and SM-2 becomes unmeasurable — the same class of failure AD-14 exists to prevent, arriving through configuration instead of arithmetic. A change mid-shift must not rewrite yesterday's compliance.

**Implementation notes.**
- Effective-dating means the resolution function takes an instant, and that instant is `occurred_at` (the domain clock), not `now()` (AD-2). A projection rebuild must produce identical results — which is exactly what Story 1.0's rebuild command lets you verify.
- Catalog search must return partial matches within 300ms (FR-7, NFR-3). Index for prefix and substring search now; retro-fitting it after 3.1 ships means changing the read path under a live queue.
- Required completion fields are data, not code. Story 3.2 refuses completion using this list; do not encode field names in the lifecycle.

**Testing.** Version-in-force resolution across a change boundary, both directions. Live-Job test: change the target, assert the running clock is untouched and the bound version unchanged. Refusal messages name the field. Search latency test at the NFR-4 scale point (a Property-sized catalog).

### Project Structure Notes

New: `core/configuration/` (versioning and resolution — pure), `core/catalog/`, `app/configuration/`. The resolution function is imported by `core/job` later; it must not depend on anything outside `core`.

### References

- [Source: planning-artifacts/epics.md#Story 1.8]
- [Source: prd.md#FR-5], [#FR-7], [#FR-11], [#FR-15], [#FR-13], [#§7 NFR-3]
- [Source: ARCHITECTURE-SPINE.md#AD-9], [#AD-2], [#AD-14]

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
