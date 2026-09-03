# Story 10.2: Report glitches and what they cost

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 10: Full reporting and evidence. -->

## Story

As a **general manager**,
I want failure volume and recovery spend by cause and department,
So that the owner review has evidence in it.

## Acceptance Criteria

**Given** a period
**When** I report on Glitches
**Then** I get volume, category, responsible Department, root cause and Recovery value (FR-73).

**Given** multiple currencies
**When** totals are produced
**Then** they are reported per currency without conversion in v1 (FR-73, FR-42).

**Given** Glitches linked to Jobs
**When** the report runs
**Then** they are attributable to Catalog Entries (FR-73, FR-41).
