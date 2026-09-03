# Story 2.5: Ingest master data and Stay context

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **front office user**,
I want rooms, room types and current Stay context to arrive from Jazz Core,
So that nobody maintains the property's inventory twice and a Request knows who is in the room.

## Acceptance Criteria

**Given** a connected Property
**When** Jazz Core reports Locations, Rooms and Room types it is authoritative for
**Then** they reconcile into JazzTicketing without manual re-entry, and a later change reconciles again (FR-53).

**Given** an ingested Stay
**When** the record is written
**Then** only the fields DG-1 permits are stored, enforced **at ingestion** so an excluded field can never reach a log or a projection (AD-10)
**And** check-in, check-out and room-move events are recorded with `occurred_at` from the source.

**Given** a Stay with open Jobs
**When** Jazz Core reports a room move
**Then** the open Jobs relocate to the new Room and the move is recorded on each Job (FR-53).

**Given** a Stay that checks out
**When** the check-out is ingested
**Then** the guest-facing follow-up window closes per FR-15.
