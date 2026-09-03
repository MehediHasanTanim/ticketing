# Story 1.7: Configure Departments, Locations and Rooms

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property administrator**,
I want to define the property's Departments and its Location hierarchy,
So that work can be routed somewhere real and reported by area.

## Acceptance Criteria

**Given** a Property
**When** I create Departments and a Location hierarchy of floors, Rooms, public areas, outlets and back-of-house spaces
**Then** each is Property-scoped and available to every later routing and reporting choice (FR-5, FR-39)
**And** reporting can separate guest-facing from back-of-house Locations.

**Given** Locations and Rooms that Jazz Core is authoritative for
**When** the Jazz Core connection is configured (Story 2.5)
**Then** those records reconcile from Jazz Core rather than being maintained twice, and locally-created Locations outside Jazz Core's ownership are preserved.

**Given** any configuration change I make
**When** it is saved
**Then** it is attributed to me with a timestamp (FR-5, FR-6).
