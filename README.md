# JazzTicketing

Hospitality service operations for hotels. Multi-tenant, multi-region, consuming
**Jazz Core** as its sole upstream.

Planning artifacts live in `_bmad-output/planning-artifacts/` and are `status: final`:
the PRD (83 FRs), both UX spines, the architecture spine (14 invariants), and
`epics.md` (10 epics, 87 stories). **This repository implements them; it does not
re-decide them.**

## Where things live (ARCHITECTURE-SPINE.md#Structural Seed)

```
core/        pure domain - no I/O, no framework, no clock of its own, no npm deps
core/ports/  the interfaces the domain needs
adapters/    one per external reality (postgres, cache, jazzcore, push)
app/         command handlers, projections, sagas
edge/        HTTP, auth, tenancy resolution
clients/
  mobile/    the handset - Flutter + Dart
  console/   the manager console - React + TypeScript
contracts/   THE SCHEMA OF RECORD - both language bindings generated from here
ops/         migrations and per-region deployment
tests/       the release gates plus unit tests
```

**Dependencies point inward only.** `npm run gate:boundaries` fails the build if
`core/` reaches outward, if two adapters know each other, or if anything imports a
framework into the domain.

## Running it locally

### In containers, with nothing installed on the host

```bash
docker compose up -d --wait     # postgres, redis, migrations, api, console
curl localhost:3001/v1/health   # {"status":"ok",...}
open http://localhost:8081      # the console
docker compose down -v
```

**Published ports**, all overridable (`API_PORT`, `CONSOLE_PORT`, `POSTGRES_PORT`,
`REDIS_PORT`) and chosen to stay clear of a machine already running Postgres:

| Service | Host | Inside the compose network |
|---|---|---|
| api | **3001** | 3001 — the API listens on 3001 in a container or on a host |
| console | **8081** | 8081 |
| postgres | **5433** | **5432** |
| redis | **6380** | **6379** |

Postgres and Redis keep their standard ports *inside* the network, because each
container has its own network namespace and nothing there can collide — which is
why the API's `DATABASE_URL` still says `postgres:5432`. The host mapping is the
only thing that needs to move. Running the API on the host against the compose
datastores is the case that uses 5433 and 6380; `.env.example` is written that way.

`npm run compose:smoke` builds both images, stands the cell up, and asserts the
API reports every dependency reachable, runs as non-root on a read-only
filesystem, and that the console serves its runtime config. That script is the
proof the containerised cell works; run it before trusting the images.

Compose is the **developer's cell and the CI smoke target** - not a production
topology. Provider, Kubernetes flavour and IaC tooling are deferred by the
architecture spine, to be decided with whoever operates Jazz Core so both run
under one on-call rota (OR-4). Nothing here pre-empts that.

### Directly on the host

```bash
cp .env.example .env      # then set the two DATABASE_URLs and REDIS_URL
npm ci
npm run build
npm run migrate           # applied from source; there is no manual SQL step
npm start                 # GET localhost:3001/v1/health
```

Postgres 16 and Redis 7 must be reachable. The application connects as a
non-superuser role with row-level security in force; only migrations and the
projection rebuild connect as an admin.

## Containers

| Image | Built from | Runs as | Notes |
|---|---|---|---|
| `jazzticketing/api` | `./Dockerfile` | `node` (non-root) | Multi-stage; production deps only; read-only root filesystem; HEALTHCHECK on `/v1/health`; graceful SIGTERM drain. |
| `jazzticketing/console` | `./clients/console/Dockerfile` | `nginx` (non-root, :8080) | Vite build served by nginx; type-check and the directional lint run **inside** the image build. |

Two decisions worth knowing:

- **The API image also runs the migrations** (`node dist/ops/migrate.js`) and the
  projection rebuild. Same image, same build - so a deploy can never apply
  migrations from a different build than the code that will read them.
- **The console image is environment-agnostic.** The API URL is not baked in; the
  entrypoint writes `/config.json` from environment at container start and the app
  fetches it. One image, many environments.

Secrets never enter an image layer. `ops/migrate.ts` rotates the application
role's password from `APP_DB_PASSWORD` at migrate time, so the throwaway password
in the committed SQL exists only to make a developer's cell work out of the box.

## The four release gates

Every one of these can fail the build on its own, and every one has been shown to
go **red** when deliberately broken (`npm run negative-controls`). A gate that has
never failed is not known to work.

| Gate | Command | Guards |
|---|---|---|
| Inward dependencies | `npm run gate:boundaries` | AD-3 layering, AC-1 |
| Contracts are the schema of record | `npm run gate:codegen-drift` | generated bindings, no hand-written wire types |
| One SLA fold, two languages | `npm run gate:sla-fixtures` | AD-14 - TypeScript fold and the single Dart port over the same vectors |
| Cross-tenant isolation | `npm run gate:isolation` | AD-3 / DG-1 through every public interface |
| Control plane holds no guest data | `npm run gate:control-plane` | AD-4 |
| Container definitions | `npm run gate:containers` | non-root, health-checked, no baked secrets, ordered startup, no host bind mounts, no hard-coded host ports |

`npm run gates` runs them all. `npm run smoke` proves the cell actually serves a
command end to end and that a projection rebuild reproduces the same state.

## Two things to know before writing any feature code

**The SLA fold exists once.** `core/src/job/sla.ts` is authoritative; the only other
copy in the entire system, in any language, is `clients/mobile/lib/sla/sla_fold.dart`,
and it exists solely because Dart cannot import TypeScript. Both run
`contracts/sla-fixtures/vectors.json` as a release gate. No third implementation,
and no SQL that computes elapsed time - a dashboard and a month-end report that
each did their own arithmetic is the failure AD-14 was written to prevent.

**Vocabulary is binding.** `Job`, `Request`, `WorkOrder`, `RoomAssignment`, `Stay`,
`Glitch`, `Recovery`, `Asset`, `Discrepancy`. Never `ticket` or `task` in any
identifier - including tests and table names.
