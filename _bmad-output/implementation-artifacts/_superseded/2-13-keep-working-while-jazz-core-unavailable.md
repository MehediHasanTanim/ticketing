# Story 2.13: Keep working while Jazz Core is unavailable

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **front office user**,
I want to create, dispatch and close work during an upstream outage,
So that a Jazz Core problem is not a property-wide stoppage.

## Acceptance Criteria

**Given** Jazz Core is unreachable
**When** I sign in, create a Request, dispatch it, or close it
**Then** every one of those operations succeeds (FR-57)
**And** a Job created during the outage carries a marker that context was unavailable.

**Given** any surface that normally shows Stay or Jazz Core-sourced context
**When** that context is stale or unavailable
**Then** an explicit marker names the time of the last successful exchange, and no interaction is blocked by its presence (FR-57, UX-DR-5).

**Given** Room Status changes made locally during the outage
**When** Jazz Core recovers
**Then** they are queued and reconciled per FR-51, with any conflict resolved and recorded rather than dropped.

**Given** a Request created during the outage
**When** context becomes available again
**Then** the Stay context is attached on next read and the unavailable marker clears, with the Job's history showing when each happened (AD-2).
