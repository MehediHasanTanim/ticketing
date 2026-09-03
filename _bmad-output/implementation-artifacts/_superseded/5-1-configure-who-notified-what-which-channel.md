# Story 5.1: Configure who is notified, of what, on which channel

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 5: Escalation and notification routing. -->

## Story

As a **property administrator**,
I want to decide per Department and event type which roles are notified and how,
So that the right people hear about the right things at this property.

## Acceptance Criteria

**Given** a Department and an event type
**When** I configure notification routing
**Then** I select the roles notified and the channels used, from push and in-app, with email available for management-level events (FR-65).

**Given** SMS
**When** I open channel options
**Then** it is configurable but **off by default**, pending per-Property cost confirmation (FR-65).

**Given** a routing rule
**When** it is saved
**Then** it is Property-scoped with a Tenant default, versioned and effective-dated, and attributed to me (FR-65, AD-9, FR-6).

**Given** a Department with no routing configuration
**When** an event occurs
**Then** it routes to the Department default rather than to no one (FR-68).
