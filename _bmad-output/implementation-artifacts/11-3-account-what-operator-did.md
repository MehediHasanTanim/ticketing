# Story 11.3: Account for what an operator did

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-04. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 11: The Jazzware operator surface. -->

## Story

As a **Jazzware operator administrator**,
I want every operator sign-in and provisioning action recorded where a customer's audit trail is not,
So that internal activity is accountable without putting internal records inside a customer's data.

## Acceptance Criteria

**Given** any operator sign-in, Tenant creation, operator-account change or support-access request
**When** it happens
**Then** it is recorded in an **operator audit trail** with actor, timestamp and what changed (FR-86, FR-6's counterpart for the internal surface).

**Given** the operator audit trail
**When** any entry is written or read
**Then** it carries no guest-identifying data, because the control plane holds none (FR-86, AD-4, AD-10).

**Given** a time-boxed support-access grant into a Tenant
**When** it is requested, approved, used or expires
**Then** it appears in **both** the operator audit trail and that Tenant's own audit trail, because the customer must be able to see it without asking Jazzware (FR-1, owned by Story 1.1).

**Given** an operator audit entry
**When** anyone attempts to alter or remove it
**Then** the attempt fails, on the same append-only terms as the Tenant audit trail (FR-6, FR-86).

## Tasks / Subtasks

- [ ] **T1. An operator audit trail, separate from any Tenant's** (AC: 1)
  - [ ] Operator sign-ins, Tenant creations, operator-account changes and support-access requests recorded with actor, timestamp and what changed.
- [ ] **T2. No guest data, structurally** (AC: 2)
  - [ ] Asserted by test rather than by convention: the control plane holds no guest data (AD-4, AD-10).
- [ ] **T3. A support grant appears on both sides** (AC: 3)
  - [ ] Request, approval, use and expiry appear in the operator trail **and** in that Tenant's own audit trail, so the customer can see it without asking Jazzware.
- [ ] **T4. Append-only** (AC: 4)
  - [ ] Alteration and removal fail, on the same terms as the Tenant audit trail and `cell.events`.

## Dev Notes

**Prerequisites:** 11.1, 11.2. AC-3's Tenant-side entry is **owned by Story 1.1** — this
story writes the operator-side half and asserts both appear.

**Scope guards.** Recording and reading operator activity. Not the support-access grant's
policy or lifecycle (1.1). Not Tenant audit retention (1.11).

**Implementation notes.**
- **The dual write in AC-3 is the design decision to make explicitly.** One entry belongs
  to the control plane and one to a regional cell, which is a write across a boundary AD-4
  deliberately keeps separate. Decide it and write it down: one transaction is not
  available across two stores, so this is an outbox or a reconciliation with a proof that
  neither side can be missing. A grant visible only to Jazzware is exactly the failure FR-1
  exists to prevent.
- Append-only means privileges revoked for the writing role, as `cell.events` does — not
  an application-level rule that a later migration can quietly relax.
- Retention for operator entries is a Jazzware policy, not a Tenant setting. Do not read it
  from Tenant configuration.

**Testing.** Append-only proved by attempting UPDATE and DELETE as the application role.
A no-guest-data test over the whole control-plane schema, not just the audit table. A
support-grant test asserting the entry on both sides, including the failure case where the
cell write does not land.

### Project Structure Notes

Operator audit storage in the control plane; the Tenant-side entry goes through
Story 1.1's existing audit path rather than a second one.

### References

- [Source: planning-artifacts/epics.md#Story 11.3]
- [Source: prd.md#FR-86], [#FR-1], [#FR-6], [#§11 DG-1]
- [Source: ARCHITECTURE-SPINE.md#AD-4], [#AD-10], [#AD-13]

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
