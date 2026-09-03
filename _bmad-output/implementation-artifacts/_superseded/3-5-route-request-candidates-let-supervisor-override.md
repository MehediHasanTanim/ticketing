# Story 3.5: Route a Request to candidates and let a supervisor override

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **department supervisor**,
I want a new request to reach the right people automatically and still be mine to redirect,
So that dispatch does not wait for me but never escapes me either.

## Acceptance Criteria

**Given** a new Request
**When** it is dispatched
**Then** candidates are selected by Department, role and current open-Job load — rule-based in v1, not skill-graph or predictive (FR-9)
**And** an unassigned Request appears in the Department queue where any eligible Staff Member can accept it.

**Given** a Request at any point in its lifecycle
**When** a supervisor reassigns it
**Then** the SLA Clock, history and attachments are preserved and the reassignment is recorded with actor and reason where configured (FR-9).

**Given** a Request assigned to a Staff Member
**When** a second Staff Member attempts to accept it
**Then** the attempt is refused and the current owner is named.
