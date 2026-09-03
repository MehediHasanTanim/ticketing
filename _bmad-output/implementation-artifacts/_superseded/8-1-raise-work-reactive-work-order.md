# Story 8.1: Raise and work a reactive Work Order

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As an **engineer**,
I want to work a fault through the same lifecycle as any other job,
So that engineering is measured on the same terms as everyone else.

## Acceptance Criteria

**Given** a Location or an Asset
**When** I raise a Work Order against it
**Then** it uses the same lifecycle states, SLA behaviour and escalation as a Request, with no separate engine (FR-30, FR-10).

**Given** a Work Order origin
**When** it is created
**Then** it can come from a Fault (FR-22), from the console, or from a guest Request that is reclassified, and its origin is recorded and reportable (FR-30).

**Given** a guest Request reclassified as a Work Order
**When** the reclassification is committed
**Then** the SLA Clock, history and attachments are preserved (FR-9).
