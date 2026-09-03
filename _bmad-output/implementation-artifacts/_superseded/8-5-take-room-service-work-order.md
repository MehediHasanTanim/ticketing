# Story 8.5: Take a room out of service from a Work Order

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As a **chief engineer**,
I want a room taken out of order from the job that requires it, and blocked from resale until that job is done,
So that a room under repair cannot be sold by accident.

## Acceptance Criteria

**Given** a Work Order requiring the Room out of service
**When** I set OOO or OOS from it with a reason and expected return date
**Then** the write-back path delivered in Story 2.8 submits it to Jazz Core and the outcome is displayed on this Work Order (FR-34, FR-52)
**And** no second submission path is introduced.

**Given** an open OOO-linked Work Order
**When** anyone attempts to return the Room to sale
**Then** it is refused, unless an explicit override is used — and that override is logged (FR-34).

**Given** the Work Order completes
**When** closure is recorded
**Then** the Room is returned to sale and the return is submitted to Jazz Core with its outcome visible (FR-34, FR-52).
