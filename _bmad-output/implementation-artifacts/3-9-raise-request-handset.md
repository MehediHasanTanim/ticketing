# Story 3.9: Raise a Request from the handset

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

*Sequenced after Stories 4.1 and 4.2 — the FR specifies the mobile surface.*

As a **room attendant**,
I want to raise a request from where I am standing,
So that a problem I find becomes work without a trip to the front desk.

## Acceptance Criteria

**Given** I am signed in on a handset
**When** I raise a Request against my current Location
**Then** it enters the same lifecycle as a front-office Request and is indistinguishable in behaviour (FR-17)
**And** its origin is recorded so staff-raised volume is separately reportable.

**Given** no connectivity
**When** I raise a Request
**Then** it queues durably and applies on reconnection with the time I raised it (FR-58, AD-7).

## Tasks / Subtasks

- [ ] **T1. Raise from the current Location** (AC: 1)
  - [ ] A signed-in Staff Member raises a Request against their current Location; it enters the **same lifecycle** as a front-office Request and is indistinguishable in behaviour (FR-17).
  - [ ] Origin recorded so staff-raised volume is separately reportable.
- [ ] **T2. Offline is normal** (AC: 2)
  - [ ] With no connectivity it queues durably and applies on reconnection **with the time I raised it** (4.3, AD-2).

## Dev Notes

**Prerequisites:** 3.1, 3.2, **and Stories 4.1 and 4.2** — the FR specifies the mobile surface, which Epic 4 delivers. Declared cross-epic dependency; **schedule after 4.2 regardless of epic number.** The offline criterion needs 4.3.

**Scope guards.** The handset's raise-a-Request path. No new lifecycle, no new validation rules, no new catalog behaviour — "indistinguishable in behaviour" is the requirement, so this story is a client surface plus an origin field, not a second creation path on the server.

**Implementation notes.**
- Reuse 3.1's command. If the handset needs its own endpoint shape, it still hits the same handler; two handlers means two sets of validation and they will diverge.
- "Current Location" on a handset is ambiguous — an attendant is in a Room, an engineer may be in a plant room. Resolve it from the Staff Member's current context (the Room they have open, or an explicit pick), never from device GPS.
- Thumb-zone and greyscale rules apply (UX-DR-1, UX-DR-4): raising a Request is a one-handed action on a baseline device, gloved.
- Arabic: the form mirrors by logical direction, and any Room number renders in Western digits inside a bidi isolate (UX-DR-2).

**Testing.** Behavioural equivalence test: a staff-raised and a front-office Request with the same catalog entry produce identical lifecycle, SLA and routing outcomes, differing only in origin. Offline raise with observation-time assertion. Origin appears in a report query. Greyscale and RTL render checks on the surface.

### Project Structure Notes

`clients/mobile` surface reusing `app/job` create. Origin is a field on `RequestLogged`, set by the edge from the authenticated context — not supplied by the client.

### References

- [Source: planning-artifacts/epics.md#Story 3.9], [#Backlog order vs epic number]
- [Source: prd.md#FR-17], [#FR-58], [#FR-61], [#FR-63]
- [Source: EXPERIENCE.md] raise-a-Request flow
- [Source: ARCHITECTURE-SPINE.md#AD-2], [#AD-7], [#AD-12]

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
