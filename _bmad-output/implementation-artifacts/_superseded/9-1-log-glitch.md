# Story 9.1: Log a Glitch

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 9: Incidents, recovery and Lost & Found. -->

## Story

As a **duty manager**,
I want to record a service failure against the stay while it is fresh,
So that the pattern is visible before the guest review is.

## Acceptance Criteria

**Given** a Stay or a Location
**When** I log a Glitch with category, severity, responsible Department and description
**Then** it is recorded, with categories and severities Property-configurable against Tenant defaults (FR-40).

**Given** a Glitch
**When** no Recovery is given
**Then** it can be logged and closed without one (FR-40).

**Given** a Glitch against a Stay
**When** the Stay is opened
**Then** the Glitch is visible on that Stay's timeline (FR-40).

**Given** the follow-up outcomes marked glitch-pending by Story 6.4
**When** this story ships
**Then** each becomes a linked Glitch with its originating Request referenced, and the marker clears (FR-15, FR-40).
