# Story 1.6: Manage Tenant defaults and see their blast radius

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **tenant administrator**,
I want every Tenant-level default to tell me how many Properties currently inherit it,
So that I know what a change will affect before I make it.

## Acceptance Criteria

**Given** a Tenant-level default
**When** I view it
**Then** the count of Properties currently inheriting it is displayed as the stated blast radius of a change (FR-83)
**And** changing it applies to those inheriting Properties and to no others.

**Given** a Property that has overridden a default
**When** the Tenant-level value later changes
**Then** the Property does not silently re-inherit it
**And** the override is visible from both the Tenant surface and the Property surface.

**Given** cross-Tenant guest history (FR-45) and retention settings (DG-2, DG-3)
**When** I change any of them
**Then** they are settable only at Tenant level and every change is attributed in the audit trail with actor and previous value.

**Given** the Tenant settings surface
**When** I look for region
**Then** regions are shown as a read-only summary per Property and are not settable here (DG-4).

## Tasks / Subtasks

- [ ] **T1. Blast radius on every default** (AC: 1)
  - [ ] For each Tenant default, compute and display the count of Properties **currently inheriting** it — the stated blast radius of a change.
  - [ ] Changing a default applies to inheriting Properties and to no others.
- [ ] **T2. Override is permanent** (AC: 2)
  - [ ] A Property that overrides a default stops inheriting permanently; a later Tenant change does not silently re-apply.
  - [ ] The override is visible from **both** the Tenant surface and the Property surface.
- [ ] **T3. Tenant-only governance settings** (AC: 3)
  - [ ] Cross-Tenant guest history (FR-45) and retention (DG-2, DG-3) settable only at Tenant level, each change attributed in the audit trail with actor and previous value.
- [ ] **T4. Region is a read-only summary** (AC: 4)
  - [ ] Show region per Property; offer no control. Region is chosen at Property creation and immutable (DG-4).

## Dev Notes

**Prerequisites:** 1.2 — and note the hard dependency: inheritance-by-reference must already exist. If 1.2 copied default values at creation, this story cannot be built and 1.2 must be corrected first.

**Scope guards.** The Tenant settings surface and inheritance mechanics. Identity-provider configuration appears here in the interface but is implemented by 1.5. Property-level configuration is 1.7/1.8/1.9.

**Implementation notes.**
- The blast-radius count is the feature. A Tenant of 200 Properties (NFR-4 design point) makes an unannounced default change a 200-property incident. Compute it live; a cached count that is wrong is worse than no count.
- Permanent override is easy to get wrong as "override until the Tenant value changes". Model it as an explicit `inherits: false` on the Property setting, set once and never cleared implicitly.
- Cross-Tenant guest history defaults **off**, and enabling it is audited, because it widens who can see one guest's history across a management company.

**Testing.** Inheritance matrix: inherit then Tenant change applies; override then Tenant change does not apply, twice in a row. Blast-radius count over a fixture of 3 inheriting and 2 overriding Properties. Audit assertions on governance settings. Region control absent **and** refused via API.

### Project Structure Notes

Extends `core/property` settings resolution; new `app/tenant/settings`. One settings-resolution function serves both surfaces — the Property view and the Tenant view must never disagree about what is in force.

### References

- [Source: planning-artifacts/epics.md#Story 1.6]
- [Source: prd.md#FR-83], [#FR-45], [#§11 DG-2, DG-3, DG-4], [#§7 NFR-4]
- [Source: EXPERIENCE-WEB.md] Tenant configuration surface
- [Source: ARCHITECTURE-SPINE.md#AD-9], [#AD-4]

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
