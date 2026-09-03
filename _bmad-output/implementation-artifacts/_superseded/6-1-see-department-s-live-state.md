# Story 6.1: See my Department's live state

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 6: Manager visibility and guest follow-up. -->

## Story

As a **department manager**,
I want live open load, SLA distribution, breaches and staff workload for my Department,
So that I can move someone before the shift is lost rather than read about it tomorrow.

## Acceptance Criteria

**Given** my Department at my Property
**When** I open the dashboard
**Then** I see open load, SLA state distribution, breaches and per-Staff-Member workload, current within thirty seconds (FR-69, NFR-3).

**Given** the SLA distribution
**When** it renders
**Then** breached, breaching and within-target Jobs are distinguished, and the distinction survives greyscale (FR-69, UX-DR-1).

**Given** my role
**When** the dashboard loads
**Then** it is scoped to my Department unless my role spans more, and a request for another Department's data is refused server-side (FR-69, AD-11).

**Given** every SLA figure shown
**When** it is computed
**Then** it comes from the single SLA fold, not from a dashboard-specific query (AD-14).
