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

```bash
cp .env.example .env      # then set the two DATABASE_URLs and REDIS_URL
npm ci
npm run build
npm run migrate           # applied from source; there is no manual SQL step
npm start                 # GET /v1/health
```

Postgres 16 and Redis 7 must be reachable. The application connects as a
non-superuser role with row-level security in force; only migrations and the
projection rebuild connect as an admin.

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
