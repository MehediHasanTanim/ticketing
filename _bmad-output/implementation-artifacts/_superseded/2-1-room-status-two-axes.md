# Story 2.1: Room Status on two axes

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **property administrator**,
I want every Room to carry an occupancy state and a cleanliness state independently, plus OOO and OOS,
So that "vacant and dirty" is expressible and the two axes never overwrite each other.

## Acceptance Criteria

**Given** a Room
**When** its status is read
**Then** occupancy and cleanliness are separate values, each with its own history, plus OOO and OOS states (FR-19)
**And** OOO and OOS are mutually exclusive; setting one clears the other with the transition recorded.

**Given** a cleanliness change and an occupancy change arriving for the same Room
**When** both are applied
**Then** neither overwrites the other axis, and each is recorded as its own event with `occurred_at` and `recorded_at` (AD-2).

**Given** the Room aggregate
**When** any component writes to it
**Then** the write goes through the single writing owner for Room status; no other module emits a room-status event (AD-13).
