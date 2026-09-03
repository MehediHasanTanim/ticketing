# Story 1.4: Define and duplicate custom roles with guards

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **tenant administrator**,
I want to duplicate a shipped role and edit the copy,
So that the hotel's own job titles map onto permissions without me being able to create an incoherent or escalated role.

## Acceptance Criteria

**Given** a shipped role
**When** I open it
**Then** it is duplicable but not editable, so the shipped baseline stays intact for support (FR-81)
**And** the interface states before the copy is made that the duplicate is independent at creation and will not inherit later changes to its source.

**Given** I am editing a custom role and a permission declares a dependency
**When** I enable that permission while its dependency is disabled
**Then** the enable is refused and the interface names the specific dependency that must be enabled first.

**Given** I hold a set of permissions
**When** I attempt to grant a role any permission I do not myself hold
**Then** the attempt is refused server-side, not only disabled in the interface (FR-81, AD-11).

**Given** any role creation, duplication or permission change
**When** it is saved
**Then** the audit trail records the actor, the timestamp and the previous value (FR-6)
**And** the per-role Recovery approval threshold is settable here for later use by FR-43.
