# Story 7.8: Request linen, amenities and supplies from the floor

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **room attendant**,
I want to ask for towels without walking to the linen room,
So that a shortage costs minutes rather than a room.

## Acceptance Criteria

**Given** the configured supply Catalog Entries
**When** I request linen, amenities or supplies from the handset
**Then** a Job is created and routed to the configured Department following the standard Request lifecycle (FR-26, FR-10).

**Given** an open supply Job
**When** I continue my board
**Then** nothing about my Room flow is blocked by it (FR-26).
