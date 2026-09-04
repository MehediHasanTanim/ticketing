# 0003. One permission decision point, and capability on the credential

- **Status:** accepted
- **Date:** 2026-09-04
- **Story:** 1.3 (Invite a Staff Member and assign roles per Property)
- **Drivers:** AD-11, FR-2, FR-4, AC-3, AC-4

## Context

AD-11 says permission is a server decision and the interface only hides what the server
would refuse. Story 1.3 turns that from a principle into code, and it has to satisfy three
things at once that pull in different directions:

- a Staff Member holds **(Property, role) pairs**, so "what may they do" has no answer
  until you say *where*;
- a **context switch** must re-resolve permissions without signing out (AC-3), so any
  cached answer is a wrong answer waiting to be rendered;
- a **PIN** must never authorise configuration or reporting, whatever role its holder has
  (FR-4) - and the story is explicit that encoding this on the role instead of the
  credential is how "a PIN-holding administrator becomes a hole".

## Decision

**One function answers every permission question.** `resolvePermissions(grants,
credentialType)` in `core/src/staff/roles.ts` is pure and has no I/O. `edge/src/authorise.ts`
is its only caller, `GET /v1/auth/session` serves its output to the interface, and every
gated route reaches it through the same `gate()` helper in `edge/src/server.ts`. What the
console renders and what the server enforces are therefore the same array, not two
implementations that agree today.

**Grants are read per request, never cached.** The loader returns Tenant-wide grants plus
grants at the token's Property and nothing from any other Property, so switching Property
changes the answer by construction rather than by remembering to invalidate something.

**A permission declares a class; a credential type declares which classes it carries.**
`operational` / `configuration` / `reporting`, multiplied at resolution time. `pin` and
`badge` carry `operational` only. A permission added later is classified at the point of
declaration and gets the right PIN treatment for free, and a permission with no class is a
compile error because the table is exhaustively typed.

**A permission also declares a minimum scope.** `property.create` and `property.deactivate`
require a **Tenant-wide** grant: a property administrator responsible for one Property has
no business creating - or retiring - a Property elsewhere in the estate. Everything else is
conferred by a grant at either scope.

**Which roles may be held Tenant-wide is a domain rule, not a column.**
`property_administrator` (FR-1 creates one before any Property exists) and
`corporate_viewer` (AC-5 makes its authority the Tenant). Everything else must name a
Property, because a line staff role granted Tenant-wide is a privilege grant across every
Property that nobody asked for and no screen would show.

## Consequences

- **The refusals are testable without a database.** 24 unit tests cover the model, and the
  four negative controls that matter (29-32) break it deliberately and prove the suite goes
  red.
- **A crafted payload is refused per pair, not per request.** `verdictForPair` decides each
  (Property, role) pair, and mixing a permitted pair with a forbidden one refuses the whole
  request - a partially applied invitation is a Staff Member with roles nobody chose. A pair
  naming another Tenant's Property answers `not_found`, never `forbidden`, so the response
  cannot be used to discover that it exists.
- **The five operational roles hold identical permissions today.** The surfaces that
  distinguish a supervisor from a room attendant are Jobs (Epic 3) and Room Status (Epic 2).
  Inventing differences now would be designing those epics from inside this one.
- **An unmapped role confers nothing and says so.** Story 1.4 puts custom-role permissions
  in the database, where an unmapped key becomes normal; until then it is a seeding defect,
  and it is returned and logged rather than silently ignored. A permission model that fails
  quietly is one nobody finds out about until a shift cannot work.
- **The fixture stub holds every permission**, stated in the wire contract as
  `credentialType: 'fixture'`. It is already a total bypass for anyone with its secret, so
  withholding permissions would add no security while making the isolation gate pass for the
  wrong reason. Story 1.5 removes it.

## Alternatives considered

- **Send the permission set from the client and trust it.** This is the defect AD-11 names.
- **Store the effective permission set on the session row.** Fast, and wrong the moment a
  role changes or the Property context does - which is exactly the case AC-3 is about. It
  would also give "what may they do here" two sources of truth.
- **Put the PIN limit on the role** (a `pin_allowed` flag per permission-role pair). Refused
  by FR-4 in as many words, and it scales as roles x permissions rather than as classes.
- **A single boolean `restrictedCredential`.** Works until the second restricted credential
  type wants a slightly different limit, and then every check has to be revisited - which is
  the thing the class table exists to avoid.
