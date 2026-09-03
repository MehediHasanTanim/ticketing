# Story 1.5: Connect a Tenant identity provider

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **tenant administrator**,
I want to connect our existing identity provider,
So that corporate and management users authenticate through it rather than holding another password.

## Acceptance Criteria

**Given** I am a tenant administrator
**When** I configure a SAML 2.0 or OIDC connection for my Tenant
**Then** the connection applies to that Tenant only, never globally (FR-3)
**And** just-in-time provisioning is **off by default**, so a successful authentication grants no access until a role is assigned (FR-83).

**Given** a connected identity provider
**When** an identity is deprovisioned upstream
**Then** access is lost at next token validation, without a manual step in JazzTicketing.

**Given** a Staff Member holding only a PIN credential
**When** they sign in on a Shared Device
**Then** sign-in succeeds and configuration and reporting surfaces remain unavailable to that credential (FR-4).

## Tasks / Subtasks

- [ ] **T1. Per-Tenant SAML 2.0 / OIDC connection** (AC: 1)
  - [ ] Connection stored per Tenant, never global. Secrets in the platform secret store.
  - [ ] **Just-in-time provisioning off by default**: a successful authentication creates no access until a role is assigned (FR-83). Authentication never implies authorisation.
- [ ] **T2. Deprovisioning takes effect at next token validation** (AC: 2)
  - [ ] No manual step in JazzTicketing; validate upstream state on token refresh.
- [ ] **T3. PIN credentials are unaffected** (AC: 3)
  - [ ] A PIN-only Staff Member still signs in on a Shared Device with a provider connected, and configuration/reporting stay unavailable to that credential.

## Dev Notes

**Prerequisites:** 1.1, 1.3. This story retires the last production use of Story 1.0's fixture auth stub for corporate users — **remove the stub's production path here**, leaving PIN sign-in (4.1) as the only other credential type.

**Scope guards.** Connecting the provider and mapping an authenticated identity to an existing Staff Member. Not role definition (1.4), not Tenant defaults generally (1.6), not shared-device sign-in (4.1).

**Implementation notes.**
- JIT-off-by-default is a security decision, not a preference. If JIT is implemented at all, the default must be off and enabling it must be an audited Tenant-level change (FR-83, FR-6).
- Two credential types now exist with different capabilities. Keep the capability difference **on the credential**, matching 1.3, so a third type later does not require revisiting every permission check.
- Never place a token, client secret or assertion in a URL or query string, and never log one.

**Testing.** Provider connected for Tenant A does not authenticate a Tenant B user. Deprovisioned identity loses access at next validation (fake clock). JIT off: authenticate successfully, assert zero access. PIN sign-in unaffected.

### Project Structure Notes

New: `adapters/identity/` — the only place a provider SDK or protocol type exists. `core` sees an authenticated-subject value object, never a SAML assertion.

### References

- [Source: planning-artifacts/epics.md#Story 1.5]
- [Source: prd.md#FR-3], [#FR-83], [#FR-4]
- [Source: ARCHITECTURE-SPINE.md#Consistency Conventions] (secrets, logging), [#AD-11]

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
