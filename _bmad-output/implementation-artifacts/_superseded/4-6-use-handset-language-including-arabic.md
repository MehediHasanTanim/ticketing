# Story 4.6: Use the handset in my own language, including Arabic

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant who reads Arabic**,
I want the whole interface in my language and laid out right-to-left,
So that the product is usable rather than translated.

## Acceptance Criteria

**Given** my Staff Member language attribute
**When** I sign in on a Shared Device
**Then** the interface applies that language for my session and reverts for the next person (FR-61, FR-4).

**Given** Arabic
**When** any screen renders
**Then** layout mirrors correctly — Job queues, SLA indicators, navigation — using logical direction only, with no left/right in layout (FR-61, AD-12, UX-DR-2).

**Given** mixed-direction content such as a Room number or a clock time inside a translated sentence
**When** it renders
**Then** identifiers and times use Western digits inside a bidi isolate with any adjacent separator **inside** the isolate, so a duration can never be misread as a different number (AD-12, UX-DR-2).

**Given** free-text content another Staff Member entered
**When** it is displayed
**Then** it is shown as entered with its language tag and never machine-translated (FR-61, AD-12).

**Given** the R1 locale set
**When** the release ships
**Then** English and Arabic are complete, and the remaining six locales are additive configuration rather than a layout change (FR-61).
