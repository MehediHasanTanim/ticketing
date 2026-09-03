# Story 8.7: Flag something that keeps breaking

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 8: Engineering, assets and preventive maintenance. -->

## Story

As a **chief engineer**,
I want an asset that keeps generating work to be flagged by rule,
So that replacement is argued with a count rather than an anecdote.

## Acceptance Criteria

**Given** the configurable threshold, defaulting to three Work Orders in ninety days
**When** an Asset or Location crosses it
**Then** it is flagged (FR-33).

**Given** a flagged Asset
**When** the chief engineer's and GM's views load
**Then** the flag appears on both (FR-33, FR-70).

**Given** a flag
**When** a configured review action is recorded
**Then** the flag clears — and it never clears silently or on a timer (FR-33).
