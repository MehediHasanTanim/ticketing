# Story 2.3: Adapt the interface to a Property's Jazz Core capabilities

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **property administrator**,
I want features that depend on a capability my Jazz Core deployment does not offer to be absent rather than broken,
So that staff never tap something that cannot work.

## Acceptance Criteria

**Given** a Property whose Jazz Core deployment does not report call events
**When** an operator opens the dispatch surface
**Then** no guest-call-to-Request affordance is shown at all — not a disabled or failing one (FR-78).

**Given** a capability that is absent
**When** I open integration health
**Then** the missing capability is named, with the dependent JazzTicketing feature it disables and the reason (FR-49, FR-77).

**Given** a feature disabled by capability absence at a Property
**When** SLA and adoption reporting is produced for that Property
**Then** that feature is excluded from the figures rather than counted as a failure (FR-78, FR-74).
