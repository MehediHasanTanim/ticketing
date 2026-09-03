# Story 1.0: Stand up the repository, the first cell, and the three gates

Status: review

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
- [ ] **T8. Containerise the cell** (AC: 5) — *added 2026-09-03 at Tanim's request. A task under AC-5, not a new criterion; `epics.md` is final.*
  - [ ] `Dockerfile` for the API: multi-stage, production dependencies only, non-root, read-only-root-filesystem compatible, `HEALTHCHECK` on `/v1/health`, exec-form `CMD`, graceful SIGTERM drain.
  - [ ] **The same image runs the migrations** (`node dist/ops/migrate.js`) and the projection rebuild, so a deploy can never apply migrations from a different build than the code that reads them.
  - [ ] `clients/console/Dockerfile`: Vite build served by nginx as non-root on 8080, with the type-check **and** the directional lint running inside the image build.
  - [ ] **The console image is environment-agnostic** — the API URL is not baked in; an entrypoint writes `/config.json` from environment at container start and the app fetches it. One image, many environments.
  - [ ] `docker-compose.yml`: postgres, redis, a one-shot migrate service, api, console — with healthchecks and `service_completed_successfully` ordering so the API cannot serve against an unmigrated schema.
  - [ ] Secrets never in an image layer: `ops/migrate.ts` rotates the application role's password from `APP_DB_PASSWORD`, so the committed SQL's password is local-only.
  - [ ] `scripts/compose-smoke.sh` — build both images, stand the cell up, assert health, non-root, read-only filesystem, the console's runtime config, and that migrations were recorded.
  - [ ] `scripts/gate-containers.mjs` — a static gate for what a build would otherwise prove, runnable with or without a Docker CLI.
  - [ ] CI job `container-images` builds both images and runs the compose smoke.

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

`claude-opus-5` (the serving model may differ; see the session's model-identity note).

### Debug Log References

Built and verified in the cloud workspace against **PostgreSQL 16.13** and
**Redis 7.0.15**, then delivered to the project folder and re-verified there
(`npm ci`, `tsc`, boundary gate, drift gate, TypeScript fixture half, unit tests -
all green on the device). Cell teardown-and-rebuild was done from a clean
`git clone` against an empty database.

### Completion Notes List

- [x] **AC-1 source tree and inward dependencies.** Tree per the spine's Structural
  Seed. `dependency-cruiser` enforces five rules: `core/` may not import
  `adapters|app|edge|clients`; **`core/` may not import any npm package at all**
  (which is why ULID is 20 lines in `core/src/ids.ts` rather than a dependency);
  adapters never know each other; `adapters/` may not import `app|edge`; `app/` may
  not import `edge/`. Result: *no dependency violations found (29 modules, 58
  dependencies cruised)*.
- [x] **AC-2 codegen drift.** `contracts/` holds OpenAPI 3.1, an event schema, the
  error envelope, locale keys and the SLA vectors. Four TypeScript bindings are
  generated and committed. The gate also refuses hand-written wire types outside
  `contracts/generated/`.
- [x] **AC-3 partially - TypeScript half only.** The fold is in `core/src/job/sla.ts`
  (trivial elapsed case, `SLA_FOLD_VERSION = 1`), the single permitted Dart port in
  `clients/mobile/lib/sla/sla_fold.dart`, and seven language-neutral vectors in
  `contracts/sla-fixtures/vectors.json`. **TypeScript: 7/7 pass. The Dart half has
  never executed** - see *Not done* below.
- [x] **AC-4 cross-tenant isolation.** Ten assertions across all five public
  interfaces (read by id, list, search, export, crafted call with A's session and
  B's id), plus unauthenticated and forged-token cases. Backed by **Postgres
  row-level security** with the scope pinned per transaction via
  `set_config(..., is_local => true)`, so a pooled connection cannot leak one
  request's scope into the next and a future forgotten `WHERE` clause returns
  nothing. `cell.events` is **append-only for the application role** - `UPDATE` and
  `DELETE` are revoked and the test proves both are refused.
- [x] **AC-5 one reproducible cell.** API + Postgres event store + projections +
  Redis. Migrations applied from source (3 files, no manual SQL). Smoke test covers
  health, a command returning the accepted event, the projection read, AD-7
  idempotency on a repeated `clientKey`, the error envelope, the fold over HTTP, and
  a **projection rebuild that reproduces byte-identical state** (6 rows from 6
  events in 16ms). Control-plane guest-data assertion green. **Rebuilt from a clean
  clone against an empty database with no manual step: 29/29 tests pass.**
- [x] **AC-6 negative controls - and one of them found a real bug.** Six of seven
  controls confirmed their gate goes red. The drift-gate control initially reported
  **"stayed GREEN while broken"**: the first version ran codegen *before* diffing
  with git, which silently destroyed the hand-edit it was meant to catch. Rewritten
  to snapshot committed content in memory first, needing no git state at all. This
  is the entire argument for AC-6 - a gate that has never gone red is not known to
  work, and this one was not.
- [x] **AC-7 versions checked, not assumed.** Full table in `docs/stack-versions.md`.

**Negative control output (final run):**

```
1. boundary lint: make core/ import an adapter        -> ok, went RED
2. codegen drift: hand-edit a generated binding       -> ok, went RED
3. SLA fixtures: break the TypeScript fold            -> ok, went RED
4. SLA fixtures: break the Dart port                  -> UNVERIFIED (no SDK; vacuous)
5. isolation: disable row-level security              -> ok, went RED
6. control plane: add a guest-identifying column      -> ok, went RED
7. directional lint: add a physical CSS property      -> ok, went RED
negative controls: 6 correctly went red, 0 did not, 1 unverifiable here
```

**AC-7 findings - three divergences from the spine, reported not adopted silently:**

| Component | Spine `[ASSUMPTION]` | Actually current | Pinned | Note |
|---|---|---|---|---|
| TypeScript | 5.x | **7.0.2** | 5.9.3 | TS 7 release notes unreadable (web blocked). Tanim's call. |
| NestJS | 10.x | **12.0.1** | *not adopted* | Framework decision deferred - `docs/decisions/0001`. |
| React | 18 | **19.2.8** | 19.2.8 | Adopted; console builds on it. |
| Node | 22 LTS | 22.22.2 | 22 | Confirmed. |
| PostgreSQL | 16.x | 16.13 | 16 | Confirmed, running. |
| Redis | 7.x | 7.0.15 | 7 | Confirmed, running. |
| Flutter / Dart / Drift | 3.2x / 3.x | **unverified** | - | `storage.googleapis.com` and `pub.dev` both blocked. |

### Not done, and why - a reviewer must accept or reject these

1. **The Dart half of AD-14's gate has never run.** The Dart SDK download returns
   403 in this environment and `pub.dev` is unreachable. The port, the fixture
   runner and the CI job (`dart-lang/setup-dart`) are all written, and the gate
   **correctly fails** when Dart is absent rather than skipping - which is what AC-3
   specifies. But "both implementations agree" is unproven until it runs on a
   machine with a Dart SDK. **First thing to check on a networked runner.**
2. **T6's Flutter scaffold is not built.** Same blocker. `clients/mobile/` holds the
   fold, the fixture runner and a `pubspec.yaml` with an `[UNVERIFIED]` SDK
   constraint. The Drift-backed queue and the localisation scaffold belong to
   Stories 4.1-4.8 anyway; what is missing from *this* story is the app skeleton and
   the analyzer rule banning `EdgeInsets.only(left:)`. The equivalent console lint
   **is** in place and passing, and its negative control is green.
3. **The HTTP framework is deliberately unchosen.** `edge/src/server.ts` routes with
   `node:http` in ~40 lines. Rationale in `docs/decisions/0001-http-framework-deferred.md`:
   Story 1.0's ACs name no framework, NestJS is two majors ahead of the spine's
   assumption, and its release notes cannot be read here. Nothing in `core/`, `app/`
   or `adapters/` depends on the answer.
4. **The fixture auth stub is behind `FIXTURE_AUTH=1`** and defaults to off. Story
   1.5 removes its production path, as that story's notes require.

### File List

**78 source files** (excluding `_bmad*`, `node_modules`, `dist`), committed as
`ecc3dd2` in the project repository.

- `package.json`, `tsconfig.json`, `vitest.config.mts`, `.dependency-cruiser.cjs`,
  `.env.example`, `.gitignore`, `README.md`
- `contracts/` - `openapi.yaml`, `errors/envelope.json`,
  `events/fixture-note-recorded.json`, `locale/{en,ar}.json`,
  `sla-fixtures/vectors.json`, `conflict-rules/README.md`, `scripts/gen-ts.mjs`,
  `generated/ts/{api,errors,locale-keys,sla-fixtures}.ts`
- `core/src/` - `tenancy.ts`, `events.ts`, `ids.ts`, `index.ts`,
  `job/{sla,index}.ts`, `fixture/note.ts`,
  `ports/{clock,event-store,read-model,jazzcore,notification,index}.ts`
- `adapters/src/` - `postgres/{config,pool,event-store,fixture-note-read-model}.ts`,
  `cache/redis-probe.ts`, `jazzcore/README.md`, `push/README.md`
- `app/src/` - `clock.ts`, `record-fixture-note.ts`, `rebuild-projections.ts`
- `edge/src/` - `server.ts`, `auth.ts`, `errors.ts`, `main.ts`
- `ops/` - `migrate.ts`, `migrations/00{1,2,3}_*.sql`
- `clients/mobile/` - `pubspec.yaml`, `lib/sla/sla_fold.dart`,
  `bin/sla_fixtures.dart`, `README.md`
- `clients/console/` - `package.json`, `index.html`, `vite.config.ts`,
  `tsconfig.json`, `src/{main.tsx,tokens.css}`,
  `scripts/lint-logical-direction.mjs`
- `tests/` - `harness.ts`, `isolation.test.ts`, `control-plane.test.ts`,
  `smoke.test.ts`, `unit/sla.test.ts`
- `scripts/` - `gate-codegen-drift.mjs`, `gate-sla-fixtures.mjs`,
  `run-ts-fixtures.ts`, `negative-controls.sh`
- `.github/workflows/ci.yml` - five jobs, each able to fail the build alone
- `docs/` - `stack-versions.md`, `decisions/0001-http-framework-deferred.md`

**Test totals:** 29 passing (10 isolation, 6 smoke, 2 control-plane, 11 unit).

---

## Addendum — containerisation (2026-09-03)

Tanim asked whether the backend API and the frontend web app were dockerised. They
were not: the repository had no Dockerfile, no compose file and no manifests, and
`ops/` held only migrations. AC-5 was satisfied with **processes** rather than
**images** — the letter of "reproducible from the repository alone", but a weaker
reading than the spine's "Managed Kubernetes or equivalent per region", which needs
images. Worse, it had not been raised. Added now as **T8 under AC-5**, not as a new
criterion.

### What was added

| File | What it does |
|---|---|
| `Dockerfile` | API image. Three stages (deps / build / runtime), production dependencies only, `USER node`, exec-form `CMD`, `HEALTHCHECK` on `/v1/health`. Carries `ops/migrations/*.sql` because migrations are read from source at runtime. |
| `clients/console/Dockerfile` | Console image. Vite build served by `nginx` as non-root on 8080. Runs `tsc -b` **and** the directional lint inside the build. |
| `clients/console/nginx.conf` | SPA fallback, immutable hashed assets, `no-store` on `index.html` and `config.json`, `server_tokens off`, nosniff, trimmed referrer. |
| `clients/console/docker-entrypoint.d/10-write-config.sh` | Writes `/config.json` from environment at container start. |
| `clients/console/src/runtime-config.ts` | The app fetches that config, falling back to same-origin `/v1` for `vite dev`. |
| `docker-compose.yml` | postgres, redis, one-shot migrate, api, console. Healthchecks throughout; api waits on `service_completed_successfully`. |
| `.dockerignore` ×2 | Keep `node_modules`, `.env`, `.git` and build output out of the context. |
| `scripts/compose-smoke.sh` | Builds, stands the cell up, asserts health, non-root uid, read-only filesystem, console config and shell, and the migration ledger. |
| `scripts/gate-containers.mjs` | The static container gate (below). |
| CI `container-images` job | Builds both images and runs the compose smoke. |

### Three decisions worth knowing

1. **One image runs the API, the migrations and the projection rebuild.** Same build,
   same code — a deploy cannot apply migrations from a different build than the code
   that will read them.
2. **The console image is environment-agnostic.** Baking an API URL in at build time
   means one image per environment, which is painful to undo once pipelines depend on
   it. The entrypoint writes `/config.json` instead.
3. **Secrets never enter an image layer.** `ops/migrate.ts` now rotates the
   application role's password from `APP_DB_PASSWORD` at migrate time, so the
   throwaway password in migration 002 exists only to make a developer's cell work
   out of the box.

### What could NOT be verified, and why

**The images have never been built.** Docker Hub, GHCR and ECR Public are all refused
by the egress policy — `docker pull` returns 403, so buildkit cannot resolve even a
base image and `docker build --check` is unavailable for the same reason. The Docker
daemon itself starts fine; there is simply nothing to pull.

Rather than ship unverified Dockerfiles and call the task done, `npm run
gate:containers` asserts statically what a build-and-run would otherwise prove, and
runs anywhere:

```
containers  PASS  api image: multi-stage (deps -> build -> runtime)
containers  PASS  api image: runs as non-root (USER node)
containers  PASS  api image: HEALTHCHECK present
containers  PASS  api image: exec-form CMD (signals reach the process)
containers  PASS  console image: multi-stage (build -> runtime)
containers  PASS  console image: runs as non-root (USER nginx)
containers  PASS  console image: HEALTHCHECK present
containers  PASS  console image: exec-form CMD (signals reach the process)
containers  PASS  api image: .dockerignore excludes node_modules, .env, .git, dist
containers  PASS  console image: .dockerignore excludes node_modules, .env, dist
containers  PASS  console image: runtime-config entrypoint is executable
containers  PASS  compose: docker-compose.yml parses
containers  PASS  compose: postgres is health-checked
containers  PASS  compose: redis is health-checked
containers  PASS  compose: api waits for migrations to complete
containers  PASS  compose: api waits for postgres and redis to be healthy
containers  PASS  compose: api root filesystem is read-only
containers  PASS  compose: api and console drop privilege escalation
containers  PASS  compose: no host bind mounts
containers  PASS  compose: no :latest tags
```

It parses `docker-compose.yml` directly rather than shelling out to `docker compose
config`, because a gate that only runs where Docker is installed is a gate that gets
skipped. `docker compose config` is used as an extra check when the CLI is present —
it validated the file in the cloud workspace.

**Two negative controls were added** and both pass: deleting `USER node` from the API
image, and downgrading the api→migrate condition from `service_completed_successfully`
to `service_started`, each turn the gate red. Total now **8 of 9 controls confirmed**,
the ninth (Dart) still vacuous here.

### The container work found a latent bug in Story 1.0

`clients/console/src/main.tsx` annotated `JSX.Element`, which **React 19 removed** as
a global namespace. `vite build` does not type-check, so the original console
"built" fine and `tsc -b` would have failed — I had only ever run the former. Found
by adding `tsc -b` to the image build. Fixed with `import { type JSX } from 'react'`,
and the type-check now runs inside the image so it cannot recur.

### Still open after this addendum

- **Base image tags are not digest-pinned** — `node:22-alpine`, `nginx:1.27-alpine`,
  `postgres:16-alpine`, `redis:7-alpine`. The digests could not be fetched with
  registries blocked. A floating tag is a supply-chain hole, not a style preference:
  **pin these before any real deployment.** Recorded in `docs/stack-versions.md`.
- **CI's `container-images` job will be the first thing ever to build these.** Expect
  it to need fixes; nothing in these files has executed.
- **No Kubernetes manifests, no IaC, no provider choice** — and deliberately so. The
  spine defers provider, Kubernetes flavour and IaC tooling with a named owner and a
  reason (decide with whoever operates Jazz Core, so both run under one on-call rota,
  OR-4). Compose is the developer's cell and the CI smoke target; it encodes none of
  that.

### Verification after the addendum

Cloud workspace, against PostgreSQL 16.13 and Redis 7.0.15: build clean, **29/29
tests pass**, boundary gate clean (29 modules), drift gate clean, container gate
clean, TypeScript fixture half 7/7. Re-verified on Tanim's machine: build clean,
container gate clean via the YAML path with no Docker CLI present, unit tests 11/11.

**Bridge note:** `npm ci` cannot run through the Cowork folder mount — it deletes
`node_modules` first and deletes are not permitted there. Use `npm install` on the
mount, or run from a normal terminal on the Mac.
