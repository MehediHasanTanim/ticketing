# Story 2.2: Connect a Property to Jazz Core and see its health

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **property administrator**,
I want to see my Property's Jazz Core connection state and last successful exchange per event type,
So that I can tell whether a missing room status is our problem or theirs without opening a support ticket.

## Acceptance Criteria

**Given** a configured Property
**When** I open the integration health surface
**Then** I see current health, the last successful exchange per event type, and whether a failure is JazzTicketing-side or Jazz Core-side (FR-49)
**And** no engineering access is required to read any of it.

**Given** a connection that becomes degraded or disconnected
**When** the state changes
**Then** the roles configured for integration alerts are notified, and health history is retained for troubleshooting (FR-49, NFR-8).

**Given** any health surface in either client
**When** a PMS or PBX vendor is involved upstream
**Then** no vendor identity is displayed, because JazzTicketing does not know it (FR-49).
