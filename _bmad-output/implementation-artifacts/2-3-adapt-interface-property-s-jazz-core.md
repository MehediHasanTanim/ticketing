# Story 2.3: Adapt the interface to a Property's Jazz Core capabilities

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **property administrator**,
I want features that depend on a capability my Jazz Core deployment does not offer to be absent rather than broken,
So that staff never tap something that cannot work.

## Acceptance Criteria

**Given** a Property whose Jazz Core deployment does not report call events
**When** an operator opens the dispatch surface
**Then** no guest-call-to-Request affordance is shown at all — not a disabled or failing one (FR-78).

**Given** a capability that is absent
**When** I open integration health
**Then** the missing capability is named, with the dependent JazzTicketing feature it disables and the reason (FR-49, FR-77).

**Given** a feature disabled by capability absence at a Property
**When** SLA and adoption reporting is produced for that Property
**Then** that feature is excluded from the figures rather than counted as a failure (FR-78, FR-74).

## Tasks / Subtasks

- [ ] **T1. Discover capabilities per Property** (AC: 1)
  - [ ] Query and cache which Jazz Core capabilities a Property's deployment reports. Capability state is per Property, not per Tenant.
- [ ] **T2. Absent capability means an absent affordance** (AC: 1)
  - [ ] A Property whose Jazz Core does not report call events shows **no** guest-call-to-Request affordance — not a disabled one, not a failing one.
  - [ ] Drive this from capability state server-side; the client asks what it may show and does not decide.
- [ ] **T3. Name it in health** (AC: 2)
  - [ ] Integration health names each missing capability, the dependent JazzTicketing feature it disables, and the reason.
- [ ] **T4. Exclude, do not penalise** (AC: 3)
  - [ ] A feature disabled by capability absence is **excluded** from that Property's SLA and adoption reporting rather than counted as a failure.

## Dev Notes

**Prerequisites:** 2.2. Consumed by 2.11 (call events), 2.12 (wake-up), 2.9 (phone postings), 6.3 (adoption exclusion).

**Scope guards.** Capability discovery and its interface consequences. Not contract version tolerance (2.4) — related but distinct: 2.4 handles Jazz Core being a different *version*, this handles a Property's deployment lacking a *feature*.

**Implementation notes.**
- Model capability as a set of named flags resolved per Property, with an explicit `unknown` state distinct from `absent`. Treating unknown as absent hides a broken discovery call; treating it as present produces the failing affordance this story exists to prevent.
- The reporting exclusion (T4) must be expressible in the reporting layer, so record capability state **with the period** — a Property that gained call events in March should not have February counted against it.
- Do not gate a capability behind an environment variable. Configuration is versioned records, never env-var feature behaviour (Consistency Conventions).

**Testing.** Fixture Properties: full capabilities, no call events, unknown. Assert affordance presence, health text, and the reporting exclusion in each. Assert the client renders from server-supplied capability, verified by a client test with a stubbed response.

### Project Structure Notes

Extends `adapters/jazzcore/` (discovery) and `app/integration/capability`. Capability resolution is read by `edge/` when it composes what a client may show — one place, so no screen invents its own check.

### References

- [Source: planning-artifacts/epics.md#Story 2.3]
- [Source: prd.md#FR-78], [#FR-49], [#FR-54], [#FR-74]
- [Source: ARCHITECTURE-SPINE.md#AD-5], [#Consistency Conventions] (config)

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
