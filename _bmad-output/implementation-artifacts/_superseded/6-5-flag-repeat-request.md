# Story 6.5: Flag a repeat request

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 6: Manager visibility and guest follow-up. -->

## Story

As a **front office user**,
I want to know at the moment of logging that this room already asked for this today,
So that the second call gets treated as a failure rather than as a new job.

## Acceptance Criteria

**Given** a Location and Catalog Entry that produced a Request within the configurable window on the same Stay
**When** a new Request is created
**Then** it is flagged as a repeat, visible to me at creation and on the dispatched Job (FR-16).

**Given** repeat Requests
**When** reporting is produced
**Then** they are counted separately from first-time Requests (FR-16).

**Given** the detection window
**When** a property administrator changes it
**Then** the change is Property-scoped and applies to Requests created after it (FR-16, AD-9).
