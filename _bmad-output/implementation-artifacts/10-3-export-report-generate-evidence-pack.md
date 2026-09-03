# Story 10.3: Export a report and generate an evidence pack

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 10: Full reporting and evidence. -->

## Story

As a **department manager**,
I want any report as a file and an audit-ready pack for a date range,
So that a brand inspection is a download rather than a fortnight.

## Acceptance Criteria

**Given** any report
**When** I export it
**Then** CSV and PDF are produced and the export respects my Property and Department scope (FR-75).

**Given** an export
**When** it completes
**Then** it is recorded in the audit trail with actor, scope and period (FR-75, FR-6).

**Given** an evidence pack for a date range
**When** I generate it
**Then** it assembles the configured report set for that period
**And** `[ASSUMPTION]` its required contents must be confirmed against the specific brand standards the target Properties are audited against before this story is estimated (FR-75).

**Given** a Department marked as having incomplete data (FR-74)
**When** its figures appear in an export or pack
**Then** the marking travels with them (FR-74).

## Tasks / Subtasks

- [ ] **T1. CSV and PDF, within scope** (AC: 1)
  - [ ] Any report exportable as CSV and PDF, respecting the requester's Property and Department scope.
- [ ] **T2. Every export recorded** (AC: 2)
  - [ ] Actor, scope and period in the audit trail (1.11's export recording — reuse it).
- [ ] **T3. The evidence pack** (AC: 3)
  - [ ] Assembles the configured report set for a date range.
  - [ ] `[ASSUMPTION]` **its required contents must be confirmed against the specific brand standards the target Properties are audited against before this story is estimated.**
- [ ] **T4. Incomplete-data marks travel** (AC: 4)
  - [ ] A Department marked by 6.3 carries the mark into every export and pack.

## Dev Notes

**Prerequisites:** 1.11 (export recording), 6.3 (the marks), and the reports being exported (6.2, 8.10, 10.1, 10.2).

**Scope guards.** Export mechanics and pack assembly. Not new report content.

**Do not start T3 without the answer.** The `[ASSUMPTION]` on FR-75 is not decorative: "brand-standard evidence pack" means nothing until someone names the standard the target Properties are audited against, and the PRD records that no specific brand standard applies to this product yet. Building a plausible-looking pack against a guessed standard produces a deliverable that fails its only real test — an actual audit. Raise it; T1, T2 and T4 are independently completable.

**Implementation notes.**
- PDF generation: use the pdf skill's guidance for layout, and remember RTL — an Arabic-locale export must lay out correctly (AD-12 applies to exports too, per its "all exports" binding).
- Reuse 1.11's export recording so there is one place exports are counted, as that story specified.
- Scope enforcement is server-side on the export path, not a filter applied to a rendered report.

**Testing.** CSV and PDF for each report type. Scope test from three roles. Audit entry per export. Incomplete-data mark present in CSV, PDF and pack. Arabic-locale PDF layout check. Assert the pack's content set is configuration, not code.

### Project Structure Notes

`app/reporting/export`, `adapters/storage/` for generated files. Pack composition is configuration.

### References

- [Source: planning-artifacts/epics.md#Story 10.3]
- [Source: prd.md#FR-75] and its `[ASSUMPTION]`, [#FR-6], [#FR-74], [#§7 NFR-10]
- [Source: ARCHITECTURE-SPINE.md#AD-12]

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
