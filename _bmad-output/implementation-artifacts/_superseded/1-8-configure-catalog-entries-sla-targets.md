# Story 1.8: Configure Catalog Entries and SLA Targets

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property administrator**,
I want to configure the vocabulary of work the property does and the time each kind is allowed to take,
So that a Request created later carries the right Department, deadline and required fields without engineering involvement.

## Acceptance Criteria

**Given** a Property
**When** I create a Catalog Entry
**Then** I can set its Department, SLA Target, default duration, acceptance window, required completion fields (which may include a photo) and whether guest follow-up is prompted (FR-5, FR-7, FR-11, FR-15)
**And** every value has a Tenant-level default and is Property-overridable.

**Given** a saved Catalog Entry or SLA Target
**When** it is written
**Then** it is stored as a versioned, effective-dated record and the version in force is recorded, so no configuration value is ever updated in place (AD-9).

**Given** a running SLA Clock on an existing Job
**When** I change the SLA Target or acceptance window of its Catalog Entry
**Then** the change applies to Jobs created after it and never retroactively alters that running clock (FR-5, AD-9)
**And** the Job keeps its bound configuration version for its whole life, including later escalation.

**Given** an incomplete Catalog Entry
**When** I attempt to save it without a Department or SLA Target
**Then** the save is refused with the missing field named.

**Given** any change I make here
**When** it is saved
**Then** it is attributed to me with a timestamp (FR-5, FR-6).
