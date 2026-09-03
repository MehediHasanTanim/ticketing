# Story 6.4: Prompt and record guest follow-up

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 6: Manager visibility and guest follow-up. -->

## Story

As a **front office user**,
I want to be prompted to call the guest after their request is done and to record what they said,
So that a fixed problem does not become a bad review nobody saw coming.

## Acceptance Criteria

**Given** a completed Request whose Catalog Entry has follow-up configured
**When** completion is recorded
**Then** a follow-up prompt appears on the front office queue with the Room and the Stay (FR-15).

**Given** a follow-up
**When** I perform it through the property's existing guest channel and record the outcome
**Then** the outcome is stored and reportable, and JazzTicketing itself never contacts the guest (FR-15, PRD §5).

**Given** a Stay that has checked out
**When** the follow-up window is evaluated
**Then** the window is closed and the prompt is withdrawn (FR-53).

**Given** an outcome of guest dissatisfaction recorded in R1
**When** Epic 9 (FR-40) has not yet shipped
**Then** the outcome is recorded as a service failure, is reportable, and carries a marker that a Glitch is pending
**And** when Epic 9 ships, those markers create the linked Glitch with the Request referenced — this R1→R4 seam is deliberate and is the one place a story's full behaviour spans releases (FR-15, FR-40).
