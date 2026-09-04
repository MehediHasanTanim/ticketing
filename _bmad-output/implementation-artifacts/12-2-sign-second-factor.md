# Story 12.2: Sign in with a second factor

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-04. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 12: Account security — a second factor people choose. -->

## Story

As a **Staff Member with a second factor enrolled**,
I want the extra step to be quick and to fail safely,
So that security does not become the reason I cannot start work.

## Acceptance Criteria

**Given** I have a factor enrolled
**When** my password is accepted
**Then** I am not signed in yet: I receive a **challenge**, and only a correct code completes it and returns a session (FR-84, AD-11).

**Given** a challenge
**When** it is unanswered past its lifetime, or answered wrongly too many times
**Then** it expires and the sign-in restarts, and the response does not reveal whether the password or the code was the problem to anyone but me (FR-84).

**Given** an email one-time code
**When** it is issued
**Then** it is single-use and short-lived, it is never written to a log, and requesting another invalidates the previous one (FR-84, NFR-7).

**Given** an identity governed by a connected identity provider, or a PIN or badge on a Shared Device
**When** it signs in
**Then** no second challenge is added by JazzTicketing, and shared-device sign-in still completes in under five seconds (FR-84, FR-3, FR-4, NFR-5).

## Tasks / Subtasks

- [ ] **T1. A challenge, not a session** (AC: 1)
  - [ ] An accepted password yields a **challenge**; only a correct code completes it and returns a session (AD-11).
- [ ] **T2. Fail safely and say little** (AC: 2)
  - [ ] The challenge expires; too many wrong codes restart the sign-in; the response does not tell an unauthenticated caller whether the password or the code was wrong.
- [ ] **T3. Email codes are single-use and short-lived** (AC: 3)
  - [ ] Never logged; requesting another invalidates the previous one.
- [ ] **T4. The exempt paths stay exempt** (AC: 4)
  - [ ] An identity governed by a connected provider gets no second challenge from us; a PIN or badge on a Shared Device is untouched and still signs in under five seconds.

## Dev Notes

**Prerequisites:** 12.1. **R2.**

**Scope guards.** The sign-in challenge only. Enrolment is 12.1, recovery is 12.3,
enforcement is 12.4.

**Implementation notes.**
- **The challenge token is the thing to get right.** It is not a partial session and must
  not be usable as a bearer token anywhere: give it a distinct audience, a short lifetime,
  a single purpose and no scope, and add a test that presenting it to a normal endpoint is
  refused. A "half-authenticated" token that any handler accepts is an authentication
  bypass with extra steps.
- The person answering the challenge has already proved the password, so telling **them**
  precisely what is wrong is not enumeration. Keep that distinction: informative to the
  holder of a valid challenge, silent to everyone else.
- Rate-limit per account and per source, and reuse `too_many_attempts` from the error
  envelope rather than inventing a second shape.
- Do not extend this to Shared Devices "for consistency". FR-4's five-second budget on the
  baseline device and a corridor with gloves on is the reason the exemption exists.

**Testing.** Challenge token refused as a bearer token on every authenticated endpoint.
Expiry and wrong-code lockout with a fake clock. Email code single-use, and superseded by
a reissue. SSO identity receives no challenge. Shared-device sign-in latency unchanged.

### Project Structure Notes

Extends the sign-in path in `edge/` from 1.3; no client-side decision about
whether a factor is required — the server says so.

### References

- [Source: planning-artifacts/epics.md#Story 12.2]
- [Source: prd.md#FR-84], [#FR-3], [#FR-4], [#§7 NFR-5], [#§7 NFR-7]
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
