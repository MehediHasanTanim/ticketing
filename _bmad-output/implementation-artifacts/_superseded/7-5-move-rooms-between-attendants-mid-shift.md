# Story 7.5: Move rooms between attendants mid-shift

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **housekeeping supervisor**,
I want to move a room to someone else without losing what has been done to it,
So that rebalancing a shift does not destroy the record.

## Acceptance Criteria

**Given** a Room already started by an attendant
**When** I reassign it
**Then** I must confirm, and the start time, notes and any raised Faults are preserved (FR-23).

**Given** the receiving attendant
**When** they open the Room
**Then** they see the originating attendant's note (FR-23).

**Given** a completed reassignment
**When** Credits are computed
**Then** they recalculate for both attendants (FR-23).

**Given** affected attendants on the floor
**When** the reassignment is committed
**Then** their devices reflect it within seconds while online (FR-23, NFR-3).
