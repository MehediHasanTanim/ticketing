# Story 8.8: See the whole engineering queue

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As a **chief engineer**,
I want reactive and preventive work in one place but separable,
So that today's noise does not hide next month's failure.

## Acceptance Criteria

**Given** all open Work Orders for my Property
**When** I open the queue
**Then** I can filter by status, SLA state, Asset and assignee, and preventive work due is included (FR-38).

**Given** preventive and reactive work
**When** the queue renders
**Then** they are distinguishable and separately filterable (FR-38).

**Given** overdue preventive work
**When** reactive volume is high
**Then** the overdue preventive work is surfaced rather than buried beneath it (FR-38).
