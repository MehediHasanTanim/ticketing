# Story 4.7: Be told about work without watching the screen

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want a push when work is dispatched to me,
So that I do not have to keep checking the handset.

## Acceptance Criteria

**Given** a Shared Device with me signed in
**When** a dispatch, escalation or reassignment relevant to my role and Property occurs
**Then** the push reaches **the signed-in Staff Member**, not the device's last user (FR-60, FR-4).

**Given** a Job already accepted by someone else
**When** notification would be delivered to other candidates
**Then** it is suppressed (FR-60, FR-67).

**Given** a push I missed — the device was off, or the notification was cleared
**When** I open the app
**Then** I can see in-app what I was notified about (FR-60).

**Given** the routing rules Epic 5 configures
**When** they exist
**Then** this client honours them without a second decision of its own; the domain decides what is sent and the adapter delivers it (AD-8).
