# Story 7.2: Order departures by the arrivals that need them

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **housekeeping supervisor**,
I want departure rooms sequenced by today's arrival demand,
So that the rooms someone is waiting for get cleaned first.

## Acceptance Criteria

**Given** arrival demand reported through Jazz Core
**When** a board is generated
**Then** departure Rooms are ordered by that demand (FR-28, FR-53).

**Given** arrivals that change during the day
**When** the change is ingested
**Then** priority recomputes without a manual step.

**Given** a Room I pin to the top of a board
**When** priority recomputes
**Then** my override survives the recomputation and is visible as a manual pin (FR-28).
