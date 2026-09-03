# Story 2.11: Guest call becomes a pre-resolved Request draft

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

*Sequenced after Story 3.1 — a draft Request cannot exist before Requests do.*

As a **telephone operator**,
I want a guest call from a room to arrive as a draft already resolved to that room and stay,
So that I am talking to the guest instead of typing a room number.

## Acceptance Criteria

**Given** a Property whose Jazz Core reports call events
**When** a guest calls from a Room
**Then** a Request draft pre-resolved to that Room and Stay appears to the operator handling the call within two seconds of JazzTicketing receiving the event (FR-54, NFR-3).

**Given** a call whose caller cannot be resolved to a Room
**When** the draft appears
**Then** it is an explicitly unresolved draft, never a wrongly-resolved one.

**Given** a draft the operator discards
**When** the call ends
**Then** the draft is not retained as a Request and nothing enters the queue.
