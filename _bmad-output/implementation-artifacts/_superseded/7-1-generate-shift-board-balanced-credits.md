# Story 7.1: Generate a shift board balanced by Credits

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **housekeeping supervisor**,
I want the day's assignments generated and then adjustable,
So that the board is fair before the shift starts instead of argued about after it.

## Acceptance Criteria

**Given** a Property with Credit values configured by Room type and clean type
**When** I generate Room Assignments for a shift
**Then** generation completes for a 400-Room Property in under ten seconds and balances by Credits (FR-20, NFR-3).

**Given** generated assignments
**When** I review the board
**Then** any Room not assigned is visible **as unassigned** rather than silently dropped (FR-20).

**Given** a generated board
**When** I adjust an assignment before the shift starts
**Then** Credits recalculate for the affected attendants and the adjustment is attributed to me (FR-6).
