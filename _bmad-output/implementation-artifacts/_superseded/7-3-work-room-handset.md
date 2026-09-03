# Story 7.3: Work a room from the handset

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **room attendant**,
I want to start, pause and complete a room, and to say when I could not,
So that the record matches what actually happened on the floor.

## Acceptance Criteria

**Given** a Room on my board
**When** I start, pause and complete it
**Then** start and complete timestamps are recorded per Room per attendant (FR-21).

**Given** a Room I cannot service
**When** I record DND or refuse-service
**Then** the Room is not completed, and a configured re-attempt reminder is set (FR-21).

**Given** the clean flow
**When** I attempt to mark a Room clean without having started it
**Then** it is refused; **and** a direct cleanliness change through Set status is permitted, attributed to me, and distinguishable in reporting from a completed clean (FR-21).

**Given** the Inspected state
**When** I attempt to set it
**Then** it is refused for my role, and a supervisor override of either restriction is logged (FR-21, AD-11).

**Given** any of these actions taken with no connectivity
**When** the device syncs
**Then** each carries the time I performed it (FR-58, AD-2).
