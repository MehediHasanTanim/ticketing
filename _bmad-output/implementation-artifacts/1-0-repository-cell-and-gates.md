# Story 1.0: Stand up the repository, the first cell, and the three gates

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Sources: planning-artifacts/epics.md (Epic 1), architecture/architecture-JazzTicketing-2026-09-02/ARCHITECTURE-SPINE.md, prds/prd-JazzTicketing-2026-08-29/prd.md, ux-designs/ux-JazzTicketing-2026-08-29/DESIGN.md. No previous story exists; no git history; greenfield repository. -->

## Story

As a **JazzTicketing engineer**,
I want the source tree, one running region cell and the three release gates in place and green,
so that every story after this one is verified by the checks the architecture depends on rather than assuming they exist.

**Why this story has no user value, and why it exists anyway.** The architecture spine names no starter template, and the three CI gates below cannot pass on any story until the pipeline that runs them exists. Added at Tanim's explicit decision, 2026-09-02. Everything here is scaffolding: **no functional requirement is implemented by this story.**

## Acceptance Criteria

**AC-1 — Source tree and inward dependencies.**
**Given** the source tree defined in the architecture spine
**When** the repository is initialised
**Then** it contains `core/`, `core/ports/`, `adapters/`, `app/`, `edge/`, `clients/mobile`, `clients/console`, `contracts/` and `ops/`, with dependencies pointing inward only
**And** a lint rule fails the build if `core/` imports from `adapters/`, `edge/` or `app/`.

**AC-2 — Codegen-drift gate.**
**Given** `contracts/` as the schema of record
**When** CI runs
**Then** the TypeScript and Dart bindings are generated from it and the codegen-drift gate fails the build if a generated file differs from a committed one, or if a wire type is hand-written on either side.

**AC-3 — Two-language SLA fixture gate.**
**Given** a trivial SLA fixture in `contracts/`
**When** CI runs
**Then** the gate executes it against both the TypeScript fold and the Dart port, and the build fails if either is absent or disagrees (AD-14).

**AC-4 — Cross-tenant isolation gate.**
**Given** two seeded tenants in one cell
**When** the isolation suite runs against every public interface — reads, search, exports and direct API calls
**Then** every cross-tenant access attempt fails, and the build fails if any succeeds (AD-3, DG-1).

**AC-5 — One reproducible region cell.**
**Given** one region cell
**When** it is deployed from `ops/`
**Then** it runs the API, the Postgres event store and projections, and Redis, with migrations applied from source and no guest data in the control plane (AD-4)
**And** the cell is reproducible from the repository alone, with no hand configuration step that is not committed.

**AC-6 — Gates green, and proven able to go red.**
**Given** all three gates
**When** they first run
**Then** each is green over trivial fixtures
**And** each has been demonstrated to **fail** against a deliberately broken fixture, with the failing output recorded in the Dev Agent Record. A gate that has never gone red is not known to work.

**AC-7 — Stack versions confirmed, not assumed.**
**Given** every version in the spine's Stack table is `[ASSUMPTION]` — produced from training knowledge with web access blocked
**When** this story pins versions in lockfiles and CI images
**Then** each version has been checked against its official source and the confirmed version recorded in the Dev Agent Record, with any divergence from the spine's proposal reported rather than silently adopted.

## Tasks / Subtasks

- [ ] **T1. Initialise the monorepo and the dependency rule** (AC: 1)
  - [ ] Create the tree exactly as named in AC-1. Do not invent `src/`, `lib/`, `packages/` or `services/` wrappers; the spine's names are the contract.
  - [ ] `core/` holds pure domain only — no I/O, no framework import, no clock. `core/ports/` holds the interfaces: `JazzCorePort`, `NotificationPort`, `ClockPort`, `EventStore`, `ReadModel`.
  - [ ] Add the import-boundary lint (e.g. `eslint-plugin-boundaries` or `dependency-cruiser`) with rules: `core` may import only `core`; `adapters` may import `core/ports` and external SDKs but never another adapter; `app` may import `core`, `core/ports`; `edge` may import `app`; clients may import neither `adapters` nor any datastore.
  - [ ] Prove the lint fails: commit-free trial import of `adapters/` from `core/`, capture the failure, revert.
- [ ] **T2. Make `contracts/` the schema of record** (AC: 2)
  - [ ] Author a minimal OpenAPI 3.1 document plus one event schema and the error envelope (`code`, localisable `message` key, `retryable`).
  - [ ] Generate TypeScript types for server and console, and Dart models for the handset, into clearly-marked generated directories. Commit the generated output.
  - [ ] CI job `codegen-drift`: regenerate, `git diff --exit-code` over generated paths, fail on any difference.
  - [ ] Add a check that fails if a wire type is declared outside a generated path (path-scoped lint or a grep-based guard with an allowlist).
- [ ] **T3. The SLA fold, in two languages, minimally** (AC: 3)
  - [ ] Implement `core/job` SLA fold in TypeScript with the signature it will keep: `(events, target) -> { elapsed, paused, remaining, breached }`, pure, taking time via `ClockPort`.
  - [ ] Implement the **single** Dart port in `clients/mobile`. This is the only function permitted to exist twice in the whole system (AD-14). Do not port anything else.
  - [ ] Put fixture vectors in `contracts/` as language-neutral data (JSON), not as test code in either language.
  - [ ] CI job `sla-fixtures`: run the vectors through both implementations; fail if either is missing, errors, or disagrees.
  - [ ] **Scope guard:** implement only the trivial elapsed case the fixture needs. Pause semantics, reassignment and offline breach belong to Story 3.4 and 3.7 and must *extend* this fold, never replace it.
- [ ] **T4. Cross-tenant isolation gate** (AC: 4)
  - [ ] Event store schema with `tenant_id` and `property_id` on every row and on every event; isolation enforced at one boundary in `edge/` tenancy resolution (AD-3).
  - [ ] Seed two tenants with one trivial resource each. This is a **fixture surface only** — see the scope guard in Dev Notes.
  - [ ] **Fixture auth stub.** The suite needs to present "tenant A's session", but no identity provider exists until Stories 1.3 and 1.5. Implement the minimum: a signed token carrying `tenant_id`, `property_id` and an actor id, issued by a test-only endpoint. What is under test is the **tenancy resolution boundary in `edge/`**, not the credential. Keep the stub behind a build flag so it cannot ship, and leave a comment naming 1.3/1.5 as its replacement.
  - [ ] Suite attempts cross-tenant access through every public interface: direct read by id, list, search, export, and a hand-crafted API call carrying tenant A's session with tenant B's id.
  - [ ] Every attempt must fail server-side. CI job `tenant-isolation`; the build fails if any attempt succeeds.
- [ ] **T5. One region cell from `ops/`** (AC: 5)
  - [ ] Committed, parameterised deployment for one cell: API, Postgres (event store + projections), Redis. Region is a parameter, not a copy of the manifests.
  - [ ] Migrations applied from source on deploy; no manual SQL step.
  - [ ] Control plane defined as a separate deployable holding tenant identity, roles and the property directory, and **no guest data** (AD-4).
  - [ ] Secrets from the platform secret store. No secret in a repository file, a client bundle, or a device (AD-9 conventions).
  - [ ] Structured logging with `tenant_id`, `property_id`, actor, correlation id; guest identifiers never logged (AD-10).
  - [ ] **Smoke test in CI.** "It runs" must be machine-checkable: a health endpoint that reports API, Postgres and Redis reachability, plus one command through `edge/` → `app/` → event store → projection → read, asserted end to end against an ephemeral cell. Without this, AC-5 is verified by opinion.
  - [ ] **Projection rebuild command.** An event-sourced system without a rebuild path discovers that fact under pressure. Ship `rebuild-projections` now, run it in the smoke test, and keep it green — the spine's deferred CQRS-split decision explicitly depends on rebuild time being measurable (AD-1).
  - [ ] **Assert the control plane holds no guest data** (AD-4, DG-1): a test that fails if the control-plane schema gains a guest-identifying column. Cheap now, and the alternative is discovering a leak after a Property is live in a second region.
  - [ ] Prove reproducibility: tear the cell down and stand it up again from a clean checkout with no manual step.
- [ ] **T6. Client scaffolds that cannot be retrofitted later** (AC: 1, 5)
  - [ ] `clients/console`: React 18 + Vite, TanStack Query, **no CSS framework**. Import the `DESIGN.md` tokens as CSS custom properties in one file — accent petrol `#27565D` with white ink, cyan `#08FCFF` as a highlight only. No story may hard-code a hex.
  - [ ] `clients/mobile`: Flutter app with `Directionality`, `flutter_localizations` and ARB wiring in place, plus **en** and **ar** locale files present even if nearly empty. Drift-backed SQLite initialised.
  - [ ] Add a lint that fails on `EdgeInsets.only(left:` / `right:` and on CSS `margin-left`/`padding-right` etc. in the console. Logical direction only (AD-12). Retrofitting bidirectional layout later is a rebuild of the layout layer, which is exactly what this cheap rule prevents.
- [ ] **T7. Gate negative controls and version confirmation** (AC: 6, 7)
  - [ ] For each of the three gates, run it against a deliberately broken fixture, capture the red output, revert. Record all three in the Dev Agent Record.
  - [ ] Confirm each version below against its official source. Record confirmed versions; report divergence from the spine's proposal to Tanim rather than adopting silently.

## Dev Notes

**Prerequisites:** none — this is the first story in the plan and the repository does not yet exist. Everything after it depends on this story.

### Scope guards — the three ways this story goes wrong

1. **Do not implement Epic 1's domain.** T4 needs two tenants and one readable resource so the isolation suite has something to attack. That is a fixture, not FR-1. The Tenant aggregate, the Jazzware-operator/tenant-administrator split, the shipped role set, Property creation and region immutability all belong to Stories 1.1 and 1.2. If you find yourself writing a role model here, stop.
2. **Do not create domain schema.** The event store table and the fixture resource are the only tables this story creates. There is no "create all the tables" story in this plan by design; Job arrives in 3.1, Room in 2.1, Asset in 8.2, Glitch in 9.1.
3. **Do not enrich the SLA fold.** Trivial elapsed only. The fold's real semantics — paused intervals excluded from measurement, breach derived and never stored, a breach that happened offline carrying its true timestamp — are Stories 3.4, 3.7 and 3.8. Two implementations exist only because Dart cannot import TypeScript; adding a third computation anywhere (a SQL `now() - created_at`, a dashboard query, a client countdown of its own) is the failure AD-14 exists to prevent.

### Conventions that bind every file you create

From the spine's Consistency Conventions — these are not style preferences, they are checked by review:

- **Naming is the PRD glossary, verbatim, in code:** `Job`, `Request`, `WorkOrder`, `RoomAssignment`, `Stay`, `Glitch`, `Recovery`, `Asset`, `Discrepancy`. **Never `ticket` or `task` in any identifier**, including test names and table names.
- **Events:** past tense, domain-first — `JobDispatched`, `RoomStatusChanged`, `SlaClockPaused`. One event per real-world fact, never one per table write.
- **Ids:** ULID for everything the system creates. Room numbers and Jazz Core identifiers are external strings and are never re-keyed.
- **Time:** UTC, RFC 3339. `occurred_at` is the domain clock, `recorded_at` the system clock (AD-2). Property timezone is presentation only. The domain takes time from `ClockPort` — never `Date.now()` inside `core/`.
- **Money:** minor units as integers plus an ISO-4217 code. No conversion anywhere in v1.
- **Errors:** one envelope everywhere — stable machine `code`, localisable `message` key, `retryable` flag. No stringly-typed errors across a boundary.
- **API shape:** commands are POSTs returning the accepted event; reads are projections; sync is one endpoint taking a batch of intents (AD-7).
- **Config:** versioned records. **Never environment-variable feature behaviour.**

### Suggested execution order

T1 → T2 → then T3, T4 and T6 can proceed in parallel → T5 → T7 last, because T7's negative controls need all three gates present. T1 and T2 are the true prerequisites: the tree and the contract shape everything after them. This is the largest story in the plan; if it needs to be split for delivery, the natural seam is **T1+T2+T6 (repository and contracts)** and **T3+T4+T5+T7 (cell and gates)** — but the gates are not useful separately, so keep T7 with the second half.

### Testing standards

- Domain is unit-tested with a **fake clock and fake ports**. If a domain test needs a database, the dependency arrow is pointing the wrong way — fix the code, not the test.
- The three gates are three separate CI jobs, each able to fail the build on its own. They are release gates for every future story, not this story's private tests.
- Idempotency, when it arrives in Story 4.3/4.4, keys on `(tenant_id, property_id, staff_member_id, client_key)` — person-scoped, not device-scoped, because handsets are shared. Do not design a device-scoped key into the schema now.

### Project Structure Notes

Greenfield: the repository does not exist yet, so there are **no UPDATE files to read** and no previous story or git history to learn from. Every file in this story is NEW. The tree in AC-1 comes from the spine's Structural Seed and matches its layer table exactly; `contracts/` additionally holds the SLA fixture vectors, which the spine's revision log promoted from a convenience to the schema of record when the mobile client moved to Flutter.

Deviation to flag if you hit it: the spine names "Managed Kubernetes or equivalent per region" and leaves provider, Kubernetes flavour and IaC tooling **deferred**, to be decided with whoever operates Jazz Core so both run under one on-call rota (OR-4). If T5 forces that choice, raise it rather than picking one — it is a deferred decision with a named owner, not a gap.

### Latest technical information — NOT AVAILABLE, and what to do about it

**Web search and fetch were blocked for the whole planning effort**, so the spine's entire Stack table is tagged `[ASSUMPTION]` and every version below is unconfirmed. This is a known process gap, recorded in the spine's Deferred list as the one item that is a gap rather than a choice. Confirming these is AC-7, i.e. part of this story's work:

| Component | Spine's proposal `[UNVERIFIED]` | Check |
|---|---|---|
| TypeScript (server, console) | 5.x | current stable |
| Node.js | 22 LTS | LTS status still current |
| NestJS | 10.x | current major; breaking changes since |
| PostgreSQL | 16.x | current stable |
| Redis | 7.x | current stable; licence terms |
| Flutter / Dart | 3.2x / 3.x | current stable channel |
| Drift (SQLite) | — | current version, null-safety, and that it is still the maintained choice |
| React / Vite / TanStack Query | 18 / — / — | current majors |
| `firebase_messaging`, `workmanager` | — | current versions and platform minimums |

Do not paper over a divergence. If a named library is deprecated or has been superseded, say so and propose the replacement with a reason; the paradigm and all 14 ADs are independent of these choices, so a substitution costs nothing architecturally.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.0] — acceptance criteria, verbatim
- [Source: _bmad-output/planning-artifacts/epics.md#Cross-cutting requirements that are release gates, not stories] — why these three are gates and not story criteria
- [Source: ARCHITECTURE-SPINE.md#Design Paradigm] — layer table and the inward-dependency rule
- [Source: ARCHITECTURE-SPINE.md#Structural Seed] — the source tree
- [Source: ARCHITECTURE-SPINE.md#Consistency Conventions] — naming, events, ids, time, money, errors, API shape, config, logging, tests
- [Source: ARCHITECTURE-SPINE.md#AD-3] — tenant+property on every row, isolation at one boundary
- [Source: ARCHITECTURE-SPINE.md#AD-4] — regional cells, guest-data-free control plane
- [Source: ARCHITECTURE-SPINE.md#AD-12] — one localisation and direction contract
- [Source: ARCHITECTURE-SPINE.md#AD-14] — one SLA fold, and the amendment permitting exactly one Dart port
- [Source: ARCHITECTURE-SPINE.md#Stack] — the unverified version table
- [Source: ARCHITECTURE-SPINE.md#Revision log] — the Flutter decision and what it cost
- [Source: ARCHITECTURE-SPINE.md#Deferred] — provider/Kubernetes/IaC and Dart-on-the-server
- [Source: prd.md#§3 Glossary] — binding vocabulary
- [Source: prd.md#§11] — DG-1 guest data minimisation, DG-4 residency
- [Source: DESIGN.md] — token values for the console scaffold

## Dev Agent Record

### Agent Model Used

_(to be filled by the dev agent)_

### Debug Log References

### Completion Notes List

- [ ] Three gate negative controls recorded (AC-6): isolation, sla-fixtures, codegen-drift each shown red against a broken fixture.
- [ ] Confirmed stack versions recorded, with divergences from the spine reported to Tanim (AC-7).
- [ ] Cell torn down and rebuilt from a clean checkout with no manual step (AC-5).

### File List
