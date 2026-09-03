# Story 10.3: Export a report and generate an evidence pack

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 10: Full reporting and evidence. -->

## Story

As a **department manager**,
I want any report as a file and an audit-ready pack for a date range,
So that a brand inspection is a download rather than a fortnight.

## Acceptance Criteria

**Given** any report
**When** I export it
**Then** CSV and PDF are produced and the export respects my Property and Department scope (FR-75).

**Given** an export
**When** it completes
**Then** it is recorded in the audit trail with actor, scope and period (FR-75, FR-6).

**Given** an evidence pack for a date range
**When** I generate it
**Then** it assembles the configured report set for that period
**And** `[ASSUMPTION]` its required contents must be confirmed against the specific brand standards the target Properties are audited against before this story is estimated (FR-75).

**Given** a Department marked as having incomplete data (FR-74)
**When** its figures appear in an export or pack
**Then** the marking travels with them (FR-74).
