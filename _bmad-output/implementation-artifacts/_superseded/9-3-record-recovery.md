# Story 9.3: Record a Recovery

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **duty manager**,
I want what we gave the guest recorded against the failure,
So that the cost of service recovery is a known number.

## Acceptance Criteria

**Given** a Glitch
**When** I record a Recovery with type, value and currency
**Then** types come from the Property-configurable list — comp, discount, points, upgrade, amenity, other (FR-42).

**Given** recorded value
**When** reporting runs
**Then** it is reportable by Department, category and period, in minor units with an ISO-4217 code and no conversion in v1 (FR-42, FR-73).

**Given** v1 scope
**When** a Recovery is recorded
**Then** nothing is posted to a PMS folio or any financial system (FR-42, PRD §5).
