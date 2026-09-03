# Story 1.11: Read and export the audit trail

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property administrator**,
I want an immutable record of every state and configuration change,
So that I can answer "who changed this, and what was it before" without asking engineering.

## Acceptance Criteria

**Given** any state change on a Job, Glitch, Room Status, Lost & Found Item or configuration value
**When** it occurs
**Then** an audit entry records the actor, the timestamp and the previous value (FR-6)
**And** the entry is immutable — no interface, role or API can alter or remove it.

**Given** I am a property administrator or above
**When** I open the audit trail for my scope
**Then** I can read it, and a user below that level cannot.

**Given** a date range
**When** I request an export
**Then** a file is produced within my Property scope and the export itself is recorded in the audit trail with actor, scope and period.

**Given** a Tenant retention setting
**When** it is applied
**Then** audit retention stays within the bounds set by DG-2 and cannot be configured outside them.
