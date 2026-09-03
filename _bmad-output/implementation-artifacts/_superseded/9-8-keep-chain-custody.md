# Story 9.8: Keep a chain of custody

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **property administrator**,
I want every change of possession recorded immutably,
So that the register answers a legal question, not just an operational one.

## Acceptance Criteria

**Given** a Lost & Found Item
**When** it moves through found → stored → matched → returned or disposed
**Then** every change of possession or state is recorded with actor and timestamp (FR-47).

**Given** custody history
**When** it is read or exported
**Then** it is immutable and exportable (FR-47, FR-6).

**Given** a return
**When** it is recorded
**Then** the recipient and the release method are required (FR-47).

**Given** a disposal
**When** it is recorded
**Then** a reason is required and, above a configurable value, an approver (FR-47).

**Given** the retention and disposal timers in DG-2
**When** I open an item
**Then** its timers are visible on the item (FR-48).
