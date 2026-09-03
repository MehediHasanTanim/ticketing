# Story 1.10: Import a staff roster with explicit column mapping

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property or tenant administrator**,
I want to create and update users in bulk from our roster file with a mapping step I control,
So that opening day does not mean typing three hundred people in one at a time — and no field we are not allowed to hold gets imported by accident.

## Acceptance Criteria

**Given** a roster file
**When** I upload it
**Then** I map each source column explicitly to a destination field, and no automatic mapping is applied without my review (FR-82).

**Given** a source column that maps to a field outside the permitted dataset — a payroll identifier, a date of birth, or anything else DG-1 and DG-5 exclude
**When** I attempt to map it
**Then** the mapping is refused with the reason stated, rather than silently ignored.

**Given** a mapped file
**When** I proceed
**Then** every row is validated before anything is written, rows with problems are presented individually with a proposed resolution, and a partial import is a supported outcome
**And** the count of rows that will become PIN-only accounts (no email address) is shown before I confirm (FR-4).

**Given** a completed import
**When** I open the audit trail
**Then** the file name, row count and outcome are recorded (FR-6).

## Tasks / Subtasks

- [ ] **T1. Explicit mapping, never automatic** (AC: 1)
  - [ ] Upload, then map each source column explicitly to a destination field. **No automatic mapping is applied without review** — a suggested mapping is allowed only if the administrator must confirm each one.
- [ ] **T2. Refuse forbidden fields with a stated reason** (AC: 2)
  - [ ] A source column mapping to a field outside the permitted dataset — payroll identifier, date of birth, anything DG-1/DG-5 exclude — is **refused with the reason stated**, not silently ignored.
  - [ ] Maintain the permitted-destination list as data, and fail closed: an unrecognised destination is refused, not accepted.
- [ ] **T3. Validate every row before any write** (AC: 3)
  - [ ] Full validation pass first. Rows with problems are presented **individually with a proposed resolution**. Partial import is a supported outcome, not an error state.
- [ ] **T4. PIN-only count before confirmation** (AC: 3)
  - [ ] Rows without an email address create PIN-only accounts (1.3's credential path); show the count **before** the administrator confirms.
- [ ] **T5. Audit the import** (AC: 4)
  - [ ] File name, row count and outcome recorded in the audit trail (FR-6).

## Dev Notes

**Prerequisites:** 1.3 (Staff Member model and both credential paths), 1.7 (Departments/Locations for role scope).

**Scope guards.** Bulk create and update of users. Not role definition (1.4), not asset import (8.2 — which reuses this flow's shape but has its own destination list).

**The mapping step is the whole job.** This is UX-originated scope confirmed by Tanim on 2026-09-02 (FR-82). An importer that guesses columns will, at some property, map a payroll number into a notes field and put data in the system that DG-1 says cannot be there. The refusal in T2 is the control that prevents it, and it must be server-side.

**Implementation notes.**
- Validate-then-write is not the same as write-then-rollback. Do the full validation pass in memory or a staging table and produce the report **before** the first insert, so a partial import is a deliberate choice rather than a failure recovery.
- Idempotency for updates: match on a stable key the administrator maps explicitly (employee reference or email), never on name. State the match key in the confirmation summary.
- Roster files arrive as CSV and XLSX in practice. Accept both; normalise before mapping. Do not accept a file format you cannot validate row-by-row.
- Guest data does not appear in a roster, but staff data does: DG-5 governs it, and the refusal list is the enforcement point.

**Testing.** Forbidden-column refusal for each excluded field type. Validation report over a fixture with a duplicate, a missing required field and a bad email. Partial import leaves the valid rows written and the invalid rows unwritten. PIN-only count matches the file. Audit entry asserted.

### Project Structure Notes

New: `app/import/roster`, with the destination allowlist in `core/staff` so the domain — not the upload handler — decides what may be written.

### References

- [Source: planning-artifacts/epics.md#Story 1.10]
- [Source: prd.md#FR-82] including its `[NOTE FOR PM]`, [#FR-4], [#FR-6], [#§11 DG-1, DG-5]
- [Source: EXPERIENCE-WEB.md#Bulk import - mapping is the whole job]

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
