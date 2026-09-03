# Story 9.9: Match an enquiry to an item

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **front office user**,
I want to search the register while the guest is on the phone,
So that "we'll look into it" becomes an answer.

## Acceptance Criteria

**Given** a Property's twelve-month register
**When** I search by date range, Location and category
**Then** results return within two seconds (FR-48, NFR-3).

**Given** an enquiry I cannot match
**When** I record it
**Then** it is retained and re-checked against later item records for the configurable period (FR-48).

**Given** a matched enquiry
**When** I record the outcome
**Then** the outcome is stored and the item's custody state advances (FR-47, FR-48).
