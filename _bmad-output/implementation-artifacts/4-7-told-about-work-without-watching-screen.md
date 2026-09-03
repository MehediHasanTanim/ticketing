# Story 4.7: Be told about work without watching the screen

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want a push when work is dispatched to me,
So that I do not have to keep checking the handset.

## Acceptance Criteria

**Given** a Shared Device with me signed in
**When** a dispatch, escalation or reassignment relevant to my role and Property occurs
**Then** the push reaches **the signed-in Staff Member**, not the device's last user (FR-60, FR-4).

**Given** a Job already accepted by someone else
**When** notification would be delivered to other candidates
**Then** it is suppressed (FR-60, FR-67).

**Given** a push I missed — the device was off, or the notification was cleared
**When** I open the app
**Then** I can see in-app what I was notified about (FR-60).

**Given** the routing rules Epic 5 configures
**When** they exist
**Then** this client honours them without a second decision of its own; the domain decides what is sent and the adapter delivers it (AD-8).

## Tasks / Subtasks

- [ ] **T1. The signed-in person, not the last user** (AC: 1)
  - [ ] Dispatch, escalation and reassignment relevant to the signed-in Staff Member's role and Property reach **that person** on a Shared Device.
- [ ] **T2. Already accepted means silent** (AC: 2)
  - [ ] Notification suppressed for a Job already accepted by someone else (5.3).
- [ ] **T3. A missed push is still visible** (AC: 3)
  - [ ] What the Staff Member was notified about is visible in-app even if the push never arrived.
- [ ] **T4. The domain decides, the adapter delivers** (AC: 4)
  - [ ] This client honours Epic 5's routing rules without a second decision of its own (AD-8).

## Dev Notes

**Prerequisites:** 4.1, 4.2, 3.5/3.8 (the events being notified), 1.0 (`firebase_messaging` registration). Consumed by Epic 5, which owns the routing.

**Scope guards.** Device registration, receipt, and the in-app notification record. **Routing, suppression rules, quiet hours and channels are Epic 5** — FR-60 is owned here because registration and receipt are client work, and epics.md's owner-vs-consumer table records the split. Do not implement routing logic in the client.

**Implementation notes.**
- Token registration is per **(device, signed-in Staff Member)**. On sign-out, unregister that pairing — otherwise the next person's handset receives the previous person's escalations, which is both a data leak and the fastest way to teach staff to ignore notifications.
- The in-app record (T3) is the durable truth; the push is a best-effort transport. Build the record first and treat delivery as advisory.
- FCM delivers to both platforms (APNs behind it for iOS); the server adapter is unchanged by the Flutter decision.
- Notification content on a shared handset must not carry guest identity — the lock screen never carries it (EXPERIENCE.md).

**Testing.** Two-user handoff test asserting notifications follow the signed-in person and stop for the signed-out one. Suppression on already-accepted. Missed-push test: suppress delivery, assert the in-app record exists. Lock-screen content assertion (no guest identity). Cold-start delivery on the baseline device.

### Project Structure Notes

`clients/mobile/lib/notifications` (registration and receipt), `adapters/push/` (server, unchanged), `app/notification` intents. Suppression is evaluated once in the domain (AD-8).

### References

- [Source: planning-artifacts/epics.md#Story 4.7], [#Ownership and consumption]
- [Source: prd.md#FR-60], [#FR-67], [#FR-4]
- [Source: ARCHITECTURE-SPINE.md#AD-8], [#Stack] (push)
- [Source: EXPERIENCE.md] shared-device rules

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
