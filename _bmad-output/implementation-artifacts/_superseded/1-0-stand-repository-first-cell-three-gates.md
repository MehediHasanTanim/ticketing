# Story 1.0: Stand up the repository, the first cell, and the three gates

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **JazzTicketing engineer**,
I want the source tree, one running region cell and the three release gates in place and green,
So that every story after this one is verified by the checks the architecture depends on rather than assuming they exist.

*Plumbing, not user value — added deliberately at Tanim's decision on 2026-09-02. The spine names no starter template, and the three CI gates below cannot pass on any story until the pipeline that runs them exists. Without this story every later story inherits an unstated prerequisite.*

## Acceptance Criteria

**Given** the source tree defined in the architecture spine
**When** the repository is initialised
**Then** it contains `core/`, `core/ports/`, `adapters/`, `app/`, `edge/`, `clients/mobile`, `clients/console`, `contracts/` and `ops/`, with dependencies pointing inward only
**And** a lint rule fails the build if `core/` imports from `adapters/`, `edge/` or `app/`.

**Given** `contracts/` as the schema of record
**When** CI runs
**Then** the TypeScript and Dart bindings are generated from it and the **codegen-drift gate** fails the build if a generated file differs from a committed one, or if a wire type is hand-written on either side.

**Given** a trivial SLA fixture in `contracts/`
**When** CI runs
**Then** the **two-language fixture gate** executes it against both the TypeScript fold and the Dart port, and the build fails if either is absent or disagrees (AD-14).

**Given** two seeded tenants in one cell
**When** the **cross-tenant isolation suite** runs against every public interface — reads, search, exports and direct API calls
**Then** every cross-tenant access attempt fails, and the build fails if any succeeds (AD-3, DG-1).

**Given** one region cell
**When** it is deployed from `ops/`
**Then** it runs the API, the Postgres event store and projections, and Redis, with migrations applied from source and no guest data in the control plane (AD-4)
**And** the cell is reproducible from the repository alone, with no hand configuration step that is not committed.

**Given** all three gates
**When** they first run
**Then** each is green over trivial fixtures, so that a later failure means a real regression rather than an unfinished gate.

**Given** this story
**When** it is estimated
**Then** the stack versions it pins are treated as **unverified** — every version in the spine's Stack table came from training knowledge with web access blocked, and confirming them is part of this story's work, not an assumption inside it.
