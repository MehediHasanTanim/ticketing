# Story 1.5: Connect a Tenant identity provider

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 1: Property go-live foundation. -->

## Story

As a **tenant administrator**,
I want to connect our existing identity provider,
So that corporate and management users authenticate through it rather than holding another password.

## Acceptance Criteria

**Given** I am a tenant administrator
**When** I configure a SAML 2.0 or OIDC connection for my Tenant
**Then** the connection applies to that Tenant only, never globally (FR-3)
**And** just-in-time provisioning is **off by default**, so a successful authentication grants no access until a role is assigned (FR-83).

**Given** a connected identity provider
**When** an identity is deprovisioned upstream
**Then** access is lost at next token validation, without a manual step in JazzTicketing.

**Given** a Staff Member holding only a PIN credential
**When** they sign in on a Shared Device
**Then** sign-in succeeds and configuration and reporting surfaces remain unavailable to that credential (FR-4).
