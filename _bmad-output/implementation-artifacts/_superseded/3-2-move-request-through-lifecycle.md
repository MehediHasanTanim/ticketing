# Story 3.2: Move a Request through its lifecycle

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **department supervisor**,
I want every state change on a Request recorded with who did it and when,
So that "what happened to this job" is answerable from the record rather than from memory.

## Acceptance Criteria

**Given** a Request
**When** it moves logged → dispatched → accepted → in progress → completed → closed
**Then** each transition records actor and timestamp as an event, and the sequence is the source of the Job's state (FR-10, AD-1).

**Given** any state
**When** an illegal transition is attempted through any interface
**Then** it is refused server-side with the current state named.

**Given** a Request before completion
**When** a permitted user cancels it
**Then** a reason is required and recorded, and the Request cannot be cancelled after completion.

**Given** a Catalog Entry with required completion fields
**When** completion is attempted without them
**Then** completion is refused and the missing fields are named (FR-10).
