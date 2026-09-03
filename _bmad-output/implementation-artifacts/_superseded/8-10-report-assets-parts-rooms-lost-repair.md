# Story 8.10: Report on assets, parts and rooms lost to repair

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As a **general manager**,
I want the cost of things that keep breaking in room-nights and parts,
So that a capital decision has a number behind it.

## Acceptance Criteria

**Given** a period
**When** I report on Assets and Locations
**Then** I can rank by Work Order frequency, by cost of parts consumed, and by OOO duration (FR-72).

**Given** recurring-fault flags (FR-33)
**When** the report runs
**Then** they are listed with drill-down to the underlying Work Orders (FR-72).

**Given** OOO duration
**When** it is reported
**Then** it is expressed as revenue-relevant room-nights lost (FR-72).
