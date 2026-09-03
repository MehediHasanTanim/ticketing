# Story 6.3: Show whether the data can be trusted

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 6: Manager visibility and guest follow-up. -->

## Story

As a **general manager**,
I want to see which departments are actually using the handsets,
So that I do not make a decision from a department's figures when half its staff never signed in.

## Acceptance Criteria

**Given** a rostered Department
**When** I open adoption reporting
**Then** I see daily active line staff as a percentage of rostered line staff, per Department (FR-74, SM-3).

**Given** a Department below the configured usage threshold
**When** its figures appear **anywhere** in reporting
**Then** they are marked as having incomplete data (FR-74).

**Given** that indicator
**When** any user attempts to hide or disable it
**Then** it cannot be turned off from within reporting (FR-74).

**Given** a feature disabled at a Property by Jazz Core capability absence
**When** adoption is computed
**Then** it is excluded rather than counted as non-adoption (FR-78).
