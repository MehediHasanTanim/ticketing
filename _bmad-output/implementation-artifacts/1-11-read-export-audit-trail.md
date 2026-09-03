# Story 1.11: Read and export the audit trail

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property administrator**,
I want an immutable record of every state and configuration change,
So that I can answer "who changed this, and what was it before" without asking engineering.

## Acceptance Criteria

**Given** any state change on a Job, Glitch, Room Status, Lost & Found Item or configuration value
**When** it occurs
**Then** an audit entry records the actor, the timestamp and the previous value (FR-6)
**And** the entry is immutable — no interface, role or API can alter or remove it.

**Given** I am a property administrator or above
**When** I open the audit trail for my scope
**Then** I can read it, and a user below that level cannot.

**Given** a date range
**When** I request an export
**Then** a file is produced within my Property scope and the export itself is recorded in the audit trail with actor, scope and period.

**Given** a Tenant retention setting
**When** it is applied
**Then** audit retention stays within the bounds set by DG-2 and cannot be configured outside them.

## Tasks / Subtasks

- [ ] **T1. Audit entries as a consequence of events, not a parallel write** (AC: 1)
  - [ ] Every state change on a Job, Glitch, Room Status, Lost & Found Item and configuration value produces an audit entry with actor, timestamp and **previous value**.
  - [ ] Derive audit entries from the event log rather than writing them separately — a second write path is a second thing to forget when Story 7.3 adds a state transition.
- [ ] **T2. Immutability** (AC: 1)
  - [ ] No interface, role or API can alter or remove an entry. Enforce at the storage layer (append-only, revoked UPDATE/DELETE), not by convention.
- [ ] **T3. Read scope** (AC: 2)
  - [ ] Readable by property administrators and above; refused below that level server-side.
- [ ] **T4. Export** (AC: 3)
  - [ ] Export for a date range within the requester's Property scope, and **record the export itself** in the audit trail with actor, scope and period.
- [ ] **T5. Retention within DG bounds** (AC: 4)
  - [ ] Retention is configurable per Tenant (1.6) but cannot be set outside the bounds in §11 (DG-2). Refuse an out-of-bounds value; do not clamp it silently.

## Dev Notes

**Prerequisites:** 1.0 (event store), 1.6 (Tenant retention setting), 1.2/1.3 (scope and actors).

**Scope guards.** The audit read and export surface, plus the mechanism that guarantees entries exist. Not the reporting exports in 10.3 — those are report data and go through their own path, though both are recorded here.

**Implementation notes.**
- "Previous value" is the requirement that catches naive implementations. An event-sourced log gives you the new value for free; the previous value must be captured deliberately, either in the event or by folding the prior state at projection time. Choose one and use it everywhere — a mix means some entries answer "what was it before" and some do not.
- Audit spans aggregates that arrive across four releases (Glitch in 9.1, Lost & Found in 9.7, Room Status in 2.1). Build the projection so a **new aggregate is picked up by registration**, not by editing this story's code — otherwise every later epic silently drops out of the audit trail.
- Guest identifiers are never logged (AD-10), and an audit entry is a log. Where an audited change concerns a Stay, reference it by id and store no guest name in the entry.
- Exports are CSV and PDF elsewhere (FR-75); this story needs only a machine-readable export, but reuse the same export recording so there is one place exports are counted.

**Testing.** Immutability attempt through API and direct SQL as the application role — both must fail. Previous-value assertion on a configuration change and on a Job transition. A new aggregate registered in a test picks up auditing with no change to the audit code. Out-of-bounds retention refused. Export recorded.

### Project Structure Notes

New: `app/audit/` (projection and read model), storage constraints in `ops/` migrations. Registration of auditable aggregates lives in `app/audit/registry`.

### References

- [Source: planning-artifacts/epics.md#Story 1.11]
- [Source: prd.md#FR-6], [#FR-75], [#§11 DG-2, DG-3]
- [Source: ARCHITECTURE-SPINE.md#AD-1], [#AD-10], [#Consistency Conventions] (logging)

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
