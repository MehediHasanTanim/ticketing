# Story 9.4: Route a large Recovery for approval

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **general manager**,
I want recoveries above a threshold approved before they count as authorised,
So that generosity is deliberate.

## Acceptance Criteria

**Given** the per-role threshold configured in Story 1.4
**When** a Recovery exceeds the threshold for the recording user's role
**Then** it routes for approval and is not recorded as authorised until approved (FR-43, FR-81).

**Given** a pending approval
**When** the approver opens their queue
**Then** it appears there and escalates on the Property's configured interval (FR-43, FR-66).

**Given** an approval decision
**When** it is made
**Then** the approver and the decision timestamp are recorded (FR-43, FR-6).
