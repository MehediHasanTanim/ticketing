# Story 10.1: See the whole property at once

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 10: Full reporting and evidence. -->

## Story

As a **general manager**,
I want one view across departments,
So that I can run the morning meeting from the product rather than from five people's notes.

## Acceptance Criteria

**Given** my Property
**When** I open the operations dashboard
**Then** I see open Jobs, breaches, Rooms not ready against arrivals, OOO/OOS count and open Glitches across Departments (FR-70).

**Given** any figure on it
**When** I select it
**Then** it drills to the underlying records within my scope (FR-70).

**Given** the dashboard
**When** it renders
**Then** it names its own data freshness, and a stale Jazz Core-sourced figure names the last successful exchange (FR-70, UX-DR-5).

**Given** every SLA figure shown
**When** it is computed
**Then** it comes from the single SLA fold (AD-14).
