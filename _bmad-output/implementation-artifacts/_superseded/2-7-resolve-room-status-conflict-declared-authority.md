# Story 2.7: Resolve a Room Status conflict by declared authority

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **property administrator**,
I want a conflicting room status resolved by a rule I can see, with the losing change kept,
So that no attendant's recorded work disappears and I can tell how often it happens.

## Acceptance Criteria

**Given** Jazz Core and JazzTicketing holding different status for the same Room
**When** the conflict is detected
**Then** it resolves by the configured authority rule, defaulting to Jazz Core-authoritative for occupancy and JazzTicketing-authoritative for cleanliness, Property-configurable (FR-51, AD-6).

**Given** a resolved conflict
**When** the losing side was a Staff Member's recorded action
**Then** that action is preserved and visible in the Room's history — a conflict is never resolved by discarding it without a record (FR-51).

**Given** conflict volume above the configured threshold
**When** the threshold is crossed
**Then** the property administrator is notified and the conflict count is reportable.
