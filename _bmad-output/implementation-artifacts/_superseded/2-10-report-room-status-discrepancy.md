# Story 2.10: Report a Room Status discrepancy

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 2: Jazz Core connection and room truth. -->

## Story

As a **room attendant**,
I want to report that a room's real condition does not match what the system says, without changing occupancy myself,
So that a sleep or a skip reaches the front desk instead of being silently overwritten.

## Acceptance Criteria

**Given** a Room whose actual condition differs from the held status
**When** I report a discrepancy
**Then** I choose from a Property-configurable set covering at minimum occupied-shown-vacant (sleep), vacant-shown-occupied (skip) and bed-not-slept-in (FR-79)
**And** occupancy is not mutated by my report; it stays Jazz Core-authoritative (FR-51).

**Given** a filed discrepancy
**When** it is committed
**Then** it appears in the Front Office queue and in my supervisor's queue, and on both the Stay and the Room's history
**And** push delivery of it follows the routing rules Epic 5 configures once those exist; the queue appearance does not depend on them.

**Given** a discrepancy raised with no connectivity
**When** the device syncs
**Then** it carries the time it was **observed**, not the time it synced (FR-79, FR-58, AD-2).

**Given** a period and a Property
**When** occupancy discrepancies are reported on
**Then** a daily count is available, because a rising count is a front-desk process problem rather than a housekeeping one.
