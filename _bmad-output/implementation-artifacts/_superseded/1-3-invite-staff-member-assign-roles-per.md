# Story 1.3: Invite a Staff Member and assign roles per Property

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **property or tenant administrator**,
I want to invite a person and give them roles at one or more Properties,
So that what they can see and act on is decided before they ever sign in.

## Acceptance Criteria

**Given** I am an administrator with scope over a Property
**When** I invite a person with a name, a language, an optional email and one or more Property/role pairs
**Then** the Staff Member is created with exactly those roles at exactly those Properties
**And** an invitation with an email address issues a credential set-up link, while one without creates a PIN-only account usable on a Shared Device.

**Given** the shipped role set
**When** I open the role picker
**Then** it offers at minimum line staff, supervisor, department manager, front office, duty manager, property administrator and corporate viewer (FR-2).

**Given** a Staff Member holding roles at two Properties in the same Tenant
**When** they switch Property context in either client
**Then** the switch completes without signing out, and their permissions are re-resolved for the new Property.

**Given** a Staff Member whose role does not permit an action
**When** the action is attempted through any interface, including a direct API call with a crafted payload
**Then** it is refused server-side, not merely hidden in the interface (FR-2, AD-11).

**Given** a corporate-scoped Staff Member
**When** they read any list, search, report, export or API response
**Then** only records from Properties within their own Tenant are returned (FR-1).
