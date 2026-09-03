# Story 9.7: Record a found item

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **room attendant**,
I want to record what I found before I leave the room,
So that the item enters a register rather than a drawer.

## Acceptance Criteria

**Given** an item I have found
**When** I record it from the handset with photo, Location found, date, finder and category
**Then** it is created — and creation is refused without Location, finder and date (FR-46).

**Given** an item accepted into storage
**When** acceptance is recorded
**Then** a storage location and reference are assigned (FR-46).

**Given** no connectivity
**When** I record the item with its photo
**Then** it queues durably and applies on reconnection with the time found (FR-58, FR-62).
