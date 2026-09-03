# Story 8.4: Record parts consumed

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As an **engineer**,
I want to record what I used from our parts list,
So that the cost of keeping a thing running is visible.

## Acceptance Criteria

**Given** a Property-maintained parts list
**When** I record parts against a Work Order
**Then** consumption is stored per Work Order and reportable per Asset (FR-35, FR-72).

**Given** v1 scope
**When** I look for purchasing, reorder or supplier workflow
**Then** none is present; consumption and on-hand count only (FR-35, PRD §5).
