# Story 5.4: Respect quiet hours without burying an emergency

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 5: Escalation and notification routing. -->

## Story

As an **off-shift engineer**,
I want routine work to wait for my shift while a guest emergency still reaches me,
So that quiet hours are respected without becoming a safety problem.

## Acceptance Criteria

**Given** Property-configured shift and quiet-hour rules
**When** routine work is dispatched or escalated outside a recipient's shift
**Then** they are not paged, and the routing falls to whoever is on shift (FR-68).

**Given** a guest-impacting fast-path Job (FR-36)
**When** it is dispatched or escalates during quiet hours
**Then** quiet hours are overridden, the notification is delivered, and the override is logged (FR-68).

**Given** a Property with no shift configuration
**When** an event occurs
**Then** routing falls to the Department default rather than to no one (FR-68).
