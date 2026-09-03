# Story 1.1: Provision a Tenant

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **Jazzware operator**,
I want to create a Tenant and its first administrator on an internal surface,
So that a new customer can be onboarded without Jazzware holding standing access to their data.

## Acceptance Criteria

**Given** I am authenticated as a Jazzware operator on the internal provisioning surface
**When** I create a Tenant with a name and a first administrator email
**Then** the Tenant exists with the shipped role set and platform defaults seeded
**And** no Properties and no identity connection are created — those are the customer's to configure
**And** the first administrator receives an invitation that grants tenant-administrator scope only.

**Given** I am authenticated as any hotel-side role, including tenant administrator
**When** I attempt Tenant creation through any interface, including a direct API call
**Then** the attempt is refused server-side with a permission error (AD-11, FR-1)
**And** the product presents no link or affordance to the internal surface.

**Given** a provisioned Tenant
**When** a Jazzware support engineer needs access to its data
**Then** access must be separately requested and is time-boxed
**And** the grant, its scope and its expiry are recorded in that Tenant's own audit trail.

**Given** a Tenant with operational records
**When** an operator attempts to delete it
**Then** deletion is prevented and only deactivation is offered.
