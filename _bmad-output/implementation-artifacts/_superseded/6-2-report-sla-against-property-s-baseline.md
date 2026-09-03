# Story 6.2: Report SLA against this property's own baseline

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 6: Manager visibility and guest follow-up. -->

## Story

As a **general manager**,
I want compliance shown against what this property was doing before we arrived,
So that the number means improvement rather than comparison to a stranger.

## Acceptance Criteria

**Given** a Property with a captured pre-launch baseline
**When** I run SLA and response reporting
**Then** the baseline is shown alongside current figures for the same definitions (FR-71, OR-2).

**Given** a reporting request
**When** I choose its shape
**Then** I can report by Department, Catalog Entry, shift and period, with medians and percentiles available — not only means (FR-71).

**Given** Jobs that were paused
**When** figures are produced
**Then** paused time is separable from active time, and the treatment of paused time is the fold's, identical to the dashboard's (FR-71, FR-13, AD-14).

**Given** the same period requested from the dashboard and from this report
**When** both are produced
**Then** they return the same compliance figure — verified by a test that runs both paths over one fixture (AD-14, SM-2).
