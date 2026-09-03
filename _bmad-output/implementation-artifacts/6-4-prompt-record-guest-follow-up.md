# Story 6.4: Prompt and record guest follow-up

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 6: Manager visibility and guest follow-up. -->

## Story

As a **front office user**,
I want to be prompted to call the guest after their request is done and to record what they said,
So that a fixed problem does not become a bad review nobody saw coming.

## Acceptance Criteria

**Given** a completed Request whose Catalog Entry has follow-up configured
**When** completion is recorded
**Then** a follow-up prompt appears on the front office queue with the Room and the Stay (FR-15).

**Given** a follow-up
**When** I perform it through the property's existing guest channel and record the outcome
**Then** the outcome is stored and reportable, and JazzTicketing itself never contacts the guest (FR-15, PRD §5).

**Given** a Stay that has checked out
**When** the follow-up window is evaluated
**Then** the window is closed and the prompt is withdrawn (FR-53).

**Given** an outcome of guest dissatisfaction recorded in R1
**When** Epic 9 (FR-40) has not yet shipped
**Then** the outcome is recorded as a service failure, is reportable, and carries a marker that a Glitch is pending
**And** when Epic 9 ships, those markers create the linked Glitch with the Request referenced — this R1→R4 seam is deliberate and is the one place a story's full behaviour spans releases (FR-15, FR-40).

## Tasks / Subtasks

- [ ] **T1. Prompt where configured** (AC: 1)
  - [ ] A completed Request whose Catalog Entry has follow-up configured raises a prompt on the front office queue with the Room and the Stay (1.8).
- [ ] **T2. Record the outcome; never contact the guest** (AC: 2)
  - [ ] The outcome is stored and reportable. **JazzTicketing itself never contacts the guest** — follow-up happens through the Property's existing channel, typically a call to the Room (§5).
- [ ] **T3. Check-out closes the window** (AC: 3)
  - [ ] An ingested check-out (2.5) closes the follow-up window and withdraws the prompt.
- [ ] **T4. The R1 to R4 seam** (AC: 4)
  - [ ] Dissatisfaction is recorded as a service-failure outcome, reportable, carrying a **glitch-pending marker**.
  - [ ] Story 9.1 converts those markers into linked Glitches when Epic 9 ships. Leave the marker queryable and the conversion idempotent.

## Dev Notes

**Prerequisites:** 3.2 (completion), 1.8 (per-Catalog-Entry configuration), 2.5 (check-out). **Paired with Story 9.1**, which closes the seam.

**Scope guards.** Prompting and recording. No guest messaging of any kind — no SMS, no email, no in-room tablet. That is a §5 non-goal and adding it is a PRD change, not a story extension.

**This is the only story in the plan whose full behaviour spans releases**, and it is deliberate: epics.md declares it. In R1 dissatisfaction is a recorded outcome with a marker; in R4 those markers become Glitches with the originating Request referenced. Both ends are specified so neither is a surprise. Do not fake a Glitch model in R1 to close the seam early — that would put a second Glitch definition in the system ahead of 9.1.

**Implementation notes.**
- Make the marker a first-class field with a stable meaning (`glitch_pending`), not a free-text note, so 9.1's backfill is a query rather than a parse.
- The conversion must be idempotent and must preserve the original outcome record — 9.1 links, it does not overwrite.
- The follow-up window is bounded by check-out **or** a configured duration; a Stay that never checks out (data gap during a Jazz Core outage) must not leave a prompt forever.

**Testing.** Prompt appears only for configured Catalog Entries. Check-out withdraws it. Outcome reportable. Marker queryable and the simulated 9.1 backfill idempotent over the same fixture twice. Window bounded when check-out never arrives. Assert no outbound guest-contact code path exists.

### Project Structure Notes

`core/job/follow-up` (outcome + marker), `app/frontoffice/followup` queue. The Glitch aggregate arrives in 9.1 and must not be anticipated here.

### References

- [Source: planning-artifacts/epics.md#Story 6.4], [#Observed and accepted]
- [Source: prd.md#FR-15], [#FR-40], [#FR-53], [#§5 Non-Goals]
- [Source: ARCHITECTURE-SPINE.md#AD-9], [#AD-10]

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
