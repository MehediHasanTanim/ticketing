# Story 4.5: Attach a photo, on or offline

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want to photograph what I am reporting even with no signal,
So that the evidence goes with the job instead of being described later.

## Acceptance Criteria

**Given** a Job, Fault, Inspection, Glitch or Lost & Found Item
**When** I attach a photo from the device camera
**Then** it is compressed on device before upload and attached to that record (FR-62).

**Given** no connectivity
**When** I capture a photo
**Then** capture succeeds and the photo uploads with the queued action when connectivity returns.

**Given** a photo upload that fails
**When** the associated action has already been accepted
**Then** the failed photo never rolls back the action; the two upload independently (AD-7).

**Given** centrally configured attachment size and count limits
**When** I exceed them
**Then** the limit is enforced and stated to me before capture is wasted (FR-62).
