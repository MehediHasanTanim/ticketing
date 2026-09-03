# Story 3.6: Escalate a Request nobody accepted

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **department manager**,
I want a dispatched request that nobody picks up to escalate on its own,
So that work does not sit unaccepted because everyone assumed someone else had it.

## Acceptance Criteria

**Given** a dispatched Request and a configured acceptance window
**When** the window expires without acceptance
**Then** escalation occurs with no human intervention (FR-11)
**And** the window is configurable per Catalog Entry with a Department default.

**Given** an escalation
**When** it is recorded
**Then** escalation on non-acceptance is distinguishable in reporting from escalation on completion Breach (FR-11, FR-14).

**Given** a Request accepted moments before the window expires
**When** the window passes
**Then** no escalation is raised, and the acceptance timestamp is what decides it (AD-2).
