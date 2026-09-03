# Story 3.11: Fast-path a guest-impacting fault

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **duty manager**,
I want no-hot-water in an occupied room to jump the queue by rule,
So that the jobs a guest is actually suffering through are not sorted with a light-bulb change.

## Acceptance Criteria

**Given** a Property-configured guest-impacting set (hot/cold, no hot water, no power, lock failure)
**When** a Job is raised against an **occupied** Room for one of those Catalog Entries
**Then** it receives the Property's priority SLA Target and priority Escalation chain (FR-36).

**Given** a fast-path Job
**When** it appears in any queue on either client
**Then** it is visually distinct, and the distinction survives greyscale (UX-DR-1).

**Given** an unavailable Staff Member
**When** a fast-path Job is assigned to them
**Then** the assignment requires an explicit override and the override is logged (FR-36).

**Given** Property quiet hours
**When** a fast-path Job escalates
**Then** quiet hours are overridden and the override is logged (FR-68).
