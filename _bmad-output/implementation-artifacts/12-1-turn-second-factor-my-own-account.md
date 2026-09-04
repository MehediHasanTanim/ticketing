# Story 12.1: Turn on a second factor for my own account

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-04. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 12: Account security — a second factor people choose. -->

## Story

As a **Staff Member who signs in with a password**,
I want to add a second factor from Settings and pick how it reaches me,
So that my account is not one password away from someone else's hands.

## Acceptance Criteria

**Given** I sign in with a password and have no second factor
**When** I open Settings
**Then** multi-factor authentication is **off**, and I can turn it on myself (FR-84).

**Given** I am enrolling
**When** I choose a method
**Then** I can choose a one-time code by **email**, or an **authenticator app** offered as both Google Authenticator and Microsoft Authenticator — both of which enrol from the same secret, so a code from either is accepted (FR-84).

**Given** I have scanned or entered an enrolment secret
**When** I have not yet submitted a code produced by it
**Then** the factor is **not** active, so a mis-scanned code cannot lock me out of my own account (FR-84).

**Given** enrolment succeeds
**When** the audit trail is read
**Then** it records that I enrolled, which method, and when — and never the secret or a code (FR-84, FR-6).

**Given** I hold both an email method and an app method
**When** I sign in
**Then** I choose which to use, and the app method is offered first because it works without a mailbox (FR-84).

## Tasks / Subtasks

- [ ] **T1. Off by default, and mine to turn on** (AC: 1)
  - [ ] MFA is off for every Staff Member until they enable it; only FR-85's Tenant requirement can compel enrolment.
- [ ] **T2. Two methods, three labels** (AC: 2)
  - [ ] A one-time code by **email**, and an **authenticator app** (TOTP, RFC 6238).
  - [ ] The app method is offered as both *Google Authenticator* and *Microsoft Authenticator*: they are the same TOTP secret, so a code from either is accepted. Record which the Staff Member picked as a support hint only — it must never affect verification.
- [ ] **T3. Verify before activating** (AC: 3)
  - [ ] The factor stays inactive until a code produced by it has been submitted and verified.
- [ ] **T4. Attribution without secrets** (AC: 4)
  - [ ] Enrolment and removal recorded with method and time, never the secret or a code.
- [ ] **T5. Choosing between two enrolled methods** (AC: 5)
  - [ ] With both enrolled the Staff Member chooses at sign-in, app offered first because it needs no mailbox.

## Dev Notes

**Prerequisites:** 1.3 (the password credential a factor attaches to). **R2.**

**Scope guards.** Enrolment and management of a Staff Member's own factors. The sign-in
challenge is 12.2. Recovery and administrator reset are 12.3. Tenant-wide enforcement is
12.4.

**A UX gap this story exposes — raise it, do not improvise it.** FR-84 requires a
**Settings** surface belonging to the individual, and `EXPERIENCE-WEB.md` (status: final)
has no per-user account surface among its 39 — the nearest, *Tenant settings*, is a tenant
administrator's. A new surface is needed and it is a change to raise in the UX spine, on
the same terms as an acceptance criterion that needs changing in epics.md.

**Implementation notes.**
- **Google Authenticator and Microsoft Authenticator are not two integrations.** Both
  consume an `otpauth://totp/...` secret. Implementing them as two methods would create two
  code paths that must agree forever, for no user-visible gain. One TOTP method, two labels,
  and an optional app hint kept for support conversations.
- The TOTP secret is a credential: encrypted at rest, never logged, never returned after
  enrolment, and never rendered anywhere but the enrolment QR and its manual-entry fallback.
- Verify-before-activate exists because the alternative locks people out of their own
  accounts with a mis-scanned QR, and the recovery path for that (12.3) costs an
  administrator's time every time.
- Accept a small clock skew window for TOTP, and reject a code already used inside its
  window, or a shoulder-surfed code stays valid for its remaining seconds.
- Email OTP delivery uses the same notification adapter as everything else (AD-8); no
  second mail path.

**Testing.** Enrolment not active until verified. A code from a second TOTP app accepted
against the same secret. Replay of a used TOTP code refused inside its window. Audit entry
contains method and time and **no** secret — asserted by scanning the entry, not by
reading the code. Greyscale and RTL render of the enrolment surface (Arabic ships in R1, so
an R2 surface inherits the requirement).

### Project Structure Notes

New: the Staff Member factor model beside 1.3's credential model, and a per-user
Settings surface in `clients/console` that the UX spine does not yet describe.

### References

- [Source: planning-artifacts/epics.md#Story 12.1]
- [Source: prd.md#FR-84], [#FR-6], [#§7 NFR-7]
- [Source: EXPERIENCE-WEB.md] — **no per-user Settings surface exists; raise it**
- [Source: ARCHITECTURE-SPINE.md#AD-8] (one notification path), [#AD-12]

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
