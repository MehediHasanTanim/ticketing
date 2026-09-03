# Story 4.8: Leave nothing behind on a shared handset

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **property administrator**,
I want guest data gone from the device when a person signs out,
So that a handset left in a corridor is not a data-protection incident.

## Acceptance Criteria

**Given** a Staff Member signs out or is timed out
**When** the session ends
**Then** guest names and Stay context are not retained on device (FR-64, DG-1)
**And** queued actions belonging to that Staff Member are retained, because they are their work, not guest context (FR-4).

**Given** the local store
**When** it is at rest
**Then** it is encrypted, and the encryption is verified as part of the release (FR-64, NFR-7).

**Given** a remote sign-out issued for a device
**When** the device next contacts the server
**Then** the session is invalidated (FR-64).
