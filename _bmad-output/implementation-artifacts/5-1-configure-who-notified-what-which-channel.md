# Story 5.1: Configure who is notified, of what, on which channel

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 5: Escalation and notification routing. -->

## Story

As a **property administrator**,
I want to decide per Department and event type which roles are notified and how,
So that the right people hear about the right things at this property.

## Acceptance Criteria

**Given** a Department and an event type
**When** I configure notification routing
**Then** I select the roles notified and the channels used, from push and in-app, with email available for management-level events (FR-65).

**Given** SMS
**When** I open channel options
**Then** it is configurable but **off by default**, pending per-Property cost confirmation (FR-65).

**Given** a routing rule
**When** it is saved
**Then** it is Property-scoped with a Tenant default, versioned and effective-dated, and attributed to me (FR-65, AD-9, FR-6).

**Given** a Department with no routing configuration
**When** an event occurs
**Then** it routes to the Department default rather than to no one (FR-68).

## Tasks / Subtasks

- [ ] **T1. Rules per Department and event type** (AC: 1)
  - [ ] Select notified roles and channels per (Department, event type). Channels: push and in-app, with email for management-level events.
- [ ] **T2. SMS configurable, off by default** (AC: 2)
  - [ ] `[ASSUMPTION]` off pending per-Property cost confirmation. Ship the configuration, default off, and do not enable it for a demo.
- [ ] **T3. Versioned, scoped, attributed** (AC: 3)
  - [ ] Property-scoped with a Tenant default, versioned and effective-dated (1.9's mechanism), attributed to the editor.
- [ ] **T4. No configuration routes to the Department default, never to no one** (AC: 4)
  - [ ] An unconfigured Department falls back to its default. Silence is never the outcome.

## Dev Notes

**Prerequisites:** 1.9 (config mechanism), 1.3 (roles), 4.7 (a push channel exists).

**Scope guards.** Routing configuration. Suppression is 5.3, quiet hours are 5.4, chain intervals are 5.2, device receipt is 4.7. This epic consumes FR-11, FR-14 and FR-60 and adds no criteria for them.

**Notification intents live in the domain; delivery is an adapter concern** (AD-8). The domain emits "this Job needs role X told"; `adapters/push|email|sms` deliver. An adapter that decides *whether* to send has taken a domain decision, and suppression then happens in two places.

**Implementation notes.**
- Model the rule as (department, event_type) → (roles, channels). Keep event types as a closed enum in `contracts/` so a new event in Epic 7 must be added deliberately rather than silently going unrouted.
- The fallback in T4 is the anti-silence guard. Make "no rule" resolve to a default rather than to an empty recipient list, and log when the fallback is used so a property with a gap is visible.
- Email for management-level events only — do not open email to line-staff dispatch, which is how notification fatigue starts.

**Testing.** Rule resolution matrix including the unconfigured fallback, asserting a non-empty recipient set in every case. SMS default-off assertion. Versioning test across a rule change mid-Job. Attribution in the audit trail.

### Project Structure Notes

`core/notification/` (intents and rule resolution — pure), `adapters/push|email|sms/`, `app/notification`. Rule data via 1.9's configuration store.

### References

- [Source: planning-artifacts/epics.md#Story 5.1], [#Ownership and consumption]
- [Source: prd.md#FR-65] and its `[ASSUMPTION]`, [#FR-68], [#FR-6]
- [Source: ARCHITECTURE-SPINE.md#AD-8], [#AD-9]

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
