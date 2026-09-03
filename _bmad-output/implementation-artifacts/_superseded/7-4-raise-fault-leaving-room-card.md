# Story 7.4: Raise a fault without leaving the room card

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **room attendant**,
I want to photograph a broken thing and move on,
So that reporting it does not cost me the room I am cleaning.

## Acceptance Criteria

**Given** a Room card
**When** I raise a Fault with a photo and short description
**Then** a reactive Work Order is created carrying the Room, the photo and me as the reporter (FR-22, FR-30).

**Given** the created Work Order
**When** its lifecycle proceeds
**Then** my Room flow is not blocked by it at any point (FR-22).

**Given** no connectivity
**When** I raise the Fault
**Then** it queues with its photo and applies on reconnection (FR-58, FR-62).
