# Story 3.1: Create a Request against a Location from a Catalog Entry

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 3: Guest request dispatch with a live clock. -->

## Story

As a **front office user**,
I want to log a guest request in under fifteen seconds by picking what it is and where,
So that I can do it while the guest is still on the phone.

## Acceptance Criteria

**Given** a configured Catalog and Location hierarchy
**When** I type a partial catalog term
**Then** matches return within 300ms and selecting one populates Department, SLA Target and default duration from that entry (FR-7, NFR-3).

**Given** a Request in progress
**When** I attempt to save it without a Location or without a Catalog Entry
**Then** the save is refused with the missing field named
**And** free-text notes and photos remain optional.

**Given** a saved Request
**When** it is committed
**Then** a `RequestLogged` event carries `tenant_id`, `property_id`, the bound configuration version and `occurred_at` (AD-3, AD-9, AD-2)
**And** the whole path from opening the form to a dispatched Request completes in under fifteen seconds for a practised user (FR-7).
