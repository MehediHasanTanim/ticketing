# Story 4.1: Sign in on a Shared Device

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant**,
I want to sign in on the handset at the linen room with a PIN or badge in seconds,
So that starting a shift is not a login problem.

## Acceptance Criteria

**Given** a Property-issued handset at the sign-in screen
**When** I enter my PIN or present my badge
**Then** sign-in completes in under five seconds and my configured language is applied immediately (FR-4, FR-61).

**Given** a configured inactivity timeout
**When** it elapses
**Then** the device returns to the sign-in screen, and my queued offline actions survive the timeout and later sync under **my** identity (FR-4, AD-7).

**Given** I am signed in with a PIN only
**When** I attempt to reach a configuration or reporting surface
**Then** it is unavailable, and a direct request for it is refused server-side (FR-4, AD-11).

**Given** a second Staff Member signing in after me
**When** they use the same handset
**Then** my queued work is unaffected and remains attributed to me, because idempotency is keyed to the person and not the device (AD-7).
