# Story 4.3: Work with no signal

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want to start, pause, complete and annotate work in a stairwell with no bars,
So that the dead spots in the building are not dead spots in the record.

## Acceptance Criteria

**Given** no connectivity
**When** I start, pause, complete or annotate a Job or a Room
**Then** the action applies locally and is written to the durable queue in the **same transaction** as the local state change, so I never see a completion the queue does not hold (FR-58, AD-7).

**Given** queued actions
**When** the app is killed or the device restarts
**Then** every queued action survives — this is a requirement, not a best effort (FR-58).

**Given** connectivity returns
**When** the queue drains
**Then** each action carries the timestamp of **when I did it**, not of the sync (FR-58, AD-2)
**And** the queue drains without the app in the foreground.

**Given** anything unsynced
**When** I look at the interface
**Then** what is queued and unsynced is visible to me, per item, not as a global spinner (FR-58).
