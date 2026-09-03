# Story 2.8: Submit OOO/OOS to Jazz Core and show the outcome

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **duty manager**,
I want a room I take out of order to reach the PMS, with the result visible on the record that set it,
So that a room out of service is not still being sold.

## Acceptance Criteria

**Given** a Room set OOO or OOS with a reason and expected return date
**When** the change is committed
**Then** it is submitted to Jazz Core and the submission outcome is displayed on the record that set it (FR-52, FR-34)
**And** success, failure and Jazz Core rejection with reason are distinguishable states, not one "sync error".

**Given** a failed submission
**When** retries run
**Then** they follow a bounded schedule and, on exhaustion, surface to the chief engineer and property administrator with the Room still marked locally (FR-52).

**Given** an expected return date that passes
**When** the Room is still OOO or OOS
**Then** it is surfaced to the chief engineer (FR-34).

**Note:** this story delivers the write-back path against a Room-level action. Story 8.5 attaches the same path to a Work Order origin and adds the return-to-sale guard; it consumes this story and adds no second submission path.
