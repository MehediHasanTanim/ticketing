#!/usr/bin/env python3
"""Generate the E11 and E12 story files.

Same rule the original generator followed: the story statement and the acceptance
criteria are extracted VERBATIM from epics.md (status: final) and never retyped, so
the files cannot drift from the approved document. Everything else - tasks mapped to
AC numbers, prerequisites, scope guards, implementation notes, testing - is authored
per story, and one identical Standing constraints block is appended, lifted from an
existing story file rather than re-typed.
"""
import re, sys, pathlib

ROOT = pathlib.Path("_bmad-output")
EPICS = ROOT / "planning-artifacts" / "epics.md"
OUT = ROOT / "implementation-artifacts"
TEMPLATE = OUT / "1-3-invite-staff-member-assign-roles-per.md"

EPIC_TITLE = {
    "11": "Epic 11: The Jazzware operator surface",
    "12": "Epic 12: Account security — a second factor people choose",
}

# slug -> (story number, title)
FILES = {
    "11.1": "11-1-sign-jazzware-operator",
    "11.2": "11-2-manage-operator-accounts",
    "11.3": "11-3-account-what-operator-did",
    "12.1": "12-1-turn-second-factor-my-own-account",
    "12.2": "12-2-sign-second-factor",
    "12.3": "12-3-replace-factor-recover-lost-one",
    "12.4": "12-4-require-second-factor-across-my-tenant",
}

BODY = {}

BODY["11.1"] = dict(tasks="""- [ ] **T1. Operator credential in the control plane** (AC: 1, 2)
  - [ ] Operator identity stored in the control plane, never in a cell. No operator credential, table or endpoint exists in a regional cell (AD-4).
  - [ ] Session scoped to provisioning actions only: it grants **no read** of Tenant operational or guest data, and the refusal is server-side against a crafted payload, not interface-level (AD-11).
- [ ] **T2. The two surfaces cannot be confused for each other** (AC: 2, 3)
  - [ ] A cell endpoint presented with an operator credential refuses it.
  - [ ] The internal surface presented with any hotel-side identity refuses it, and reveals nothing about whether that identity exists.
- [ ] **T3. Deactivation bites at next validation** (AC: 4)
  - [ ] A deactivated operator loses access without a manual step, on FR-3's terms for a deprovisioned tenant identity.
- [ ] **T4. It does not look like the customer product** (AC: 5)
  - [ ] Different brand and an amber accent rather than petrol, per the UX spine's two-audiences rule.""",
notes="""**Prerequisites:** 1.0. **Prerequisite for 1.1** — whose first criterion assumes this
story's outcome, which is why E11 is R1 and why 1.1 waits for it (epics.md **Backlog order
vs epic number**).

**Scope guards.** Operator sign-in only. Tenant creation is 1.1. Operator account
management is 11.2. The operator audit trail is 11.3. The time-boxed support-access grant
is 1.1's criterion, not this story's.

**Implementation notes.**
- **The separation is the story.** FR-1's promise that "provisioning grants Jazzware no
  standing access" is only enforceable if an operator credential cannot address a cell at
  all. Give the two surfaces **different issuers and different audiences**, verified on
  every request, so a token from one is structurally unusable against the other — not
  merely unauthorised by a permission check somebody could later widen.
- The operator surface has its **own contract**, `contracts/control-plane-openapi.yaml`,
  generated and drift-gated like the cell's. Do not add operator paths to
  `contracts/openapi.yaml`; that document describes a cell.
- **Whether the control plane is a separate deployable is not settled here.** The
  architecture spine puts it outside the regional cells (AD-4) and Story 1.0 realised its
  data as a `control_plane` schema. If this story ends up serving the operator surface
  from the same process as a cell, say so plainly and raise it — an internal surface
  sharing a process with tenant-facing traffic is a decision, not an implementation
  detail.
- Operator MFA is FR-84/FR-85's mechanism reused, not a second one (E12, R2). Nothing
  here builds a factor; nothing here forbids one either.
- Never log an operator credential, and never place one in a URL or query string.

**Testing.** Operator token refused by **every** cell endpoint, added to the same suite
that proves cross-tenant isolation. Hotel-side token refused by the operator surface, with
identical responses for existing and non-existent identities. Deactivation honoured at
next validation with a fake clock. A test asserting no operator table or route exists in
the cell.""",
structure="""New: `contracts/control-plane-openapi.yaml` (its own schema of record) and the
control-plane surface's own module. `core` sees an authenticated operator as a value
object, never a credential.""",
refs="""- [Source: planning-artifacts/epics.md#Story 11.1]
- [Source: prd.md#FR-86], [#FR-1], [#FR-3] (deprovisioning terms)
- [Source: EXPERIENCE-WEB.md#Two audiences, two products] (W35, amber accent)
- [Source: ARCHITECTURE-SPINE.md#AD-4], [#AD-11]
- [Source: docs/decisions/0002] (why the operator is absent from the cell contract)""")

BODY["11.2"] = dict(tasks="""- [ ] **T1. Create and scope operator accounts** (AC: 1)
  - [ ] Created with provisioning scope only and no access to Tenant data; creation attributed to the acting operator administrator.
- [ ] **T2. The first account is a deployment fact, not a sign-up** (AC: 2)
  - [ ] First operator comes from the platform secret store as part of deployment, and its credential **must be changed on first use**.
  - [ ] There is **no self-service sign-up route at all** — absent, not hidden.
- [ ] **T3. Deactivate, never delete** (AC: 3)
  - [ ] Deactivation blocks sign-in, ends existing sessions at next validation, and retains the account for audit.
- [ ] **T4. Not reachable from the hotel side** (AC: 4)
  - [ ] Every read and write on the operator account list is refused server-side to any hotel-side role.""",
notes="""**Prerequisites:** 11.1.

**Scope guards.** Operator accounts only. Roles *inside* a Tenant are 1.3 and 1.4. Tenant
creation is 1.1. The audit trail these actions write to is 11.3.

**Implementation notes.**
- **The bootstrap is the part that goes wrong.** An operator surface with a self-service
  sign-up is a way to mint a Tenant-creating account from the internet. The first account
  must come from the secret store at deploy time and force a credential change on first
  use, and the sign-up route must not exist in the contract.
- Deactivation retains the row: an operator audit trail that references a deleted actor is
  an audit trail with holes in it (11.3, FR-6).
- Operator-administrator scope is a *distinct* scope from operator, or every operator can
  create more operators. Keep the capability on the account, matching how 1.3 keeps
  capability on the credential.

**Testing.** Bootstrap from an empty control plane, asserting the forced credential change.
Deactivated operator's live session refused at next validation (fake clock). Hotel-side
role refused on read and write. A test asserting no sign-up route exists.""",
structure="""Operator accounts live in the control plane alongside 11.1's identity, addressed
only by the control-plane contract.""",
refs="""- [Source: planning-artifacts/epics.md#Story 11.2]
- [Source: prd.md#FR-86], [#§7 NFR-7] (no shared administrative accounts, secrets)
- [Source: ARCHITECTURE-SPINE.md#AD-4], [#AD-11]""")

BODY["11.3"] = dict(tasks="""- [ ] **T1. An operator audit trail, separate from any Tenant's** (AC: 1)
  - [ ] Operator sign-ins, Tenant creations, operator-account changes and support-access requests recorded with actor, timestamp and what changed.
- [ ] **T2. No guest data, structurally** (AC: 2)
  - [ ] Asserted by test rather than by convention: the control plane holds no guest data (AD-4, AD-10).
- [ ] **T3. A support grant appears on both sides** (AC: 3)
  - [ ] Request, approval, use and expiry appear in the operator trail **and** in that Tenant's own audit trail, so the customer can see it without asking Jazzware.
- [ ] **T4. Append-only** (AC: 4)
  - [ ] Alteration and removal fail, on the same terms as the Tenant audit trail and `cell.events`.""",
notes="""**Prerequisites:** 11.1, 11.2. AC-3's Tenant-side entry is **owned by Story 1.1** — this
story writes the operator-side half and asserts both appear.

**Scope guards.** Recording and reading operator activity. Not the support-access grant's
policy or lifecycle (1.1). Not Tenant audit retention (1.11).

**Implementation notes.**
- **The dual write in AC-3 is the design decision to make explicitly.** One entry belongs
  to the control plane and one to a regional cell, which is a write across a boundary AD-4
  deliberately keeps separate. Decide it and write it down: one transaction is not
  available across two stores, so this is an outbox or a reconciliation with a proof that
  neither side can be missing. A grant visible only to Jazzware is exactly the failure FR-1
  exists to prevent.
- Append-only means privileges revoked for the writing role, as `cell.events` does — not
  an application-level rule that a later migration can quietly relax.
- Retention for operator entries is a Jazzware policy, not a Tenant setting. Do not read it
  from Tenant configuration.

**Testing.** Append-only proved by attempting UPDATE and DELETE as the application role.
A no-guest-data test over the whole control-plane schema, not just the audit table. A
support-grant test asserting the entry on both sides, including the failure case where the
cell write does not land.""",
structure="""Operator audit storage in the control plane; the Tenant-side entry goes through
Story 1.1's existing audit path rather than a second one.""",
refs="""- [Source: planning-artifacts/epics.md#Story 11.3]
- [Source: prd.md#FR-86], [#FR-1], [#FR-6], [#§11 DG-1]
- [Source: ARCHITECTURE-SPINE.md#AD-4], [#AD-10], [#AD-13]""")

BODY["12.1"] = dict(tasks="""- [ ] **T1. Off by default, and mine to turn on** (AC: 1)
  - [ ] MFA is off for every Staff Member until they enable it; only FR-85's Tenant requirement can compel enrolment.
- [ ] **T2. Two methods, three labels** (AC: 2)
  - [ ] A one-time code by **email**, and an **authenticator app** (TOTP, RFC 6238).
  - [ ] The app method is offered as both *Google Authenticator* and *Microsoft Authenticator*: they are the same TOTP secret, so a code from either is accepted. Record which the Staff Member picked as a support hint only — it must never affect verification.
- [ ] **T3. Verify before activating** (AC: 3)
  - [ ] The factor stays inactive until a code produced by it has been submitted and verified.
- [ ] **T4. Attribution without secrets** (AC: 4)
  - [ ] Enrolment and removal recorded with method and time, never the secret or a code.
- [ ] **T5. Choosing between two enrolled methods** (AC: 5)
  - [ ] With both enrolled the Staff Member chooses at sign-in, app offered first because it needs no mailbox.""",
notes="""**Prerequisites:** 1.3 (the password credential a factor attaches to). **R2.**

**Scope guards.** Enrolment and management of a Staff Member's own factors. The sign-in
challenge is 12.2. Recovery and administrator reset are 12.3. Tenant-wide enforcement is
12.4.

**A UX gap this story exposes — raise it, do not improvise it.** FR-84 requires a
**Settings** surface belonging to the individual, and `EXPERIENCE-WEB.md` (status: final)
has no per-user account surface among its 39 — the nearest, *Tenant settings*, is a tenant
administrator's. A new surface is needed and it is a change to raise in the UX spine, on
the same terms as an acceptance criterion that needs changing in epics.md.

**Implementation notes.**
- **Google Authenticator and Microsoft Authenticator are not two integrations.** Both
  consume an `otpauth://totp/...` secret. Implementing them as two methods would create two
  code paths that must agree forever, for no user-visible gain. One TOTP method, two labels,
  and an optional app hint kept for support conversations.
- The TOTP secret is a credential: encrypted at rest, never logged, never returned after
  enrolment, and never rendered anywhere but the enrolment QR and its manual-entry fallback.
- Verify-before-activate exists because the alternative locks people out of their own
  accounts with a mis-scanned QR, and the recovery path for that (12.3) costs an
  administrator's time every time.
- Accept a small clock skew window for TOTP, and reject a code already used inside its
  window, or a shoulder-surfed code stays valid for its remaining seconds.
- Email OTP delivery uses the same notification adapter as everything else (AD-8); no
  second mail path.

**Testing.** Enrolment not active until verified. A code from a second TOTP app accepted
against the same secret. Replay of a used TOTP code refused inside its window. Audit entry
contains method and time and **no** secret — asserted by scanning the entry, not by
reading the code. Greyscale and RTL render of the enrolment surface (Arabic ships in R1, so
an R2 surface inherits the requirement).""",
structure="""New: the Staff Member factor model beside 1.3's credential model, and a per-user
Settings surface in `clients/console` that the UX spine does not yet describe.""",
refs="""- [Source: planning-artifacts/epics.md#Story 12.1]
- [Source: prd.md#FR-84], [#FR-6], [#§7 NFR-7]
- [Source: EXPERIENCE-WEB.md] — **no per-user Settings surface exists; raise it**
- [Source: ARCHITECTURE-SPINE.md#AD-8] (one notification path), [#AD-12]""")

BODY["12.2"] = dict(tasks="""- [ ] **T1. A challenge, not a session** (AC: 1)
  - [ ] An accepted password yields a **challenge**; only a correct code completes it and returns a session (AD-11).
- [ ] **T2. Fail safely and say little** (AC: 2)
  - [ ] The challenge expires; too many wrong codes restart the sign-in; the response does not tell an unauthenticated caller whether the password or the code was wrong.
- [ ] **T3. Email codes are single-use and short-lived** (AC: 3)
  - [ ] Never logged; requesting another invalidates the previous one.
- [ ] **T4. The exempt paths stay exempt** (AC: 4)
  - [ ] An identity governed by a connected provider gets no second challenge from us; a PIN or badge on a Shared Device is untouched and still signs in under five seconds.""",
notes="""**Prerequisites:** 12.1. **R2.**

**Scope guards.** The sign-in challenge only. Enrolment is 12.1, recovery is 12.3,
enforcement is 12.4.

**Implementation notes.**
- **The challenge token is the thing to get right.** It is not a partial session and must
  not be usable as a bearer token anywhere: give it a distinct audience, a short lifetime,
  a single purpose and no scope, and add a test that presenting it to a normal endpoint is
  refused. A "half-authenticated" token that any handler accepts is an authentication
  bypass with extra steps.
- The person answering the challenge has already proved the password, so telling **them**
  precisely what is wrong is not enumeration. Keep that distinction: informative to the
  holder of a valid challenge, silent to everyone else.
- Rate-limit per account and per source, and reuse `too_many_attempts` from the error
  envelope rather than inventing a second shape.
- Do not extend this to Shared Devices "for consistency". FR-4's five-second budget on the
  baseline device and a corridor with gloves on is the reason the exemption exists.

**Testing.** Challenge token refused as a bearer token on every authenticated endpoint.
Expiry and wrong-code lockout with a fake clock. Email code single-use, and superseded by
a reissue. SSO identity receives no challenge. Shared-device sign-in latency unchanged.""",
structure="""Extends the sign-in path in `edge/` from 1.3; no client-side decision about
whether a factor is required — the server says so.""",
refs="""- [Source: planning-artifacts/epics.md#Story 12.2]
- [Source: prd.md#FR-84], [#FR-3], [#FR-4], [#§7 NFR-5], [#§7 NFR-7]
- [Source: ARCHITECTURE-SPINE.md#AD-11]""")

BODY["12.3"] = dict(tasks="""- [ ] **T1. Remove or replace, with the consequence stated** (AC: 1)
  - [ ] Immediate effect, attributed in the audit trail; removing a last factor while the Tenant requires MFA forces enrolment of another before continuing (FR-85).
- [ ] **T2. Recovery is issued, not self-served** (AC: 2)
  - [ ] An administrator with scope over the Staff Member can reset the factor, attributed to that administrator. **No self-service bypass of the factor exists.**
- [ ] **T3. A reset reveals nothing and ends everything** (AC: 3)
  - [ ] No code or secret is disclosed to the administrator, and the Staff Member's other sessions end so a session opened with the old factor cannot outlive it.""",
notes="""**Prerequisites:** 12.1, 12.2, and 1.3 for administrator scope. **R2.**

**Scope guards.** Losing and replacing a factor. Not password recovery (1.3's
`/auth/password/*`), and not Tenant enforcement (12.4).

**Implementation notes.**
- **"Reset" must mean re-enrol, not bypass.** The administrator clears the factor and the
  Staff Member enrols again; the administrator never obtains a working second factor for
  someone else's account, which would make every administrator a way around MFA.
- Ending other sessions matters because the threat model for a lost phone includes a
  session already open on it. This is the same revocation 4.8 needs, so use one mechanism.
- If the Tenant requires MFA (12.4), a Staff Member mid-reset is in the same state as an
  unenrolled one: prompted, inside the grace rules, refused after. Do not build a second
  state for it.
- An administrator resetting their **own** factor is not a special case; an administrator
  resetting the last enrolled tenant administrator's factor while enforcement is on is —
  12.4's guard covers switching enforcement on, and this story must not create a way
  around it.

**Testing.** Reset ends other sessions (assert an old token is refused). Administrator
never receives a secret or code — asserted on the response body and the audit entry.
Reset by an administrator without scope refused server-side. Last-factor removal under
enforcement forces re-enrolment.""",
structure="""Reuses the session-revocation path shared with 4.8 rather than adding one.""",
refs="""- [Source: planning-artifacts/epics.md#Story 12.3]
- [Source: prd.md#FR-84], [#FR-85], [#FR-64], [#FR-6]
- [Source: ARCHITECTURE-SPINE.md#AD-11]""")

BODY["12.4"] = dict(tasks="""- [ ] **T1. Per Tenant, on the surface that shows blast radius** (AC: 1)
  - [ ] The requirement applies to one Tenant, never globally, and sits with the Tenant defaults whose inheriting-Property count is displayed (FR-83).
- [ ] **T2. A Tenant cannot lock itself out** (AC: 2)
  - [ ] Refused server-side unless at least one tenant administrator has an enrolled factor.
- [ ] **T3. A grace period, then a server-side refusal** (AC: 3)
  - [ ] Unenrolled Staff Members are prompted and can enrol during the administrator-set grace period; afterwards password sign-in without a factor is refused server-side, not hidden (AD-11).
- [ ] **T4. The refusal explains itself to the right person** (AC: 4)
  - [ ] Informative to someone who has proved their password; silent to an unauthenticated caller.
- [ ] **T5. Attribution** (AC: 5)
  - [ ] Every change to the requirement or the grace period attributed with a timestamp.""",
notes="""**Prerequisites:** 12.1, 12.2, 1.5 or 1.6 for the Tenant settings surface. **R2.**

**Scope guards.** Tenant-wide enforcement. Individual enrolment is 12.1, the challenge is
12.2, recovery is 12.3. This story does not extend MFA to Shared Devices or to
provider-governed identities — see the epic's scope boundary.

**Implementation notes.**
- **The lockout guard in T2 is the criterion most likely to be skipped and most expensive
  to skip.** A Tenant that enables enforcement with no enrolled administrator has no way
  back in that does not involve Jazzware touching their data, which is exactly what FR-1
  promises not to happen. Enforce it server-side, not in the toggle's UI.
- The grace period is a Tenant setting, so it is **versioned and effective-dated** like
  every other one (AD-9), and a change to it does not retroactively refuse a session
  already granted.
- The refusal is post-password, which is what makes T4 safe: the caller has already proved
  they hold the credential, so naming enrolment as the missing piece tells them nothing
  they could not already infer. An unauthenticated caller gets the generic failure.
- Enforcement is evaluated **server-side on every sign-in**, never cached in the client, on
  the same reasoning as 1.3's permission re-resolution.

**Testing.** Enable refused with no enrolled administrator. Grace period boundary with a
fake clock, on both sides. Post-grace sign-in refused server-side via a direct API call
with a valid password. Unauthenticated caller receives the generic failure. Shared-device
and SSO sign-in unaffected while enforcement is on.""",
structure="""A Tenant setting on 1.5/1.6's surface, read by 12.2's sign-in path. No second
enforcement point.""",
refs="""- [Source: planning-artifacts/epics.md#Story 12.4]
- [Source: prd.md#FR-85], [#FR-83], [#FR-6], [#FR-1]
- [Source: ARCHITECTURE-SPINE.md#AD-9], [#AD-11]""")


def main() -> int:
    epics = EPICS.read_text()
    template = TEMPLATE.read_text()

    # the one identical Standing constraints block, lifted not retyped
    m = re.search(r"^## Standing constraints.*?(?=^## Dev Agent Record)", template, re.M | re.S)
    if not m:
        print("could not find the Standing constraints block in the template", file=sys.stderr)
        return 1
    standing = m.group(0).rstrip()

    written = []
    for num, slug in FILES.items():
        epic = num.split(".")[0]
        # verbatim extraction from epics.md
        pat = re.compile(
            r"^### Story " + re.escape(num) + r": (?P<title>.+?)\n"
            r"(?P<statement>.*?)"
            r"^\*\*Acceptance Criteria:\*\*\n"
            r"(?P<ac>.*?)"
            r"(?=^### Story |^## |^---\s*$)", re.M | re.S)
        mm = pat.search(epics)
        if not mm:
            print(f"could not extract Story {num} from epics.md", file=sys.stderr)
            return 1
        title = mm.group("title").strip()
        statement = mm.group("statement").strip()
        ac = mm.group("ac").strip()
        b = BODY[num]

        doc = f"""# Story {num}: {title}

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-04. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. {EPIC_TITLE[epic]}. -->

## Story

{statement}

## Acceptance Criteria

{ac}

## Tasks / Subtasks

{b['tasks']}

## Dev Notes

{b['notes']}

### Project Structure Notes

{b['structure']}

### References

{b['refs']}

{standing}

## Dev Agent Record

### Agent Model Used

_(to be filled by the dev agent)_

### Debug Log References

### Completion Notes List

### File List
"""
        path = OUT / f"{slug}.md"
        path.write_text(doc)
        written.append((num, path.name, len(doc.split())))

    for num, name, words in written:
        print(f"  {num:5} {name:44} {words:5} words")
    print(f"{len(written)} story files written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
