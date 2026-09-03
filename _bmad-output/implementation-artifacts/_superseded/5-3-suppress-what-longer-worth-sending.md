# Story 5.3: Suppress what is no longer worth sending

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 5: Escalation and notification routing. -->

## Story

As a **room attendant**,
I want to stop being paged about work someone else already took,
So that I keep paying attention to the notifications that matter.

## Acceptance Criteria

**Given** a Job accepted before a queued notification is delivered
**When** delivery is attempted
**Then** other candidates are not notified (FR-67, FR-60).

**Given** repeated escalations on the same Job to the same recipient
**When** they occur inside the configured window
**Then** they coalesce into one notification (FR-67).

**Given** a Breach notification addressed to a management role
**When** suppression rules are evaluated
**Then** suppression **never** applies to it (FR-67).

**Given** the suppression contract
**When** it is evaluated
**Then** it is evaluated once, in the domain, and the delivery adapter makes no suppression decision of its own (AD-8).
