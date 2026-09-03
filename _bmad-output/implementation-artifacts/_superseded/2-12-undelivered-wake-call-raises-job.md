# Story 2.12: An undelivered wake-up call raises a Job

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

*Sequenced after Stories 3.1 and 3.2.*

As a **duty manager**,
I want a failed wake-up call to become work with a priority deadline,
So that the guest who was not woken is dealt with rather than discovered at checkout.

## Acceptance Criteria

**Given** wake-up calls reported by Jazz Core
**When** I open a Stay
**Then** scheduled wake-up calls are visible as scheduled items against that Stay (FR-55)
**And** scheduling remains a Jazz Core/PBX function — JazzTicketing offers no scheduling affordance.

**Given** a wake-up call Jazz Core reports as failed to deliver
**When** the failure is ingested
**Then** a Job is created on the configured Department with the Property's priority SLA Target (FR-55, FR-36).
