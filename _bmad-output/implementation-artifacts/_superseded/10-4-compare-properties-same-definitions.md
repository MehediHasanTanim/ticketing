# Story 10.4: Compare properties on the same definitions

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 10: Full reporting and evidence. -->

## Story

As a **corporate user at a multi-Property Tenant**,
I want properties compared only where the comparison is real,
So that a ranking is not an artefact of different configuration.

## Acceptance Criteria

**Given** Tenant-level metric definitions
**When** I open the cross-Property view
**Then** comparison uses those definitions (FR-76).

**Given** a Property whose configuration diverges from the Tenant definitions
**When** it appears in the comparison
**Then** it is marked **not comparable** rather than silently normalised (FR-76).

**Given** any cross-Property view or export
**When** it renders
**Then** no guest-identifying data appears in it, enforced by the control plane holding no guest data (FR-76, AD-4, AD-10).

**Given** my corporate scope
**When** I request data
**Then** only Properties within my own Tenant are returned (FR-1).
