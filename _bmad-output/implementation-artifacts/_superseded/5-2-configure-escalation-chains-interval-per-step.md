# Story 5.2: Configure escalation chains with an interval per step

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 5: Escalation and notification routing. -->

## Story

As a **property administrator**,
I want ordered chains by role with my own intervals,
So that escalation matches how this property is actually staffed at night.

## Acceptance Criteria

**Given** a Department
**When** I define an Escalation chain
**Then** it is an ordered list of roles, each step carrying its own interval (FR-66).

**Given** one chain
**When** it is applied
**Then** it serves both non-acceptance (FR-11) and Breach (FR-14) with **separately configurable** intervals for each (FR-66).

**Given** a chain that reaches its final step
**When** the Job is still not accepted or closed
**Then** it holds at the final role and continues to remind, rather than stopping silently (FR-66).

**Given** a Job with a bound configuration version
**When** the chain is edited mid-life
**Then** that Job continues to use the version it was bound to, including for later escalation steps (AD-9).
