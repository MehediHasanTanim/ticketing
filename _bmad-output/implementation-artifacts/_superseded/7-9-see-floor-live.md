# Story 7.9: See the floor live

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As an **executive housekeeper**,
I want live room status across floors with attendant progress,
So that I can tell who needs help while there is still time to help.

## Acceptance Criteria

**Given** live Room Status
**When** I open the floor view
**Then** it distinguishes not started, in progress, DND, refused, clean awaiting inspection and inspected, and refreshes without manual action (FR-27).

**Given** an attendant whose elapsed time on a started Room exceeds the Property's rolling median for that Room type and clean type by the configured percentage (default 25%)
**When** the view renders
**Then** they are flagged as behind, with the flag computed **server-side** (FR-27).

**Given** the state vocabulary
**When** I compare this view to the grid and to the handset
**Then** a state means exactly the same thing in all three (UX-DR-3).
