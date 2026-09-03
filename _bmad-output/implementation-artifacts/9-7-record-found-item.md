# Story 9.7: Record a found item

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **room attendant**,
I want to record what I found before I leave the room,
So that the item enters a register rather than a drawer.

## Acceptance Criteria

**Given** an item I have found
**When** I record it from the handset with photo, Location found, date, finder and category
**Then** it is created — and creation is refused without Location, finder and date (FR-46).

**Given** an item accepted into storage
**When** acceptance is recorded
**Then** a storage location and reference are assigned (FR-46).

**Given** no connectivity
**When** I record the item with its photo
**Then** it queues durably and applies on reconnection with the time found (FR-58, FR-62).

## Tasks / Subtasks

- [ ] **T1. Record from the handset** (AC: 1)
  - [ ] Photo, Location found, date, finder, category. **Creation refused without Location, finder and date.**
- [ ] **T2. Storage location on acceptance** (AC: 2)
  - [ ] A storage location and reference assigned when the item is accepted into storage.
- [ ] **T3. Offline with its photo** (AC: 3)
  - [ ] Queues durably and applies on reconnection **with the time found** (4.3, 4.5, AD-2).

## Dev Notes

**Prerequisites:** 4.1, 4.3, 4.5, 1.7 (Locations). Lost & Found capture was explicitly confirmed for **R4** by Tanim, not earlier.

**Scope guards.** Creating the item record and accepting it into storage. Chain of custody is 9.8; matching enquiries is 9.9.

**This is a compliance record as much as an operational one.** §4.5's description says so: Lost & Found runs its own chain of custody, which is a compliance matter. That framing shapes the small decisions — creation cannot be sloppy (T1's three required fields), and the record is the beginning of a custody chain that 9.8 must be able to defend.

**Implementation notes.**
- `Lost & Found Item` is the glossary term; the event is `LostAndFoundItemRecorded`.
- Photos here may depict identifiable property and, occasionally, documents. Storage is Property-scoped like all attachments (4.5), and retention timers (DG-2) start at the found date, not the recording date — which is why T3's observation time matters.
- Category is Property-configurable (versioned), because what a resort and a city hotel find differ.

**Testing.** Creation refused for each of the three missing required fields. Acceptance assigns a storage reference. Offline record with photo, asserting the **found** time drives retention. Cross-property access attempt on the item and its photo (isolation gate).

### Project Structure Notes

New: `core/lostfound/`, `app/lostfound/`, handset surface. Retention timers read the found date.

### References

- [Source: planning-artifacts/epics.md#Story 9.7]
- [Source: prd.md#FR-46], [#FR-62], [#§4.5 description], [#§11 DG-2]
- [Source: ARCHITECTURE-SPINE.md#AD-2], [#AD-7]

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
