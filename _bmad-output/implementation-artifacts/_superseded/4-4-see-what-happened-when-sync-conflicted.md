# Story 4.4: See what happened when a sync conflicted

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want to be told when my queued action lost to someone else's change and what won,
So that I do not repeat work or believe a completion that was moved.

## Acceptance Criteria

**Given** a queued action that conflicts with a server-side change
**When** the queue drains
**Then** it resolves by the documented rule for that intent type — a supervisor's reassignment beats a queued start; a completion is never lost and lands on the reassigned Job (FR-59, AD-7).

**Given** a resolved conflict
**When** it is resolved
**Then** both the affected Staff Member and their supervisor can see that a conflict occurred and what won (FR-59).

**Given** the per-intent conflict rules
**When** CI runs
**Then** they are verified as a suite that gates the release, not as a per-story assertion (AD-7).

**Given** the same action synced twice after a retry
**When** the server receives it
**Then** it is idempotent on `(tenant_id, property_id, staff_member_id, client_key)` and creates no duplicate (AD-7).
