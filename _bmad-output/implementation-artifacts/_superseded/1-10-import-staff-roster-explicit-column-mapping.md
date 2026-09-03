# Story 1.10: Import a staff roster with explicit column mapping

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property or tenant administrator**,
I want to create and update users in bulk from our roster file with a mapping step I control,
So that opening day does not mean typing three hundred people in one at a time — and no field we are not allowed to hold gets imported by accident.

## Acceptance Criteria

**Given** a roster file
**When** I upload it
**Then** I map each source column explicitly to a destination field, and no automatic mapping is applied without my review (FR-82).

**Given** a source column that maps to a field outside the permitted dataset — a payroll identifier, a date of birth, or anything else DG-1 and DG-5 exclude
**When** I attempt to map it
**Then** the mapping is refused with the reason stated, rather than silently ignored.

**Given** a mapped file
**When** I proceed
**Then** every row is validated before anything is written, rows with problems are presented individually with a proposed resolution, and a partial import is a supported outcome
**And** the count of rows that will become PIN-only accounts (no email address) is shown before I confirm (FR-4).

**Given** a completed import
**When** I open the audit trail
**Then** the file name, row count and outcome are recorded (FR-6).
