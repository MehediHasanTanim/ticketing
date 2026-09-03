# Story 3.3: Show Stay and guest context on a Request

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **department supervisor**,
I want the guest's name, VIP flag and departure date on the job,
So that priority calls are informed rather than guessed.

## Acceptance Criteria

**Given** a Request against an occupied Room
**When** it is created and again each time it is displayed
**Then** it shows the current Stay's guest name, VIP or loyalty flag and departure date as reported by Jazz Core (FR-8).

**Given** Jazz Core is unreachable
**When** I create a Request
**Then** creation succeeds and context shows as unavailable — never blocked, and never stale without a marker (FR-8, FR-57).

**Given** any surface displaying guest context
**When** the record is logged or exported
**Then** guest identifiers are absent from logs (AD-10, DG-1) and present only where DG-1 permits.
