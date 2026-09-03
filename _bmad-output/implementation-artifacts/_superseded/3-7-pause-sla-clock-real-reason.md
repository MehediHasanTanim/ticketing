# Story 3.7: Pause an SLA Clock for a real reason

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **room attendant**,
I want to pause the clock when I cannot proceed for a reason the property recognises,
So that waiting for a part is not recorded as me being slow.

## Acceptance Criteria

**Given** a Job whose Catalog Entry has configured Pause Conditions
**When** I pause it
**Then** only those Pause Conditions are offered, a reason from the configured list is required, and the pause is recorded as an event (FR-13).

**Given** a paused interval
**When** SLA is measured
**Then** the interval is excluded from measurement by the one fold, retained in history, and total paused duration is visible on the Job and reportable separately from active time (FR-13, FR-71).

**Given** a Job paused beyond the configured maximum
**When** the maximum is exceeded
**Then** it re-escalates rather than remaining parked (FR-13).
