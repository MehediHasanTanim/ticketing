# Story 2.11: Guest call becomes a pre-resolved Request draft

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

*Sequenced after Story 3.1 — a draft Request cannot exist before Requests do.*

As a **telephone operator**,
I want a guest call from a room to arrive as a draft already resolved to that room and stay,
So that I am talking to the guest instead of typing a room number.

## Acceptance Criteria

**Given** a Property whose Jazz Core reports call events
**When** a guest calls from a Room
**Then** a Request draft pre-resolved to that Room and Stay appears to the operator handling the call within two seconds of JazzTicketing receiving the event (FR-54, NFR-3).

**Given** a call whose caller cannot be resolved to a Room
**When** the draft appears
**Then** it is an explicitly unresolved draft, never a wrongly-resolved one.

**Given** a draft the operator discards
**When** the call ends
**Then** the draft is not retained as a Request and nothing enters the queue.

## Tasks / Subtasks

- [ ] **T1. Call event to pre-resolved draft** (AC: 1)
  - [ ] A guest call from a Room reported by Jazz Core produces a Request draft pre-resolved to that Room and Stay, delivered to the operator handling the call **within two seconds** of JazzTicketing receiving the event (NFR-3).
  - [ ] Push it to the operator's open dispatch surface; do not require a refresh.
- [ ] **T2. Unresolved beats wrong** (AC: 2)
  - [ ] A caller who cannot be resolved to a Room yields an **explicitly unresolved** draft. Never guess a Room.
- [ ] **T3. Discarded drafts leave nothing** (AC: 3)
  - [ ] A discarded draft is not retained as a Request and nothing enters any queue or report.

## Dev Notes

**Prerequisites:** 2.2, 2.3 (capability gate), 2.5 (Stay context), **and Story 3.1** — a draft Request cannot exist before Requests do. This is one of the four declared cross-epic dependencies in epics.md; **schedule it after 3.1 regardless of its epic number.**

**Scope guards.** The draft and its delivery. The Request itself, its validation and its lifecycle are 3.1 and 3.2 — this story creates an unsaved draft and hands it to that flow.

**Implementation notes.**
- A draft is not a Request. Keep it out of the event store: hold it in ephemeral state (Redis) keyed to the operator's session with a short TTL, so T3 is true by construction rather than by a cleanup job.
- Two seconds is from **our** receipt of the event, not from the guest lifting the handset — the rest is Jazz Core's budget (2.2's separated measurement is what makes this assertable).
- Delivery needs the realtime channel to the console (WebSocket, SSE fallback). If that channel does not exist yet, build it here — it is also what 3.10's five-second live view needs.
- Capability-absent Properties show no affordance at all (2.3). Verify that before building the surface.

**Testing.** Latency test from event receipt to draft delivery. Unresolvable caller yields an unresolved draft, asserted not to carry a Room. Discard leaves no row in the event store and no queue entry. Capability-off Property renders no affordance.

### Project Structure Notes

Extends `adapters/jazzcore/` (call events), `edge/realtime` (the console channel), `app/dispatch/draft` (ephemeral). No `core` aggregate — deliberately.

### References

- [Source: planning-artifacts/epics.md#Story 2.11], [#Backlog order vs epic number]
- [Source: prd.md#FR-54], [#FR-78], [#FR-7], [#§7 NFR-3]
- [Source: ARCHITECTURE-SPINE.md#Stack] (realtime to console), [#AD-5]

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
