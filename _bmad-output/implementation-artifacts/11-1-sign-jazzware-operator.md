# Story 11.1: Sign in as a Jazzware operator

Status: review

<!-- Created by bmad-create-story 2026-09-04. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 11: The Jazzware operator surface. -->

## Story

As a **Jazzware operator**,
I want to sign in to the internal provisioning surface with my own credential,
So that provisioning is attributable to me and separate from every hotel-side identity.

## Acceptance Criteria

**Given** I hold an active operator account
**When** I sign in on the internal surface
**Then** I receive a session scoped to provisioning actions only
**And** that session grants **no read** of any Tenant's operational or guest data, including through a direct API call with a crafted payload (FR-86, FR-1, AD-11).

**Given** an operator credential
**When** it is presented to any regional cell endpoint
**Then** it is refused, because no cell authenticates an operator and no operator credential exists in a cell (FR-86, AD-4).

**Given** any hotel-side identity, including a tenant administrator
**When** it is presented to the internal provisioning surface
**Then** it is refused, and the surface reveals nothing about whether the identity exists (FR-86, FR-1).

**Given** my operator account is deactivated
**When** my session next validates
**Then** access is lost without a manual step, on the same terms FR-3 sets for a deprovisioned tenant identity (FR-86).

**Given** the internal surface
**When** I look at it
**Then** it is visibly not the customer product — different brand and an amber accent rather than petrol — because an internal tool that looks like the customer product is how someone acts in the wrong context (UX `EXPERIENCE-WEB.md.Two audiences, two products`).

## Tasks / Subtasks

- [ ] **T1. Operator credential in the control plane** (AC: 1, 2)
  - [ ] Operator identity stored in the control plane, never in a cell. No operator credential, table or endpoint exists in a regional cell (AD-4).
  - [ ] Session scoped to provisioning actions only: it grants **no read** of Tenant operational or guest data, and the refusal is server-side against a crafted payload, not interface-level (AD-11).
- [ ] **T2. The two surfaces cannot be confused for each other** (AC: 2, 3)
  - [ ] A cell endpoint presented with an operator credential refuses it.
  - [ ] The internal surface presented with any hotel-side identity refuses it, and reveals nothing about whether that identity exists.
- [ ] **T3. Deactivation bites at next validation** (AC: 4)
  - [ ] A deactivated operator loses access without a manual step, on FR-3's terms for a deprovisioned tenant identity.
- [ ] **T4. It does not look like the customer product** (AC: 5)
  - [ ] Different brand and an amber accent rather than petrol, per the UX spine's two-audiences rule.

## Dev Notes

**Prerequisites:** 1.0. **Prerequisite for 1.1** — whose first criterion assumes this
story's outcome, which is why E11 is R1 and why 1.1 waits for it (epics.md **Backlog order
vs epic number**).

**Scope guards.** Operator sign-in only. Tenant creation is 1.1. Operator account
management is 11.2. The operator audit trail is 11.3. The time-boxed support-access grant
is 1.1's criterion, not this story's.

**Implementation notes.**
- **The separation is the story.** FR-1's promise that "provisioning grants Jazzware no
  standing access" is only enforceable if an operator credential cannot address a cell at
  all. Give the two surfaces **different issuers and different audiences**, verified on
  every request, so a token from one is structurally unusable against the other — not
  merely unauthorised by a permission check somebody could later widen.
- The operator surface has its **own contract**, `contracts/control-plane-openapi.yaml`,
  generated and drift-gated like the cell's. Do not add operator paths to
  `contracts/openapi.yaml`; that document describes a cell.
- **Whether the control plane is a separate deployable is not settled here.** The
  architecture spine puts it outside the regional cells (AD-4) and Story 1.0 realised its
  data as a `control_plane` schema. If this story ends up serving the operator surface
  from the same process as a cell, say so plainly and raise it — an internal surface
  sharing a process with tenant-facing traffic is a decision, not an implementation
  detail.
- Operator MFA is FR-84/FR-85's mechanism reused, not a second one (E12, R2). Nothing
  here builds a factor; nothing here forbids one either.
- Never log an operator credential, and never place one in a URL or query string.

**Testing.** Operator token refused by **every** cell endpoint, added to the same suite
that proves cross-tenant isolation. Hotel-side token refused by the operator surface, with
identical responses for existing and non-existent identities. Deactivation honoured at
next validation with a fake clock. A test asserting no operator table or route exists in
the cell.

### Project Structure Notes

New: `contracts/control-plane-openapi.yaml` (its own schema of record) and the
control-plane surface's own module. `core` sees an authenticated operator as a value
object, never a credential.

### References

- [Source: planning-artifacts/epics.md#Story 11.1]
- [Source: prd.md#FR-86], [#FR-1], [#FR-3] (deprovisioning terms)
- [Source: EXPERIENCE-WEB.md#Two audiences, two products] (W35, amber accent)
- [Source: ARCHITECTURE-SPINE.md#AD-4], [#AD-11]
- [Source: docs/decisions/0002] (why the operator is absent from the cell contract)

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

claude-opus-5 (Cowork), 2026-09-04.

### Completion Notes

**Built:** operator sign-in, session, sign-out, and the deployment-seeded bootstrap
account. `/control/v1/operator/*` per `contracts/control-plane-openapi.yaml`, whose
`x-implemented` flags for these three operations are now flipped.

**AC-1 is enforced by database privileges, not by a permission check.** The control
plane connects as `jt_control`, which migration 004 grants **nothing in the `cell`
schema** - `SELECT count(*) FROM cell.events` as that role answers *permission denied
for schema cell*. A check in a handler is a promise someone can widen; a role with no
grants cannot read a Job if the code asks it to.

**AC-2 and AC-3 have three independent separations**, any one of which would be a
control someone could widen: a different signing secret, a different token
**audience** checked on every request, and the database role above. Negative control
23 sets the two secrets to the same value and proves the audience check alone still
refuses an operator token at the cell - which is the failure mode a misconfiguration
would actually produce.

**AC-4** needs no sweep and no blacklist: the account's `active` flag and the
session's `revoked_at` are read on every request, which is what "at next token
validation, without a manual step" means.

**NOT built - the remaining part of this story:** AC-5, the internal surface's
appearance (different brand, amber accent, W35). It is a console surface and no
console work is in this change.

**REPORTED DEVIATIONS, both raised rather than absorbed:**

1. *The internal surface shares a process and an origin with the cell.* Story 1.1's
   structure notes require "no separate deployable", so it is mounted as the
   `/control/v1` routing namespace the contract declares - but AD-4 puts the control
   plane outside the cells, and an internal surface sharing a process with
   tenant-facing traffic is a decision, not a detail. One image with a second
   entrypoint and its own port is cheap now and awkward later. **Tanim's call.**
2. *The bootstrap operator seed is Story 11.2's AC-2, taken early.* Sign-in cannot be
   exercised without an account to sign in as. Only the seed was taken; the
   operator-account management endpoints remain 11.2's and are still
   `x-implemented: false`. The seeded account carries `must_change_credential`, which
   11.2 must enforce - this story surfaces the flag and does not act on it.

### File List

- `ops/migrations/004_operator_and_provisioning.sql`
- `ops/migrate.ts` (bootstrap seed, `jt_control` password rotation)
- `adapters/src/crypto/credential.ts`
- `adapters/src/postgres/control-plane-pool.ts`, `config.ts`
- `edge/src/control-plane/operator-auth.ts`, `edge/src/control-plane/router.ts`
- `edge/src/auth.ts` (the cell refuses any token carrying an audience)
- `edge/src/server.ts` (mounts the namespace before tenancy resolution)
- `contracts/control-plane-openapi.yaml` (flags flipped; `mustChangeCredential` added)
- `tests/provisioning.test.ts`, `scripts/negative-controls.sh` (controls 20-23)
- `docker-compose.yml`, `.env.example`

### Debug Log References

### Completion Notes List

### File List
