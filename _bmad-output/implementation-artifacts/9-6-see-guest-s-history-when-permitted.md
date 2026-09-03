# Story 9.6: See a guest's history when it is permitted

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **front office user**,
I want to know this guest has been let down before,
So that the second failure is handled like a second failure.

## Acceptance Criteria

**Given** a Stay I open
**When** prior Glitches and Recoveries exist for that guest at this Property
**Then** they are shown to me (FR-45).

**Given** the Tenant-level cross-Property setting
**When** it is **off**, which is the default
**Then** no other Property's history is shown; when a tenant administrator turns it on, the change is recorded in the audit trail (FR-45, FR-83).

**Given** any of this history
**When** it is displayed, exported or logged
**Then** it respects DG-1, DG-2 and DG-3, and no guest-identifying data reaches a cross-Property view (FR-45, FR-76).

## Tasks / Subtasks

- [ ] **T1. Prior Glitches and Recoveries at this Property** (AC: 1)
  - [ ] Shown to a front office user opening a Stay.
- [ ] **T2. Cross-Property is Tenant-level and off by default** (AC: 2)
  - [ ] **Off by default**; when a tenant administrator enables it (1.6), the change is recorded in the audit trail.
- [ ] **T3. Governance travels with it** (AC: 3)
  - [ ] Respects DG-1, DG-2 and DG-3; **no guest-identifying data reaches a cross-Property view** (10.4, AD-4).

## Dev Notes

**Prerequisites:** 9.1, 9.3, 1.6 (the Tenant setting), 2.5 (Stays).

**Scope guards.** Showing history to a front office user. Not the corporate comparison view (10.4), not the Glitch report (10.2).

**The tension in this story is real and the PRD resolves it deliberately.** Knowing a guest has been let down before is exactly what a front office agent needs to handle the second failure well. It is also a widening of who can see one person's history across a management company — which is why cross-Property visibility is Tenant-level, **off by default**, and audited when enabled. Implement the default as off; do not enable it in a demo fixture and forget.

**Implementation notes.**
- Cross-Property history crosses a **region** boundary in some Tenants, and a Property never leaves its region (AD-4) while the control plane holds no guest data. So a cross-Property guest history cannot be assembled in the control plane. Decide the mechanism explicitly — most likely a per-region query fanned out and joined at read time, with nothing persisted centrally — and record the decision, because a naive central cache would violate AD-4 and DG-4 at once.
- Matching a guest across Properties requires an identifier we are permitted to hold (DG-1's allowlist from 2.5). If the permitted field set cannot support reliable matching, say so rather than widening ingestion — that would be a PRD change.
- Erasure (DG-3) must remove the guest from all regions' views.

**Testing.** Same-Property history shown. Cross-Property off by default, asserted. Enabled: history from a second Property in the **same** region and in a **different** region, with nothing persisted centrally. Audit entry on enabling. Erasure removes it everywhere. Cross-Property view carries no guest identifier.

### Project Structure Notes

`app/incident/guest-history` with a per-region read path. **No guest data in the control plane** — assert it in the test 1.0 established.

### References

- [Source: planning-artifacts/epics.md#Story 9.6]
- [Source: prd.md#FR-45], [#FR-83], [#FR-76], [#§11 DG-1, DG-2, DG-3, DG-4]
- [Source: ARCHITECTURE-SPINE.md#AD-4], [#AD-10]

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
