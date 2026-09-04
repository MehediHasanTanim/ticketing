# Story 12.4: Require a second factor across my Tenant

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-04. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 12: Account security — a second factor people choose. -->

## Story

As a **tenant administrator**,
I want to require multi-factor authentication for everyone who signs in with a password,
So that our own security policy is enforced by the product rather than by asking people nicely.

## Acceptance Criteria

**Given** I am a tenant administrator
**When** I switch on the MFA requirement
**Then** it applies to my Tenant only, never globally, and sits with the other Tenant defaults whose blast radius is displayed (FR-85, FR-83).

**Given** I am switching it on
**When** no tenant administrator in my Tenant has an enrolled factor
**Then** the switch is refused server-side, because a Tenant that locks out its own administrators has no way back in (FR-85, AD-11).

**Given** the requirement is on and a grace period I set
**When** an unenrolled Staff Member signs in during the grace period
**Then** they are prompted to enrol and can complete it
**And** after the grace period, password sign-in without an enrolled factor is refused **server-side**, not merely hidden (FR-85, AD-11).

**Given** that refusal
**When** it reaches the person signing in
**Then** it tells **them** that enrolment is what is missing rather than implying a wrong password, while telling an unauthenticated caller nothing about whether the account exists (FR-85).

**Given** any change to the requirement or the grace period
**When** it is made
**Then** it is attributed to me with a timestamp in the audit trail (FR-85, FR-6).

## Tasks / Subtasks

- [ ] **T1. Per Tenant, on the surface that shows blast radius** (AC: 1)
  - [ ] The requirement applies to one Tenant, never globally, and sits with the Tenant defaults whose inheriting-Property count is displayed (FR-83).
- [ ] **T2. A Tenant cannot lock itself out** (AC: 2)
  - [ ] Refused server-side unless at least one tenant administrator has an enrolled factor.
- [ ] **T3. A grace period, then a server-side refusal** (AC: 3)
  - [ ] Unenrolled Staff Members are prompted and can enrol during the administrator-set grace period; afterwards password sign-in without a factor is refused server-side, not hidden (AD-11).
- [ ] **T4. The refusal explains itself to the right person** (AC: 4)
  - [ ] Informative to someone who has proved their password; silent to an unauthenticated caller.
- [ ] **T5. Attribution** (AC: 5)
  - [ ] Every change to the requirement or the grace period attributed with a timestamp.

## Dev Notes

**Prerequisites:** 12.1, 12.2, 1.5 or 1.6 for the Tenant settings surface. **R2.**

**Scope guards.** Tenant-wide enforcement. Individual enrolment is 12.1, the challenge is
12.2, recovery is 12.3. This story does not extend MFA to Shared Devices or to
provider-governed identities — see the epic's scope boundary.

**Implementation notes.**
- **The lockout guard in T2 is the criterion most likely to be skipped and most expensive
  to skip.** A Tenant that enables enforcement with no enrolled administrator has no way
  back in that does not involve Jazzware touching their data, which is exactly what FR-1
  promises not to happen. Enforce it server-side, not in the toggle's UI.
- The grace period is a Tenant setting, so it is **versioned and effective-dated** like
  every other one (AD-9), and a change to it does not retroactively refuse a session
  already granted.
- The refusal is post-password, which is what makes T4 safe: the caller has already proved
  they hold the credential, so naming enrolment as the missing piece tells them nothing
  they could not already infer. An unauthenticated caller gets the generic failure.
- Enforcement is evaluated **server-side on every sign-in**, never cached in the client, on
  the same reasoning as 1.3's permission re-resolution.

**Testing.** Enable refused with no enrolled administrator. Grace period boundary with a
fake clock, on both sides. Post-grace sign-in refused server-side via a direct API call
with a valid password. Unauthenticated caller receives the generic failure. Shared-device
and SSO sign-in unaffected while enforcement is on.

### Project Structure Notes

A Tenant setting on 1.5/1.6's surface, read by 12.2's sign-in path. No second
enforcement point.

### References

- [Source: planning-artifacts/epics.md#Story 12.4]
- [Source: prd.md#FR-85], [#FR-83], [#FR-6], [#FR-1]
- [Source: ARCHITECTURE-SPINE.md#AD-9], [#AD-11]

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
