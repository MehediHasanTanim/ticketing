# Story 8.3: Enforce closure quality

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As a **chief engineer**,
I want a work order to be closeable only with a real resolution,
So that the history is worth reading next year.

## Acceptance Criteria

**Given** a Work Order
**When** I close it
**Then** a resolution is required, plus a root cause and a photo where the Catalog Entry requires them (FR-37).

**Given** root cause
**When** I select it
**Then** values come from a Property-configurable list rather than free text alone (FR-37).

**Given** missing required fields
**When** closure is attempted through any interface
**Then** closure is refused server-side with the missing fields named (FR-37, AD-11).

**Given** a Work Order closed as recurring
**When** it is saved
**Then** it links to the prior Work Orders it repeats and they are navigable from it (FR-37).

## Tasks / Subtasks

- [ ] **T1. Resolution always; root cause and photo where configured** (AC: 1)
  - [ ] Closure requires a resolution, plus a root cause and a photo **where the Catalog Entry requires them** — through 3.2's data-driven required-fields mechanism, not a new check.
- [ ] **T2. Root cause from a list** (AC: 2)
  - [ ] Property-configurable list, not free text alone.
- [ ] **T3. Refused server-side with the fields named** (AC: 3)
  - [ ] Through any interface (AD-11).
- [ ] **T4. Closed-as-recurring links its predecessors** (AC: 4)
  - [ ] Links to the prior Work Orders it repeats, navigable from it.

## Dev Notes

**Prerequisites:** 8.1, 3.2 (required-fields mechanism), 1.9 (configurable lists), 4.5 (photos).

**Scope guards.** Closure quality gates. Not recurring-fault **detection** (8.7 — automatic, by threshold); T4 here is a human saying "this is the same fault again" and is the input 8.7's flag can corroborate.

**T1 is a reuse test, not new validation.** 3.2 was built to read required fields from configuration precisely so this story adds configuration, not code. If you find yourself writing a WorkOrder-specific closure validator, 3.2's mechanism is not data-driven enough — fix it there.

**Implementation notes.**
- "Not free text alone" means the structured value is required and free text is optional alongside it. Root-cause distribution reporting (9.5's shape, 8.10's asset reporting) depends on the structured value.
- The recurring link is a relationship on the Job, navigable both ways, so 8.10 can report a chain rather than a count.
- Root-cause lists are versioned configuration (AD-9); a Job closed last month keeps the label it was given even if the list changes.

**Testing.** Closure refused for each missing required field, per two Catalog Entry configurations. Root cause rejected as free text when the list is configured. Recurring link navigable in both directions. Bound-version test on a root-cause list change. Reuse assertion: no second closure validator.

### Project Structure Notes

Extends `core/job/` (closure guard reading configuration), `core/asset/` (recurring links where the target is an Asset).

### References

- [Source: planning-artifacts/epics.md#Story 8.3]
- [Source: prd.md#FR-37], [#FR-10], [#FR-33], [#FR-44]
- [Source: ARCHITECTURE-SPINE.md#AD-9], [#AD-11]

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
