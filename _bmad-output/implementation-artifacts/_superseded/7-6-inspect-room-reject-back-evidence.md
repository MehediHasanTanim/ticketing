# Story 7.6: Inspect a room and reject it back with evidence

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **housekeeping supervisor**,
I want to inspect against our checklist and send a room back with photos,
So that a rejection is specific rather than a conversation.

## Acceptance Criteria

**Given** the Property's Inspection checklist, scored or pass/fail
**When** I inspect a completed Room
**Then** I can pass or reject it against those items (FR-24).

**Given** a rejection
**When** I record it with notes and photos
**Then** the Room re-enters the originating attendant's board **ahead of unstarted Rooms**, flagged with those notes and photos (FR-24).

**Given** inspection outcomes over a period
**When** reporting is produced
**Then** they are reportable by attendant and by supervisor (FR-24).
