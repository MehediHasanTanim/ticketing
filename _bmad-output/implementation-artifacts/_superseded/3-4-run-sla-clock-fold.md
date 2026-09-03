# Story 3.4: Run the SLA Clock from one fold

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **user who can see a Job**,
I want the remaining time to be the same number everywhere I look,
So that the handset and the console never disagree about whether a job is late.

## Acceptance Criteria

**Given** a Job with an SLA Target
**When** remaining time is displayed on any surface
**Then** it is derived by the single SLA fold over the Job's event sequence — elapsed, paused, remaining, breached — and never read from a stored countdown (FR-12, AD-1, AD-14).

**Given** the same Job open on mobile and on the console, both online
**When** both are observed
**Then** the displayed remaining time agrees within one second (FR-12)
**And** elapsed time is computed from server-side timestamps, never from a client clock (NFR-9).

**Given** a Property timezone
**When** any time is presented
**Then** it renders in the Property's local timezone while remaining UTC in storage (AD-2).

**Given** the fixture vectors in `contracts/`
**When** CI runs
**Then** the TypeScript fold and the Dart port both execute them and both runs gate the release (AD-14).
