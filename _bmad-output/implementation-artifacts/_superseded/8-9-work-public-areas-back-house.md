# Story 8.9: Work public areas and back of house

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As an **engineer**,
I want jobs against a lobby or a plant room to behave like jobs against a room,
So that non-guest space is maintained on the record too.

## Acceptance Criteria

**Given** the Location hierarchy of floors, public areas, outlets and back-of-house spaces
**When** I raise a Work Order against a non-Room Location
**Then** it uses the same lifecycle, SLA behaviour and reporting as any other (FR-39, FR-30).

**Given** a reporting period
**When** figures are produced
**Then** guest-facing and back-of-house work can be separated (FR-39).
