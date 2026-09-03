# Story 7.11: Define a floor layout and view rooms by it

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **property administrator**,
I want to describe how a floor is actually arranged,
So that supervisors can look at the floor rather than at a numeric list.

## Acceptance Criteria

**Given** a floor
**When** I define its layout
**Then** I enter structured data — wing, corridor side, sequence, and the position of service rooms and vertical circulation — with no CAD import and no drawing canvas in scope (FR-80).

**Given** a floor **without** a layout
**When** a user opens the plan view
**Then** the plan view is absent for that floor, not broken, and the numeric grid remains the default view everywhere (FR-80).

**Given** a Room state in the plan view
**When** compared with the same Room in the grid
**Then** the state vocabulary is identical — a tile never means something different between views (FR-80, UX-DR-3).

**Given** the plan view in Arabic
**When** it renders
**Then** corridor sides and sequence follow logical direction, so the layout mirrors coherently rather than reading backwards (AD-12, UX-DR-2).
