# Story 4.2: See my work ordered by urgency

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want my queue to tell me what to do next without opening anything,
So that I am working rather than navigating.

## Acceptance Criteria

**Given** my assigned and available Jobs
**When** I open the queue
**Then** they are ordered by SLA urgency with enough information on each row to act without opening it (FR-63).

**Given** a Job's SLA state
**When** I look at the queue at arm's length in low corridor light
**Then** the state is distinguishable without relying on colour and survives greyscale (FR-63, NFR-6, UX-DR-1).

**Given** the queue
**When** I accept, start or complete a Job from it
**Then** every one of those controls is reachable one-handed in the thumb zone on the baseline device, verified gloved and ungloved (FR-63, NFR-5, UX-DR-4).

**Given** a dispatch while I am online
**When** it is routed to me
**Then** the queue reflects it within five seconds (FR-63, NFR-3).

**Given** a countdown displayed while the device is offline
**When** it is computed
**Then** it comes from the single Dart port of the SLA fold, which passes the same fixture vectors as the server implementation (AD-14).
