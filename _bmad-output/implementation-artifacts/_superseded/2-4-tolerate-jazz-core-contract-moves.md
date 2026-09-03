# Story 2.4: Tolerate a Jazz Core contract that moves

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **JazzTicketing engineer**,
I want the consumed Jazz Core contract pinned and version-tolerant,
So that a Jazz Core release ahead of or behind us degrades predictably instead of taking a property down.

## Acceptance Criteria

**Given** a pinned contract version per environment
**When** Jazz Core sends an unknown event type or an unknown field
**Then** it is ignored and counted, never fatal, and the occurrence is visible in health (FR-77).

**Given** a required capability that a Property's Jazz Core does not report
**When** the dependent feature would be used
**Then** it is already disabled with an explicit reason surfaced in health, rather than failing at the point of use (FR-77, FR-78).

**Given** the CI pipeline
**When** it runs
**Then** contract-level integration tests execute against a Jazz Core test environment, and a contract break fails the build (FR-77, OR-4).
