# Story 1.4: Define and duplicate custom roles with guards

Status: review

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **tenant administrator**,
I want to duplicate a shipped role and edit the copy,
So that the hotel's own job titles map onto permissions without me being able to create an incoherent or escalated role.

## Acceptance Criteria

**Given** a shipped role
**When** I open it
**Then** it is duplicable but not editable, so the shipped baseline stays intact for support (FR-81)
**And** the interface states before the copy is made that the duplicate is independent at creation and will not inherit later changes to its source.

**Given** I am editing a custom role and a permission declares a dependency
**When** I enable that permission while its dependency is disabled
**Then** the enable is refused and the interface names the specific dependency that must be enabled first.

**Given** I hold a set of permissions
**When** I attempt to grant a role any permission I do not myself hold
**Then** the attempt is refused server-side, not only disabled in the interface (FR-81, AD-11).

**Given** any role creation, duplication or permission change
**When** it is saved
**Then** the audit trail records the actor, the timestamp and the previous value (FR-6)
**And** the per-role Recovery approval threshold is settable here for later use by FR-43.

## Tasks / Subtasks

- [ ] **T1. Role model with a permission dependency graph** (AC: 1, 2)
  - [ ] Permissions declare dependencies as data. Enabling a permission whose dependency is disabled is refused, and the response **names the specific dependency** so the interface can show it.
  - [ ] Shipped roles are duplicable but **not editable**; the shipped baseline stays intact for support.
- [ ] **T2. The escalation guard** (AC: 3)
  - [ ] An administrator cannot grant a role any permission they do not themselves hold. Refuse **server-side**; the disabled control in the interface is a courtesy, not the control.
  - [ ] Test the crafted request that enables a permission the caller lacks.
- [ ] **T3. Duplication semantics** (AC: 1)
  - [ ] A duplicate is independent at creation; later changes to its source do not propagate. State this in the interface **before** the copy is made.
- [ ] **T4. Audit and thresholds** (AC: 4)
  - [ ] Role creation, duplication and every permission change recorded with actor and previous value (FR-6).
  - [ ] Per-role Recovery approval threshold is a settable value here, consumed later by Story 9.4 (FR-43). Store it; do not build approval routing.

## Dev Notes

**Prerequisites:** 1.3 (roles are assignable). Consumed by 9.4.

**Scope guards.** Role definition and its guards. Not role assignment (1.3), not Tenant defaults (1.6), not the approval workflow (9.4).

**This is security-sensitive logic and must not be estimated as a form.** The PRD says so explicitly in its `[NOTE FOR PM]`: FR-81 was UX-originated scope confirmed on 2026-09-02, and the two guards - dependency and escalation - are why it is not a CRUD screen. A dev agent that implements the guards only in the interface has implemented nothing.

**Implementation notes.**
- Model the dependency graph as declarative data (permission then required permissions) evaluated by one function used by both the interface and the server. A hand-written conditional per screen will drift.
- The escalation guard compares the **effective permission set of the acting administrator** against the requested grant. Compute it server-side from their roles at the relevant scope; never trust a client-supplied set.
- Duplication copies the permission set **by value**, unlike Property inheritance in 1.2 which is by reference. The two behaviours are deliberately different — do not share a helper between them.

**Testing.** Dependency-refusal table test over the whole permission graph, not a sample. Escalation guard from three actor levels. Audit-entry assertion on each mutation type.

### Project Structure Notes

New: `core/role/` (permission graph and guards — pure), `app/role/`. The guards belong in `core` so they are unit-testable without HTTP.

### References

- [Source: planning-artifacts/epics.md#Story 1.4]
- [Source: prd.md#FR-81] including its `[NOTE FOR PM]`, [#FR-43], [#FR-6]
- [Source: EXPERIENCE-WEB.md#Role editing - the two guards]
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

claude-opus-5 (Cowork, remote session linked to tanim-m4-pro-local). Contracts first,
then migration, then `core/` (where both guards live), then `app/`, `edge/`, tests, gates.

### Debug Log References

`.dev-refresh.log` on the Mac. Additionally verified by execution in this session's cloud
container against a real Postgres 16 — see the verification note below.

### Completion Notes List

**All four acceptance criteria are built, and the guards are in `core/` where they are
unit-testable without HTTP.** The PRD's `[NOTE FOR PM]` and the story both say this is
not a form; the shape of the work reflects that. `core/src/role/define.ts` holds the
dependency evaluation, the escalation guard and both mutation aggregates, with no I/O and
no clock of its own. `app/src/role/manage.ts` is the transaction and the audit trail and
nothing else.

**The dependency graph is data, and it is SERVED.** Each permission declares `dependsOn`;
one function evaluates it; `GET /v1/permissions` publishes the graph so the console reads
the same definition the server enforces. T1 asked for exactly this — "a hand-written
conditional per screen will drift" — and serving it is what makes one function possible
rather than aspirational. The refusal names every unmet pair, not the first, because the
operation sends a whole set and fixing them one round trip at a time would be a worse
interface than the criterion describes.

**The escalation guard compares against the actor's TENANT-WIDE effective permissions**,
not their session's. A role is a Tenant-wide object, so the authority to write a
permission into one has to be Tenant-wide too — otherwise a permission held at one
Property becomes a Tenant-wide capability by being written into a definition that
somebody then assigns at another. It is checked **before** the dependency guard, so a
failing dependency can never mask an escalation attempt in the audit trail. And it
applies to DUPLICATION as well as editing: without that, copying the property
administrator would be the way around it.

**Duplication is by value and shares no code with Property inheritance**, as the story
requires. A negative control (38) makes the copy share its source's array and proves the
independence test goes red.

**The seam Story 1.3 left open is closed.** 1.3 said in as many words that "Story 1.4
brings custom roles, whose permissions live in the database rather than here". Permission
sets now live in `control_plane.roles.permissions`, per Tenant; `resolvePermissions` reads
each grant's own set and stays pure. `ROLE_PERMISSIONS` survives as the shipped baseline —
what Story 1.1 seeds and what migration 009 backfilled — and a unit test parses the
migration and asserts the two agree, because drift between a constant and a migration
surprises one Tenant and not the others.

**An array, not a join table.** A role's permissions are one fact, read and written whole,
and FR-6 wants the PREVIOUS VALUE of a change: with an array that is a reading, with rows
it is a reconstruction from what was inserted and deleted. It also means editing a role
needs no DELETE privilege anywhere, which keeps Story 1.3's "no DELETE on anything"
intact.

**A defect this story introduced into Story 1.3, and how it was found.** Making a role
Tenant-assignable is now a per-Tenant stored fact, but `inviteStaffMember` was still
checking a hard-coded list of the two SHIPPED roles that may be held Tenant-wide — a list
a custom role could never join, so a Tenant-wide custom role would have been defined
successfully and then refused at assignment. Both values are `string`, so the type system
saw nothing; it surfaced only when the boundary test tried to assign one. The guard now
reads the Tenant's catalogue, `shippedRoleAssignableAtScope` is renamed to say it is the
SEED and not a live check, and both a unit test and a boundary test cover it.

**Judgement calls, stated rather than buried.**

1. **A third coherence refusal.** A role carrying a `tenant`-scope permission must be
   assignable Tenant-wide, or that permission can never be conferred by it. The story
   names two guards, not three — but the story statement says the point is that an
   administrator cannot "create an incoherent or escalated role", and an inert permission
   sitting in a role editor reads as a capability. Refused with a message that says how to
   fix it.
2. **`role.define` is one permission, not `role.create` plus `role.edit`.** The story is
   "duplicate a shipped role and edit the copy" — one act in two steps, and a hotel that
   may do half of it can produce a copy it cannot then correct.
3. **On edit, only what is being ADDED is measured against the caller's own set.** An
   administrator who inherits a role holding something they lack can still rename it or fix
   an unrelated permission; what they cannot do is add one. Measuring the whole set would
   make such a role permanently uneditable by anyone but its author, which AC-3 does not
   ask for and which would quietly strand roles.

**Raised, not decided: the Recovery approval threshold cannot be set on a shipped role.**
AC-1 makes shipped roles not editable, and the threshold is part of a role, so setting one
means duplicating first. That follows from FR-81 as written and is implemented that way.
If hotels are meant to set thresholds on the shipped seven without duplicating them, the
threshold belongs on a Tenant setting keyed by role rather than on the role itself — a
change to raise in epics.md, not to reinterpret in code.

**Scope guards honoured.** No role assignment (1.3), no Tenant defaults (1.6), no approval
routing (9.4 — the threshold is stored and nothing consumes it), and no role deletion at
all: a role key is what `staff_roles` stores, so deleting one would orphan every
assignment. Refused at the database for every connection.

**VERIFIED BY EXECUTION.** The tree was mirrored into this session's cloud container and
run against a real Postgres 16, twice: migration 009 applied **on top of** an
already-migrated 001–008 database (the path Tanim's container will take, and the only path
that exercises the backfill), and all nine applied **from scratch**. **181/181 tests pass
both ways, and 39 of 41 negative controls red-verified** — 0 failures, 1 unverifiable (the
Dart half, no SDK there), 1 skipped (console dependencies). All six new controls go red on
demand. This is not a substitute for `npm run refresh` on the Mac; two earlier defects
lived precisely in the gap between the two.

### File List

**New**

- `ops/migrations/009_custom_roles.sql`
- `core/src/role/define.ts` — both guards, duplication and editing (pure)
- `app/src/role/manage.ts` — the transaction and the audit trail
- `tests/unit/role.test.ts` (28 tests), `tests/role.test.ts`
- `contracts/openapi.yaml` — `GET /permissions`, `POST /roles/{roleKey}/duplicate`,
  `PATCH /roles/{roleKey}`; schemas `PermissionSpec`, `DuplicateRoleRequest`,
  `UpdateRoleRequest`

**Changed**

- `contracts/openapi.yaml` — `Role` gains `permissions`, `editable`, `duplicatedFrom`,
  `independentOfSource`, `recoveryApprovalThreshold`, `updatedAt`
- `core/src/staff/roles.ts` — permissions declare `dependsOn`; `role.define` added;
  `Grant` carries the role's stored set; `unmappedRoles` becomes `unknownPermissions`;
  `roleAssignableAtScope` renamed `shippedRoleAssignableAtScope` and narrowed to the seed
- `core/src/staff/invite.ts` — Tenant-wide assignability read from the Tenant's catalogue
- `core/src/tenant/provision.ts`, `app/src/tenant/provision-tenant.ts` — a new Tenant is
  seeded with each role's permission set and Tenant-assignability
- `app/src/staff/sessions.ts` — `loadGrants` joins the role; `tenantWidePermissions` added
  for the escalation guard
- `app/src/staff/invite-staff-member.ts` — `listRoles` serves the editor's fields
- `edge/src/server.ts` — the role write routes, gated on `role.define`; the three new
  refusals mapped in one place
- `docs/decisions/0003-one-permission-decision-point.md` — amended
- `tests/unit/staff.test.ts` — refitted for per-Tenant sets, plus the assignability defect
- `scripts/negative-controls.sh` — controls 36–41
