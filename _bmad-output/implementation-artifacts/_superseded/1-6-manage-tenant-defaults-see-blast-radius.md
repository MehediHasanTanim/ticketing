# Story 1.6: Manage Tenant defaults and see their blast radius

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **tenant administrator**,
I want every Tenant-level default to tell me how many Properties currently inherit it,
So that I know what a change will affect before I make it.

## Acceptance Criteria

**Given** a Tenant-level default
**When** I view it
**Then** the count of Properties currently inheriting it is displayed as the stated blast radius of a change (FR-83)
**And** changing it applies to those inheriting Properties and to no others.

**Given** a Property that has overridden a default
**When** the Tenant-level value later changes
**Then** the Property does not silently re-inherit it
**And** the override is visible from both the Tenant surface and the Property surface.

**Given** cross-Tenant guest history (FR-45) and retention settings (DG-2, DG-3)
**When** I change any of them
**Then** they are settable only at Tenant level and every change is attributed in the audit trail with actor and previous value.

**Given** the Tenant settings surface
**When** I look for region
**Then** regions are shown as a read-only summary per Property and are not settable here (DG-4).
