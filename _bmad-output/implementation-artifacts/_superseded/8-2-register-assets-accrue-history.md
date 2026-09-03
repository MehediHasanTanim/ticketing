# Story 8.2: Register assets and accrue their history

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As a **property administrator**,
I want every job against a piece of equipment to stick to that equipment,
So that "this unit again" is a fact rather than a feeling.

## Acceptance Criteria

**Given** an Asset
**When** I register it with a type, Location, identifier and optional warranty and installation dates
**Then** it exists Property-scoped and is selectable on a Work Order (FR-31).

**Given** an Asset with Work Order history
**When** an engineer opens a Job against it on the handset
**Then** the Asset's full Work Order history is visible from that Job (FR-31).

**Given** a roster of assets
**When** I bulk-import them
**Then** the import uses the same explicit-mapping and pre-write validation flow as FR-82, and partial import is supported (FR-31, FR-82).

**Given** an Asset moved to a new Location
**When** the move is saved
**Then** its history is preserved and the move is recorded (FR-31).
