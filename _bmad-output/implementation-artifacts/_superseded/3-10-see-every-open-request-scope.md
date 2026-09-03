# Story 3.10: See every open Request for my scope

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **department manager**,
I want a live list of open work filtered the way I think about it,
So that I can act on the floor rather than read a report about yesterday.

## Acceptance Criteria

**Given** open Requests in my scope
**When** I open the view
**Then** I can filter by Department, status, SLA state and Location, sorted by urgency (FR-18).

**Given** a state change anywhere in my scope
**When** it occurs
**Then** the view reflects it within five seconds without a manual refresh (FR-18, NFR-3).

**Given** breaching and breached Jobs
**When** they appear in the list
**Then** they are visually distinct from within-target Jobs, and that distinction survives greyscale (UX-DR-1, NFR-6).

**Given** the current filter and scope
**When** I export the view
**Then** the export respects my Property and Department scope and is recorded in the audit trail (FR-18, FR-75).
