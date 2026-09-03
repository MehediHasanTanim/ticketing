# Story 1.9: Configure Pause Conditions, Credits, Escalation chains and Inspection checklists

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property administrator**,
I want to configure the reasons work legitimately stops, what a room is worth, who gets escalated to, and what "clean" means here,
So that the property's own operating rules govern the product rather than a vendor's defaults.

## Acceptance Criteria

**Given** the versioned, effective-dated configuration mechanism established in Story 1.8
**When** I configure Pause Conditions, Credit values by Room type and clean type, Escalation chains, or Inspection checklists
**Then** each is stored as a versioned, effective-dated Property-scoped record with a Tenant-level default, using that same mechanism and adding no second one (AD-9).

**Given** a Catalog Entry
**When** I attach Pause Conditions to it
**Then** only those attached Pause Conditions will be offered to a Staff Member pausing a Job of that type (FR-13, FR-5).

**Given** a Pause Condition
**When** I set its maximum paused duration
**Then** a Job exceeding it re-escalates rather than remaining parked, and the maximum is Property-configurable (FR-13).

**Given** an Inspection checklist
**When** I define its items
**Then** items may be scored or pass/fail, and the checklist is Property-scoped (FR-5, FR-24).

**Given** a running Job bound to an earlier version of any of these
**When** I change the current version
**Then** that Job continues under the version it was bound to, including for later escalation steps (AD-9).

**Given** any change I make here
**When** it is saved
**Then** it is attributed to me with a timestamp (FR-5, FR-6).
