# Story 2.2: Connect a Property to Jazz Core and see its health

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **property administrator**,
I want to see my Property's Jazz Core connection state and last successful exchange per event type,
So that I can tell whether a missing room status is our problem or theirs without escalating to engineering.

## Acceptance Criteria

**Given** a configured Property
**When** I open the integration health surface
**Then** I see current health, the last successful exchange per event type, and whether a failure is JazzTicketing-side or Jazz Core-side (FR-49)
**And** no engineering access is required to read any of it.

**Given** a connection that becomes degraded or disconnected
**When** the state changes
**Then** the roles configured for integration alerts are notified, and health history is retained for troubleshooting (FR-49, NFR-8).

**Given** any health surface in either client
**When** a PMS or PBX vendor is involved upstream
**Then** no vendor identity is displayed, because JazzTicketing does not know it (FR-49).

## Tasks / Subtasks

- [ ] **T1. The one Jazz Core port** (AC: 1)
  - [ ] `core/ports/JazzCorePort` with one owner; `adapters/jazzcore/` is **the only place a Jazz Core type exists** (AD-5). No Jazz Core DTO leaks into `core`, `app` or either client.
- [ ] **T2. Health surface** (AC: 1)
  - [ ] Per Property: current health, last successful exchange **per event type**, and whether a failure is JazzTicketing-side or Jazz Core-side.
  - [ ] Readable without engineering access, by a property administrator.
- [ ] **T3. Degradation notifies** (AC: 2)
  - [ ] A transition to degraded or disconnected notifies the roles configured for integration alerts; health history retained for troubleshooting (NFR-8).
- [ ] **T4. No vendor identity, anywhere** (AC: 3)
  - [ ] No PMS or PBX vendor name appears on any surface. JazzTicketing does not know it and must not infer or display it.

## Dev Notes

**Prerequisites:** 1.2, 1.0. **Every other Epic 2 story depends on this one** — build it first.

**Scope guards.** Connection state and health only. Capability negotiation is 2.3, contract versioning is 2.4, actual data flow is 2.5/2.6.

**The dependency posture is the design.** NFR-11: Jazz Core is an external system with an agreed SLO, not an in-process guarantee. Every call is timeout-bounded and retried within a budget; **no user-facing operation blocks indefinitely on it**. JazzTicketing's own availability target excludes Jazz Core outages, which are reported separately — which is only possible if this story separates the two latencies from the start.

**Open dependency, not a blocker.** The Jazz Core SLO, the joint incident model and the test environment are Open Question 1 (owner: Tanim with the Jazz Core owner). Capability is confirmed; the operational half is not. Build the measurement so the SLO can be asserted once agreed — do not invent a threshold and present it as the SLO.

**Implementation notes.**
- Separate JazzTicketing-side and Jazz Core-side latency at the point of measurement (timestamp on send, on first byte, on completion). Reconstructing it later from one duration is impossible.
- "Last successful exchange per event type" means health is a per-event-type projection, not a single ping. A connection that is up but has not delivered room status for an hour is degraded.
- Structured logs carry the Jazz Core exchange id (Consistency Conventions) — add it here so every later Epic 2 story inherits traceability.

**Testing.** Fake `JazzCorePort` returning: healthy, slow, timing out, erroring, and returning a malformed payload. Assert each maps to the correct health state and the correct side attribution. Assert no adapter type is importable from `core` (the 1.0 boundary lint covers this — extend it if it does not).

### Project Structure Notes

New: `core/ports/jazzcore.ts`, `adapters/jazzcore/`, `app/integration/health`. The adapter is the boundary: one owner, per AD-5.

### References

- [Source: planning-artifacts/epics.md#Story 2.2]
- [Source: prd.md#FR-49], [#§7 NFR-8, NFR-11], [#§14 Open Question 1]
- [Source: ARCHITECTURE-SPINE.md#AD-5]

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
