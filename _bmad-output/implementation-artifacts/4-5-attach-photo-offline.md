# Story 4.5: Attach a photo, on or offline

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want to photograph what I am reporting even with no signal,
So that the evidence goes with the job instead of being described later.

## Acceptance Criteria

**Given** a Job, Fault, Inspection, Glitch or Lost & Found Item
**When** I attach a photo from the device camera
**Then** it is compressed on device before upload and attached to that record (FR-62).

**Given** no connectivity
**When** I capture a photo
**Then** capture succeeds and the photo uploads with the queued action when connectivity returns.

**Given** a photo upload that fails
**When** the associated action has already been accepted
**Then** the failed photo never rolls back the action; the two upload independently (AD-7).

**Given** centrally configured attachment size and count limits
**When** I exceed them
**Then** the limit is enforced and stated to me before capture is wasted (FR-62).

## Tasks / Subtasks

- [ ] **T1. Attach across five record types** (AC: 1)
  - [ ] Photos attach to Jobs, Faults, Inspections, Glitches and Lost & Found Items from the device camera, **compressed on device** before upload.
- [ ] **T2. Capture offline** (AC: 2)
  - [ ] Capture succeeds with no connectivity; the photo uploads with the queued action when connectivity returns (4.3).
- [ ] **T3. A failed photo never rolls back an action** (AC: 3)
  - [ ] Photo and action upload **independently**; a failed photo leaves an accepted completion accepted (AD-7).
- [ ] **T4. Central limits, enforced early** (AC: 4)
  - [ ] Size and count limits configured centrally and enforced, stated to the user **before** capture is wasted.

## Dev Notes

**Prerequisites:** 4.1, 4.3. Consumed by 7.4 (Fault photos), 7.6 (inspection evidence), 9.1/9.7 (Glitch and L&F).

**Scope guards.** Capture, compression, queueing and attachment. Not the surfaces that request photos (7.4, 7.6, 9.7), not the required-photo completion rule (3.2/8.3 read it from configuration).

**Independence is the requirement most likely to be implemented backwards.** The natural design uploads the action with its photo as one multipart request, which means a 12 MB photo on a stairwell connection can block a completion the guest is waiting on. AD-7 says the opposite: the action goes, the photo follows.

**Implementation notes.**
- Compress on device to a target that survives being looked at by a supervisor on a console (a rejected room's evidence photo is the use case) — do not compress to thumbnail quality.
- Store the local file with the intent so a restart does not orphan it; clean up only after upload confirmation.
- Photos may contain guest belongings and, in a Lost & Found context, identifiable items. Storage is `adapters/storage/`; access is scoped by Property like everything else, and no photo URL is guessable.
- Limits are configuration, not constants (Consistency Conventions).

**Testing.** Offline capture then reconnect. Failed-photo-with-accepted-action test asserting the action stands. Limit enforcement before capture. Restart-with-pending-photo. Cross-property access attempt on a photo URL added to the isolation gate.

### Project Structure Notes

`clients/mobile/lib/media`, `adapters/storage/`, `app/attachment`. The attachment reference lives on the record; the bytes never do.

### References

- [Source: planning-artifacts/epics.md#Story 4.5]
- [Source: prd.md#FR-62], [#FR-58], [#FR-22], [#FR-46]
- [Source: ARCHITECTURE-SPINE.md#AD-7], [#AD-10]

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
