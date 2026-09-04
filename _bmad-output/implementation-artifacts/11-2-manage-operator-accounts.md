# Story 11.2: Manage operator accounts

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-04. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 11: The Jazzware operator surface. -->

## Story

As a **Jazzware operator administrator**,
I want to create, scope and deactivate operator accounts,
So that the people who can create customers are a known and current list.

## Acceptance Criteria

**Given** I hold operator-administrator scope
**When** I create an operator account
**Then** it is created with provisioning scope only and no access to Tenant data (FR-86)
**And** the creation is attributed to me in the operator audit trail (FR-86).

**Given** a deployment with no operator accounts
**When** the control plane starts for the first time
**Then** the first operator account comes from the platform secret store as part of deployment, never from a self-service sign-up, and its credential must be changed on first use (FR-86, NFR-7).

**Given** an operator account I no longer want active
**When** I deactivate it
**Then** it can no longer sign in, its existing sessions end at next validation, and the account is retained for audit rather than deleted (FR-86, FR-6).

**Given** the operator account list
**When** any hotel-side role attempts to read or change it through any interface
**Then** the attempt is refused server-side (FR-86, AD-11).

## Tasks / Subtasks

- [ ] **T1. Create and scope operator accounts** (AC: 1)
  - [ ] Created with provisioning scope only and no access to Tenant data; creation attributed to the acting operator administrator.
- [ ] **T2. The first account is a deployment fact, not a sign-up** (AC: 2)
  - [ ] First operator comes from the platform secret store as part of deployment, and its credential **must be changed on first use**.
  - [ ] There is **no self-service sign-up route at all** — absent, not hidden.
- [ ] **T3. Deactivate, never delete** (AC: 3)
  - [ ] Deactivation blocks sign-in, ends existing sessions at next validation, and retains the account for audit.
- [ ] **T4. Not reachable from the hotel side** (AC: 4)
  - [ ] Every read and write on the operator account list is refused server-side to any hotel-side role.

## Dev Notes

**Prerequisites:** 11.1.

**Scope guards.** Operator accounts only. Roles *inside* a Tenant are 1.3 and 1.4. Tenant
creation is 1.1. The audit trail these actions write to is 11.3.

**Implementation notes.**
- **The bootstrap is the part that goes wrong.** An operator surface with a self-service
  sign-up is a way to mint a Tenant-creating account from the internet. The first account
  must come from the secret store at deploy time and force a credential change on first
  use, and the sign-up route must not exist in the contract.
- Deactivation retains the row: an operator audit trail that references a deleted actor is
  an audit trail with holes in it (11.3, FR-6).
- Operator-administrator scope is a *distinct* scope from operator, or every operator can
  create more operators. Keep the capability on the account, matching how 1.3 keeps
  capability on the credential.

**Testing.** Bootstrap from an empty control plane, asserting the forced credential change.
Deactivated operator's live session refused at next validation (fake clock). Hotel-side
role refused on read and write. A test asserting no sign-up route exists.

### Project Structure Notes

Operator accounts live in the control plane alongside 11.1's identity, addressed
only by the control-plane contract.

### References

- [Source: planning-artifacts/epics.md#Story 11.2]
- [Source: prd.md#FR-86], [#§7 NFR-7] (no shared administrative accounts, secrets)
- [Source: ARCHITECTURE-SPINE.md#AD-4], [#AD-11]

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
