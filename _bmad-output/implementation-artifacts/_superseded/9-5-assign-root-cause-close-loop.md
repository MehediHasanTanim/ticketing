# Story 9.5: Assign a root cause and close the loop

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **department manager**,
I want to say why a failure happened and mark it reviewed,
So that the same failure is not rediscovered every month.

## Acceptance Criteria

**Given** a Glitch
**When** I assign a root cause from the configurable list and mark it reviewed
**Then** both are recorded with actor and timestamp (FR-44).

**Given** unreviewed Glitches older than the configurable age
**When** the GM's view loads
**Then** they are surfaced there (FR-44, FR-70).

**Given** a period and a Department
**When** reporting runs
**Then** root-cause distribution is reportable (FR-44, FR-73).
