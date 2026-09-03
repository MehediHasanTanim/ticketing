# Story 2.6: Synchronise Room Status in both directions

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **room attendant**,
I want a status I set to reach the PMS and a status the PMS sets to reach me,
So that the front desk and the floor are looking at the same room.

## Acceptance Criteria

**Given** a cleanliness change made in JazzTicketing
**When** it is committed
**Then** it is submitted to Jazz Core and JazzTicketing's own share of the propagation budget is under five seconds, within a target end-to-end budget of thirty seconds (FR-50, NFR-3).

**Given** a status change originating in the PMS
**When** Jazz Core reports it
**Then** it applies to the Room without manual entry and is visible on every open Room view.

**Given** any synchronisation event in either direction
**When** it completes or fails
**Then** direction, outcome and latency are logged with JazzTicketing-side and Jazz Core-side latency separable (FR-50, NFR-8).

**Given** sustained synchronisation failure
**When** the threshold is crossed
**Then** it surfaces through integration health rather than silently diverging (FR-49).
