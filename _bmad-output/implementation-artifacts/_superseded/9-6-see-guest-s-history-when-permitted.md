# Story 9.6: See a guest's history when it is permitted

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **front office user**,
I want to know this guest has been let down before,
So that the second failure is handled like a second failure.

## Acceptance Criteria

**Given** a Stay I open
**When** prior Glitches and Recoveries exist for that guest at this Property
**Then** they are shown to me (FR-45).

**Given** the Tenant-level cross-Property setting
**When** it is **off**, which is the default
**Then** no other Property's history is shown; when a tenant administrator turns it on, the change is recorded in the audit trail (FR-45, FR-83).

**Given** any of this history
**When** it is displayed, exported or logged
**Then** it respects DG-1, DG-2 and DG-3, and no guest-identifying data reaches a cross-Property view (FR-45, FR-76).
