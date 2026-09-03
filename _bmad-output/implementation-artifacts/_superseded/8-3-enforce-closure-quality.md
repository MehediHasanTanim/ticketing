# Story 8.3: Enforce closure quality

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As a **chief engineer**,
I want a work order to be closeable only with a real resolution,
So that the history is worth reading next year.

## Acceptance Criteria

**Given** a Work Order
**When** I close it
**Then** a resolution is required, plus a root cause and a photo where the Catalog Entry requires them (FR-37).

**Given** root cause
**When** I select it
**Then** values come from a Property-configurable list rather than free text alone (FR-37).

**Given** missing required fields
**When** closure is attempted through any interface
**Then** closure is refused server-side with the missing fields named (FR-37, AD-11).

**Given** a Work Order closed as recurring
**When** it is saved
**Then** it links to the prior Work Orders it repeats and they are navigable from it (FR-37).
