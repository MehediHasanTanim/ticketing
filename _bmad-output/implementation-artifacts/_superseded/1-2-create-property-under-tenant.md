# Story 1.2: Create a Property under a Tenant

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **tenant administrator**,
I want to create a Property and choose its region,
So that the hotel has a scope for its rooms, staff and configuration before anyone starts work in it.

## Acceptance Criteria

**Given** I am a tenant administrator
**When** I create a Property with a name, timezone, currency and region
**Then** the Property exists in the chosen region's cell, inherits the Tenant defaults, and is marked as setup-incomplete until its required configuration is present
**And** the region is displayed as immutable from this point forward (DG-4, AD-4).

**Given** an existing Property
**When** anyone attempts to change its region through any interface
**Then** the change is refused, with residency named as the reason.

**Given** a Property with operational records
**When** a tenant administrator attempts to delete it
**Then** deletion is prevented and only deactivation is offered (FR-1)
**And** a deactivated Property's records remain readable to authorised users and stop accepting new Jobs.

**Given** a Property that is setup-incomplete
**When** a tenant administrator opens it
**Then** the outstanding configuration steps are listed in the order they must be completed.
