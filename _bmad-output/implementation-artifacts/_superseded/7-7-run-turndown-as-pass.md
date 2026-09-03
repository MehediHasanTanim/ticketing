# Story 7.7: Run turndown as its own pass

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 7: Housekeeping operations. -->

## Story

As a **housekeeping supervisor**,
I want an evening pass with its own credits and window,
So that turndown is planned work rather than an overwrite of the morning's record.

## Acceptance Criteria

**Given** a day with completed cleans
**When** I generate a turndown pass
**Then** it is a separate Room Assignment with its own Credits and time window (FR-25).

**Given** a Room with a completed clean
**When** its turndown is completed on the same date
**Then** both records exist independently and neither overwrites the other (FR-25).
