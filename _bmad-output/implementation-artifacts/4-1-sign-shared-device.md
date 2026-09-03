# Story 4.1: Sign in on a Shared Device

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want to sign in on the handset at the linen room with a PIN or badge in seconds,
So that starting a shift is not a login problem.

## Acceptance Criteria

**Given** a Property-issued handset at the sign-in screen
**When** I enter my PIN or present my badge
**Then** sign-in completes in under five seconds and my configured language is applied immediately (FR-4, FR-61).

**Given** a configured inactivity timeout
**When** it elapses
**Then** the device returns to the sign-in screen, and my queued offline actions survive the timeout and later sync under **my** identity (FR-4, AD-7).

**Given** I am signed in with a PIN only
**When** I attempt to reach a configuration or reporting surface
**Then** it is unavailable, and a direct request for it is refused server-side (FR-4, AD-11).

**Given** a second Staff Member signing in after me
**When** they use the same handset
**Then** my queued work is unaffected and remains attributed to me, because idempotency is keyed to the person and not the device (AD-7).

## Tasks / Subtasks

- [ ] **T1. Under five seconds, PIN or badge** (AC: 1)
  - [ ] Sign-in completes in under five seconds on a Property-issued handset, and the Staff Member's configured language applies immediately (1.3, FR-61).
- [ ] **T2. Timeout without loss** (AC: 2)
  - [ ] Configurable inactivity timeout returns the device to the sign-in screen. Queued offline actions belonging to the signed-out Staff Member **survive** and later sync under their identity.
- [ ] **T3. A PIN is not an administrator** (AC: 3)
  - [ ] Configuration and reporting surfaces are unavailable to a PIN credential, and a direct request for them is refused **server-side** (AD-11).
- [ ] **T4. Shared means shared** (AC: 4)
  - [ ] A second Staff Member signing in leaves the first person's queued work untouched and attributed to them, because idempotency is keyed to **the person, not the device** (AD-7).

## Dev Notes

**Prerequisites:** 1.3 (PIN credential), 1.5 (so the auth stub is gone), 1.0 (Flutter scaffold with Drift). **Prerequisite for 3.9, 4.2 onward, and all of Epic 7's mobile flows.**

**Scope guards.** Sign-in, sign-out, timeout and identity on a shared device. Not the queue (4.2), not offline mechanics (4.3), not data hygiene on sign-out (4.8 — closely related, deliberately separate).

**BYOD is not a case to handle.** Devices are Property-issued Shared Devices; a personal handset in use is governed by the **same** shared-device rules, so the client never reasons about device ownership. Do not add an ownership branch.

**The idempotency key is the design decision to respect.** `(tenant_id, property_id, staff_member_id, client_key)`, retained 30 days. A device-scoped key would collide across shifts — two attendants on one handset producing colliding writes — which is exactly why the spine scoped it to the person. Do not "simplify" it to a device id.

**Implementation notes.**
- Five seconds is a measured budget on the **baseline device** (Android 10 / iOS 15 / 3 GB, NFR-5), not on a developer's phone. Measure on baseline hardware or an equivalent profile.
- Language applies at sign-in and reverts for the next person — so locale is session state, not app state.
- The lock screen never carries guest identity (EXPERIENCE.md shared-device rules).
- Badge input path: keep it behind the same credential abstraction as PIN so a property with badges needs no second flow.

**Testing.** Sign-in latency on baseline profile. Timeout with queued actions: assert survival and correct attribution after a different user signs in. PIN scope refusal via direct API call. Two-user queue-isolation test. RTL sign-in render (Arabic).

### Project Structure Notes

`clients/mobile` auth and session; server side reuses 1.3's credential model. The durable queue's ownership field is written here even though 4.3 implements the queue — agree the schema across both stories before starting either.

### References

- [Source: planning-artifacts/epics.md#Story 4.1], [#Ownership and consumption]
- [Source: prd.md#FR-4], [#FR-61], [#FR-64], [#§7 NFR-5]
- [Source: EXPERIENCE.md] shared-device rules
- [Source: ARCHITECTURE-SPINE.md#AD-7], [#AD-11], [#AD-12]

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
