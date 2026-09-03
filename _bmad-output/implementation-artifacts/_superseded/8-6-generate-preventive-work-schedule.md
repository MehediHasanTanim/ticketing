# Story 8.6: Generate preventive work from a schedule

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As a **chief engineer**,
I want preventive jobs to appear on their own,
So that the work that prevents failures is not the work that gets skipped.

## Acceptance Criteria

**Given** a PM Schedule
**When** I define it on a calendar, runtime or occupancy-based trigger
**Then** it generates preventive Work Orders on that trigger, each carrying its originating PM Schedule (FR-32).

**Given** runtime and occupancy triggers in v1
**When** they fire
**Then** they are driven by data Jazz Core or manual entry supplies, not by IoT telemetry (FR-32, PRD §5).

**Given** preventive Work Orders that are missed or overdue
**When** reporting is produced
**Then** they are reportable as missed and overdue rather than merged into open volume (FR-32, FR-38).
