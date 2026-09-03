# Story 2.9: Reflect phone-posted status and minibar events

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **housekeeping supervisor**,
I want a status posted from a room phone to behave exactly like one posted in the app,
So that attendants who use the handset in the room are not a second class of data.

## Acceptance Criteria

**Given** a room-status code posted through a room phone and reported by Jazz Core
**When** it is ingested
**Then** it is treated identically to an in-app status change for synchronisation (FR-50) and conflict resolution (FR-51), with its origin recorded (FR-56).

**Given** a minibar posting reported by Jazz Core
**When** it is ingested
**Then** it attaches to the Stay and is visible on the Stay timeline
**And** JazzTicketing records it and never posts financially — that stays a Jazz Core/PMS function (FR-56).
