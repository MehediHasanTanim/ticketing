# Story 4.8: Leave nothing behind on a shared handset

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **property administrator**,
I want guest data gone from the device when a person signs out,
So that a handset left in a corridor is not a data-protection incident.

## Acceptance Criteria

**Given** a Staff Member signs out or is timed out
**When** the session ends
**Then** guest names and Stay context are not retained on device (FR-64, DG-1)
**And** queued actions belonging to that Staff Member are retained, because they are their work, not guest context (FR-4).

**Given** the local store
**When** it is at rest
**Then** it is encrypted, and the encryption is verified as part of the release (FR-64, NFR-7).

**Given** a remote sign-out issued for a device
**When** the device next contacts the server
**Then** the session is invalidated (FR-64).

## Tasks / Subtasks

- [ ] **T1. Guest context leaves, work stays** (AC: 1)
  - [ ] On sign-out or timeout, guest names and Stay context are **not retained on device** (DG-1).
  - [ ] Queued actions belonging to that Staff Member **are** retained — they are their work, not guest context (4.1, 4.3).
- [ ] **T2. Encrypted at rest, verified** (AC: 2)
  - [ ] The local store is encrypted, and the encryption is verified as part of the release (NFR-7).
- [ ] **T3. Remote sign-out** (AC: 3)
  - [ ] A remote sign-out issued for a device invalidates the session at next contact.

## Dev Notes

**Prerequisites:** 4.1, 4.3, 4.5 (pending photos are part of what must be handled).

**The wire contract already exists.** `GET /auth/sessions` and
`DELETE /auth/sessions/{sessionId}` are designed in `contracts/openapi.yaml`, marked
`x-story: "4.8"` / `x-implemented: false`, and today answer 501 `not_implemented` (see
`docs/decisions/0002`). This story implements them and flips both flags. The revocation
returns **202, not 204**, deliberately: the server has accepted the revocation, it has not
confirmed the device acted on it — which is T3's "at next contact" stated in the status
code instead of only in prose. The session list carries a device label and a Staff Member
id and never a guest name or Stay context (DG-1). Whether this listing is an
administrator surface or an audit read is **not settled by any FR** — FR-64 only implies
it; raise it rather than assuming.

**Scope guards.** On-device data protection. Not authentication (4.1), not server-side session policy beyond the remote-signout hook.

**The distinction in T1 is the whole story.** Sign-out must clear what belongs to the guest and keep what belongs to the worker. Clearing everything loses an attendant's queued completions — the failure 4.3 exists to prevent. Clearing nothing leaves a handset in a corridor holding guest names, which is a data-protection incident under DG-1. Implement the split by **classifying local tables**, not by hoping the wipe list is complete.

**Implementation notes.**
- Classify every Drift table explicitly as `guest_context` or `staff_work`, and make sign-out iterate the classification. A new table added by Story 7.3 then gets classified rather than silently retained.
- Pending photos may depict guest belongings: keep the file if it belongs to a queued action, and ensure it is not readable by the next signed-in user's session.
- Encryption verification means an actual test — mount the store outside the app context and assert it is unreadable — not a configuration flag review.
- Remote sign-out is "at next contact", so a device offline for a shift stays signed in. That is accepted; do not attempt a stronger guarantee the connectivity model cannot deliver.

**Testing.** Sign-out then inspect the local store: no guest name, queued actions present. New-table classification test that fails on an unclassified table. Encryption-at-rest test. Remote sign-out honoured at next contact. Pending-photo isolation between two users.

### Project Structure Notes

`clients/mobile/lib/storage` (table classification + wipe), session invalidation in `edge/`.

### References

- [Source: planning-artifacts/epics.md#Story 4.8]
- [Source: prd.md#FR-64], [#FR-4], [#§7 NFR-7], [#§11 DG-1]
- [Source: EXPERIENCE.md] shared-device rules
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
