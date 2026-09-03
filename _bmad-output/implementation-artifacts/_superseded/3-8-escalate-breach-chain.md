# Story 3.8: Escalate a breach up the chain

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **duty manager**,
I want a breached job to keep finding a more senior human until someone owns it,
So that a missed deadline surfaces while the shift can still recover.

## Acceptance Criteria

**Given** a Job that breaches its SLA Target
**When** the breach is derived
**Then** the next role in the Property's Escalation chain is notified and the chain continues at configured intervals until the Job is accepted or closed (FR-14).

**Given** each escalation step
**When** it fires
**Then** it is recorded on the Job with the role notified and the timestamp.

**Given** a Job that breached while the property was offline
**When** connectivity returns
**Then** it escalates on reconnection carrying the **true** breach timestamp, not the reconnection time (FR-14, AD-2).

**Given** an Escalation chain configured per Department
**When** a Job in that Department breaches
**Then** that Department's chain is the one used (FR-66).
