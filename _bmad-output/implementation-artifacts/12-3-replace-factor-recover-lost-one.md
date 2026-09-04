# Story 12.3: Replace a factor, or recover a lost one

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-04. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 12: Account security — a second factor people choose. -->

## Story

As a **Staff Member who has changed or lost my phone**,
I want a way back into my own account that does not weaken the factor,
So that losing a device is an inconvenience rather than an incident.

## Acceptance Criteria

**Given** I am signed in
**When** I remove or replace a factor in Settings
**Then** the change takes effect immediately, is attributed in the audit trail, and — if it was my last factor while my Tenant requires MFA — I am required to enrol another before I can continue (FR-84, FR-85).

**Given** I have lost my only second factor
**When** I ask for help
**Then** an administrator with scope over me can issue a **reset of the factor**, which is attributed to that administrator in the audit trail (FR-84, FR-6)
**And** there is no self-service path that simply bypasses the factor (FR-84).

**Given** a factor reset
**When** it is issued
**Then** it does not reveal a code or a secret to the administrator, and it ends my other sessions so a session opened with the old factor cannot outlive it (FR-84, FR-64).

## Tasks / Subtasks

- [ ] **T1. Remove or replace, with the consequence stated** (AC: 1)
  - [ ] Immediate effect, attributed in the audit trail; removing a last factor while the Tenant requires MFA forces enrolment of another before continuing (FR-85).
- [ ] **T2. Recovery is issued, not self-served** (AC: 2)
  - [ ] An administrator with scope over the Staff Member can reset the factor, attributed to that administrator. **No self-service bypass of the factor exists.**
- [ ] **T3. A reset reveals nothing and ends everything** (AC: 3)
  - [ ] No code or secret is disclosed to the administrator, and the Staff Member's other sessions end so a session opened with the old factor cannot outlive it.

## Dev Notes

**Prerequisites:** 12.1, 12.2, and 1.3 for administrator scope. **R2.**

**Scope guards.** Losing and replacing a factor. Not password recovery (1.3's
`/auth/password/*`), and not Tenant enforcement (12.4).

**Implementation notes.**
- **"Reset" must mean re-enrol, not bypass.** The administrator clears the factor and the
  Staff Member enrols again; the administrator never obtains a working second factor for
  someone else's account, which would make every administrator a way around MFA.
- Ending other sessions matters because the threat model for a lost phone includes a
  session already open on it. This is the same revocation 4.8 needs, so use one mechanism.
- If the Tenant requires MFA (12.4), a Staff Member mid-reset is in the same state as an
  unenrolled one: prompted, inside the grace rules, refused after. Do not build a second
  state for it.
- An administrator resetting their **own** factor is not a special case; an administrator
  resetting the last enrolled tenant administrator's factor while enforcement is on is —
  12.4's guard covers switching enforcement on, and this story must not create a way
  around it.

**Testing.** Reset ends other sessions (assert an old token is refused). Administrator
never receives a secret or code — asserted on the response body and the audit entry.
Reset by an administrator without scope refused server-side. Last-factor removal under
enforcement forces re-enrolment.

### Project Structure Notes

Reuses the session-revocation path shared with 4.8 rather than adding one.

### References

- [Source: planning-artifacts/epics.md#Story 12.3]
- [Source: prd.md#FR-84], [#FR-85], [#FR-64], [#FR-6]
- [Source: ARCHITECTURE-SPINE.md#AD-11]

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
