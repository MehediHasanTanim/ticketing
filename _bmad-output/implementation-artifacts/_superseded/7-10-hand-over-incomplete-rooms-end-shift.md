# Story 7.10: Hand over incomplete rooms at end of shift

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **room attendant**,
I want to end my shift honestly with rooms unfinished,
So that what I did is kept and what is left is visible.

## Acceptance Criteria

**Given** started but incomplete Rooms on my board
**When** I end my shift
**Then** those Rooms return to the unassigned pool with their state, start time, notes and raised Faults intact (FR-29).

**Given** the supervisor's board
**When** those Rooms appear
**Then** they are presented as handover items, distinguishable from new work (FR-29).
