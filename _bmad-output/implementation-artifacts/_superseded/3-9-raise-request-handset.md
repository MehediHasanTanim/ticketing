# Story 3.9: Raise a Request from the handset

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

*Sequenced after Stories 4.1 and 4.2 — the FR specifies the mobile surface.*

As a **room attendant**,
I want to raise a request from where I am standing,
So that a problem I find becomes work without a trip to the front desk.

## Acceptance Criteria

**Given** I am signed in on a handset
**When** I raise a Request against my current Location
**Then** it enters the same lifecycle as a front-office Request and is indistinguishable in behaviour (FR-17)
**And** its origin is recorded so staff-raised volume is separately reportable.

**Given** no connectivity
**When** I raise a Request
**Then** it queues durably and applies on reconnection with the time I raised it (FR-58, AD-7).
