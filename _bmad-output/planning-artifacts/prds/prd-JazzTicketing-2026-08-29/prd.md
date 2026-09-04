---
title: JazzTicketing
created: 2026-08-29
updated: 2026-09-04
status: final
---

<!-- AMENDMENT 2026-09-04, at Tanim's direction, after the auth contract exposed a gap.
     Added FR-84 (per-Staff-Member multi-factor authentication, off by default), FR-85
     (Tenant-wide MFA enforcement) and FR-86 (Jazzware operator authentication) to
     section 4.1, and placed FR-86 in R1 and FR-84/FR-85 in R2 in section 6.3. FR-86 is
     not new product scope so much as a requirement that was always implied: FR-1 has
     always needed a Jazzware operator to exist, and nothing said how one signs in.
     Everything else in this document is unchanged. -->

# PRD: JazzTicketing
*Working title — confirm.*

## 0. Document Purpose

This PRD is the contract between the product brief and the workflows downstream of it — UX (Sally), architecture (Winston), and epic/story breakdown. It is written for the Jazzware product and engineering group and for the management audience the brief is pitched to. It builds on `_bmad-output/planning-artifacts/briefs/brief-JazzTicketing-2026-08-29/brief.md` and its addendum; it does not restate them. Structure: a Glossary that fixes the vocabulary every later section and every downstream document must use verbatim, features grouped with globally numbered functional requirements nested under them, cross-cutting requirements in their own sections, and every inference tagged `[ASSUMPTION]` inline and indexed in §14. Where a decision belongs to architecture rather than product, it is named as a boundary and left open on purpose.

## 1. Vision

A hotel is a queue of promises with clocks on them. A guest asks for an iron, a shower backs up, a housekeeper finds a cracked mirror, a departing guest mentions at checkout that the room was never turned down. Each is work someone must own, finish, and be seen to have finished. Properties that run this well feel effortless to guests; properties that run it on radios and paper feel chaotic in ways guests describe in reviews without knowing why.

JazzTicketing gives a property one operational spine for that work. Requests, room status, work orders, and service failures enter one system, get an owner and a clock, and move to closure on the phone in a housekeeper's apron or the console at the front desk. Managers see load and breaches while a shift is still recoverable rather than in a report the next morning. Over time the property accumulates something it has never had: a per-room and per-asset history that shows which faults recur, which recoveries cost the most, and where the shift plan is consistently wrong.

The reason Jazzware is the one to build it is unglamorous and decisive. The hard part of this category is not the Job model; it is the property-side plumbing — telephony, PMS, room status, wake-ups, minibar posting — and Jazzware already owns and supports that layer through **Jazz Core**. JazzTicketing never touches a PMS or a PBX: it consumes Jazz Core over an API, and Jazz Core absorbs the heterogeneity of every property's estate. For an incumbent, entering a hotel is an integration project quoted in months and repeated per PMS. For us it is one integration, done once, against a system our own company operates. That does not make the product better on a feature grid; it makes it deployable inside an installed base that already trusts us — and it trades an external integration risk for an internal dependency, which is a better trade but not a free one.

## 2. Target User

### 2.1 Jobs To Be Done

- **Room attendant, engineer, runner** — "Tell me what to do next and let me finish it without calling the desk." Functional: receive, work, close. Emotional: not being blamed for work no one recorded.
- **Front desk agent / telephone operator** — "Log what the guest just told me in seconds, without leaving the call, and know it landed on someone."
- **Housekeeping supervisor** — "Know which rooms are ready, which are stuck, and which attendant is drowning, before the arrivals hit."
- **Executive Housekeeper / Chief Engineer / Duty Manager** — "See the clock on everything my department owns, and move people before something breaches."
- **General Manager / Director of Operations** — "Show me what keeps going wrong, what it cost us, and prove to the brand auditor and the owner that we run this properly."
- **Corporate / management company operations** — "Compare properties on the same operational definitions instead of on each GM's spreadsheet."
- **Property IT** — "Do not make me own another integration project, another server, or another set of credentials."

### 2.2 Non-Users (v1)

- **Guests.** No guest app, portal, or self-service surface in v1. Guests reach the hotel through the channels it already runs; JazzTicketing is what happens behind that.
- **F&B, spa, and activity operations** as workflow owners. They can receive a dispatched Job, but their own service workflows are out.
- **Finance and procurement.** Compensation is *logged*, not posted, approved, or reconciled.
- **Owners and asset managers** as direct users. They are served through the GM's exports.

### 2.3 Key User Journeys

- **UJ-1. Rosa clears her board without calling the desk once.**
  Rosa, a room attendant on a 22-credit board, speaks Tagalog as her first language and shares a house phone with the evening shift. She signs in on the shared device with her PIN; the app is already in Tagalog from her profile. Her board shows departures first, ordered by the arrivals Jazz Core reports are coming. She taps Room 1204, starts it, and finds a cracked bathroom mirror. She raises a Fault from inside the room card, photographs it, and keeps cleaning — the Work Order routes itself to Engineering without her leaving the room or finding a supervisor. She marks 1204 clean; the PMS shows it ready, via Jazz Core, before she reaches 1206. In the stairwell she loses signal, marks 1206 DND anyway, and the action syncs when she reaches the corridor. **Climax:** her board empties in the order the property actually needed the rooms. **Edge case:** if 1204 is inspected and rejected, it returns to her board flagged, with the supervisor's note and photo attached, ahead of her remaining rooms.

- **UJ-2. Arif logs a request in eleven seconds without leaving the call.**
  Arif, a telephone operator on evening shift, takes a call from Room 812. JazzTicketing has already opened a Request draft against 812 with the guest's name and stay context because Jazz Core reported the call. The guest wants an iron and a late checkout query passed to the front desk. Arif types "iron" into the Request catalog, picks the entry, and the department, SLA, and default duration populate; he adds a second Request for the front desk in the same panel. He says "It is on its way — about ten minutes." The floor runner's phone buzzes before Arif has hung up. **Climax:** the guest is told a number Arif did not have to guess, because the catalog knows this property's actual median. **Edge case:** if no runner accepts within the acceptance window, the Request escalates to the Duty Manager and Arif sees it turn red on his own open list.

- **UJ-3. Miguel finds out the AC unit has been fixed four times already.**
  Miguel, an engineer, accepts a hot/cold Job for Room 1518 on his phone. The Asset card for the fan-coil unit in 1518 shows four prior Work Orders in ninety days, each closed as "recharged". He recharges it again, but this time closes with root cause "recurring — suspect coil" and flags the Asset. **Climax:** the Chief Engineer's dashboard surfaces 1518 in the recurring-fault list that evening rather than after the fifth guest complaint. **Edge case:** if the room must come out of service, Miguel sets it Out of Order from the Job and the PMS stops selling it — through Jazz Core — without anyone calling the front desk.

- **UJ-4. Priyanka rebalances the floor at 10:40, not at handover.**
  Priyanka, Executive Housekeeper, watches the web console during the checkout window. Two attendants on floors 9-11 are running twenty minutes behind median while floor 6 is clear, and fourteen arrivals are due before 15:00. She reassigns six rooms from the board of the attendant who is behind; the rooms appear on the receiving attendant's phone immediately, with a note. **Climax:** the property makes its arrival deadline without the front desk ever knowing there was a problem. **Edge case:** if an attendant has already started a room she reassigns, the app asks her to confirm the handover and preserves the started state and any Faults raised.

- **UJ-5. Daniel turns a complaint at checkout into a logged recovery.**
  Daniel, Duty Manager, meets a guest at checkout who is angry that the AC was never fixed. He opens the guest's stay in the console and sees the actual history: the Request logged at 22:10, dispatched at 22:14, closed at 23:40 with no follow-up. He logs a Glitch against the stay, category "engineering — guest impact", records the recovery he is authorizing, and links it to the Requests and Work Orders that caused it. **Climax:** the guest leaves with something done, and the cost, cause, and department are on the record instead of in Daniel's memory. **Edge case:** if the recovery exceeds his authorization threshold, the Glitch routes to the GM for approval and Daniel sees the decision on his own queue.

- **UJ-6. Nadia walks into the owner's review with numbers.**
  Nadia, the GM, opens the operations dashboard the morning of a quarterly review. She sees SLA compliance by department against the property's own pre-launch baseline, the ten Assets with the most repeat Work Orders, Glitch cost by category and department, and the response-time curve since go-live. She exports the brand-standard evidence pack for the audit next month. **Climax:** the argument in the room is about what to fix, not about whether the numbers are real. **Edge case:** when a department's data is thin because staff are not using mobile, the dashboard says so rather than reporting a flattering number.

## 3. Glossary

Downstream workflows and readers use these terms exactly. No synonyms anywhere in this document or its descendants.

- **Tenant** — a commercial customer: a hotel brand, management company, or independent property group. Owns one or more Properties. Data never crosses Tenants.
- **Property** — one hotel. The unit of configuration, reporting, and data isolation. Belongs to exactly one Tenant.
- **Department** — an operational unit within a Property (Housekeeping, Engineering, Front Office, F&B, Security). Owns Jobs and has its own SLA configuration.
- **Location** — an addressable place in a Property: a Room, a public area, a back-of-house space, or an outlet. Rooms carry a Room Number that matches the PMS.
- **Room** — a Location that can be sold. Carries Room Status and may carry an Out-of-Order or Out-of-Service state.
- **Room Status** — the current condition of a Room along two axes: occupancy (vacant / occupied) and cleanliness (dirty / clean / inspected). Synchronized with the PMS.
- **Out of Order (OOO)** — a Room withdrawn from sale for a duration, deducted from sellable inventory. **Out of Service (OOS)** — a Room withdrawn from sale but still counted as inventory. Both originate from Engineering and are written back to the PMS.
- **Stay** — a guest's occupancy of a Room between check-in and check-out, as the PMS defines it and Jazz Core reports it. Requests, Glitches, and Recoveries attach to a Stay.
- **Request** — a unit of service work originating from or on behalf of a guest. Has a Requester, a Location, a Catalog Entry, an SLA Target, and a lifecycle.
- **Work Order** — a unit of maintenance work against a Location or Asset. Either *reactive* (raised from a Fault) or *preventive* (generated from a PM Schedule).
- **Job** — the umbrella term for a Request or a Work Order once it is assignable. Everything dispatched to a staff member is a Job. Housekeeping room cleaning appears as a Job only when dispatched individually; routine board work is a Room Assignment.
- **Fault** — a reported defect at a Location or on an Asset. A Fault raises a reactive Work Order.
- **Asset** — a maintainable item with an identity and a Location (fan-coil unit, lift, boiler, minibar fridge). Accumulates Work Order history.
- **PM Schedule** — a rule that generates preventive Work Orders for an Asset or Asset class on a calendar, runtime, or occupancy trigger.
- **Catalog Entry** — a configured request type (e.g. "extra towels", "hot/cold") carrying default Department, SLA Target, default duration, and required fields.
- **SLA Target** — the elapsed time in which a Job of a given Catalog Entry must reach a given lifecycle state at a given Property. Distinct targets for acceptance and completion.
- **SLA Clock** — the running measurement of elapsed time against an SLA Target, including any Pause Conditions.
- **Pause Condition** — a configured circumstance that suspends an SLA Clock (guest DND, guest not in room, awaiting parts, awaiting guest availability).
- **Breach** — an SLA Clock passing its SLA Target.
- **Escalation** — the configured routing of a Breach or an unaccepted Job up a named chain of roles.
- **Room Assignment** — the allocation of a set of Rooms to a Room Attendant for a shift, measured in Credits.
- **Credit** — a Property-configured unit of housekeeping workload; a Room consumes a number of Credits by type (departure, stayover, turndown).
- **Inspection** — a supervisor's scored check of a cleaned Room, resulting in pass or rejection.
- **Glitch** — a recorded service failure affecting a Stay, with category, severity, responsible Department, and root cause.
- **Recovery** — the compensation or remedial action taken in response to a Glitch, with a value and an approver.
- **Lost & Found Item** — an item recorded as found at a Location, with chain of custody from found to returned or disposed.
- **Jazz Core** — the existing Jazzware platform that owns each Property's PMS and PBX integration. JazzTicketing's single upstream system; it consumes Jazz Core over the Jazz Core API and holds no PMS or PBX connection of its own.
- **Jazz Core API** — the contract between JazzTicketing and Jazz Core: the events JazzTicketing subscribes to (Room Status, Stay, guest call, wake-up, phone posting) and the operations it invokes (OOO/OOS write-back, master-data read).
- **Staff Member** — a person with a role at one or more Properties within one Tenant.
- **Shared Device** — a Property-owned handset used by successive Staff Members across shifts.

## 4. Features

### 4.1 Tenancy, Identity, and Property Configuration

**Description:** The multi-tenant foundation every other feature stands on. A Tenant contains Properties; a Property contains Departments, Locations, Staff Members, and its own configuration of Catalog Entries, SLA Targets, Escalation chains, and Credits. Corporate users at a management-company Tenant see across their Properties; a Property user sees only their own. Line staff sign in on Shared Devices with a short credential, corporate users through the identity provider the Tenant already uses. Realizes UJ-1, UJ-4, UJ-6.

**Functional Requirements:**

#### FR-1: Tenant and Property hierarchy
A **Jazzware operator** can create a Tenant and its first administrator; a **tenant administrator** can create Properties under that Tenant. Every record in the system resolves to exactly one Property.

**Consequences (testable):**
- The two actors are separated in implementation as well as in interface: **no hotel-side role, including tenant administrator, can create a Tenant.** Tenant creation is a Jazzware-internal function on a surface the product does not link to (UX `EXPERIENCE-WEB.md.Two audiences, two products`).
- Creating a Tenant seeds the shipped role set and platform defaults, and creates no Properties and no identity connection — those are the customer's to configure.
- Provisioning grants Jazzware no standing access to tenant data. Support access is separately requested, time-boxed, and recorded in the tenant's own audit trail.
- A user scoped to Property A receives no record belonging to Property B through any interface, including search, reports, exports, and API responses.
- A corporate-scoped user receives records only from Properties within their own Tenant.
- Deleting a Property is prevented while operational records exist; it can only be deactivated. The same applies to a Tenant.

`[NOTE FOR PM]` The original wording — "an administrator can create a Tenant and Properties under it" — conflated the vendor and the customer. Surfaced by UX review on 2026-09-02. Left unsplit, it would have put commercial provisioning inside the hotel application.

#### FR-2: Role-based access
An administrator can assign Staff Members roles per Property that determine which Jobs they see, which they can act on, and which configuration they can change.

**Consequences (testable):**
- The shipped role set covers at minimum: line staff, supervisor, department manager, front office, duty manager, property administrator, corporate viewer.
- A Staff Member with roles at multiple Properties within a Tenant can switch Property context without signing out.
- Every permission-denied action is refused server-side, not only hidden in the interface.

#### FR-3: Corporate SSO
A Tenant administrator can connect an external identity provider so corporate and management users authenticate through it.
**Consequences (testable):** SAML 2.0 or OIDC is supported; a deprovisioned identity loses access at next token validation; SSO is configurable per Tenant, not global.

#### FR-4: Shared Device sign-in
A Staff Member can sign in on a Shared Device with a short credential (PIN or badge) and sign out or be timed out without affecting other Staff Members' queued work.

**Consequences (testable):**
- Sign-in completes in under five seconds on a Property-issued handset.
- A configurable inactivity timeout returns the device to the sign-in screen; queued offline actions belonging to the signed-out Staff Member survive the timeout and sync under that Staff Member's identity.
- A PIN alone never grants access to configuration or reporting surfaces.

#### FR-5: Property configuration
A property administrator can configure Departments, Locations and Rooms, Catalog Entries, SLA Targets, Pause Conditions, Escalation chains, Credit values, and Inspection checklists for their Property without engineering involvement.
**Consequences (testable):** Every configurable value is Property-scoped with a Tenant-level default; changes take effect for Jobs created after the change and never retroactively alter a running SLA Clock; every change is attributed to a Staff Member with a timestamp.

#### FR-6: Audit trail
The system records every state change on a Job, Glitch, Room Status, Lost & Found Item, and configuration value with actor, timestamp, and previous value.
**Consequences (testable):** Audit entries are immutable and readable by property administrators and above; retention is configurable per Tenant within the bounds set in §11; an audit export for a date range is available to a property administrator.

#### FR-84: Multi-factor authentication, per Staff Member
A Staff Member who signs in with a password can enable a second factor for their own account from Settings, choosing from more than one method.

**Consequences (testable):**
- **Off by default.** No Staff Member is required to enrol by this requirement alone; enrolment is the individual's own action, and FR-85 is the only thing that can compel it.
- The offered methods are a **one-time code by email** and an **authenticator app** (TOTP, RFC 6238) — the console presents the authenticator option as both *Google Authenticator* and *Microsoft Authenticator* because those are the apps staff have, and both consume the same enrolment secret. A Staff Member may hold both an email method and an app method, and chooses which to use at sign-in.
- Enrolment is not complete until a code produced by the new method has been verified, so a mis-scanned QR code cannot lock a Staff Member out of their own account.
- Disabling a factor, and every enrolment, is attributed in the audit trail (FR-6) with the method and the time, and never with the secret.
- MFA applies to the **password credential only.** An identity governed by a connected identity provider authenticates under that provider's own policy (FR-3) — JazzTicketing does not add a second challenge on top of it — and a **PIN or badge on a Shared Device is out of scope**, because a second factor cannot be reconciled with a five-second sign-in on a shared handset in a corridor (FR-4, NFR-5). The credential-scope rule in FR-4 remains the control that applies there.
- A Staff Member who has lost their second factor recovers through an administrator-issued reset that is attributed in the audit trail, never by self-service bypass of the factor itself.

`[NOTE FOR PM]` Added 2026-09-04 at Tanim's direction. The PRD previously specified no second factor anywhere, and NFR-7's "no shared administrative accounts" was the only adjacent control.

#### FR-85: Tenant-wide multi-factor enforcement
A tenant administrator can require multi-factor authentication for password sign-in across their Tenant.

**Consequences (testable):**
- The setting is **per Tenant, never global** (as FR-3 is), and lives with the other Tenant-level settings whose blast radius is displayed (FR-83).
- Turning it on does not lock out the people already signed in: an unenrolled Staff Member is prompted to enrol at their next sign-in and can complete enrolment during a **grace period the tenant administrator sets**, after which password sign-in without an enrolled factor is refused server-side (AD-11).
- The refusal is distinguishable from a wrong password **to the person signing in**, who needs to know that enrolment is what is missing, while telling an unauthenticated caller nothing about whether the account exists.
- Enforcement cannot strand a Tenant: at least one enrolled tenant administrator is required before enforcement can be switched on, and the check is server-side.
- It applies to the password credential only, for the reasons in FR-84, and it therefore does not affect Shared Device sign-in or an identity provider's own policy.
- Switching it on or off, and any change to the grace period, is attributed in the audit trail (FR-6).

`[NOTE FOR PM]` Added 2026-09-04 at Tanim's direction, chosen over per-user opt-in alone: brand security questionnaires ask for it, and retrofitting enforcement after clients exist is more expensive than the setting.

#### FR-86: Jazzware operator authentication
A Jazzware operator authenticates to the internal provisioning surface separately from every hotel-side identity, and that authentication grants no access to tenant data.

**Consequences (testable):**
- Operator identity lives in the **control plane, not in a regional cell** (AD-4). No operator credential exists in any cell, and no cell endpoint authenticates an operator — the two are separate surfaces with separate contracts, which is what makes FR-1's "provisioning grants Jazzware no standing access" enforceable rather than a promise.
- Signing in as an operator yields a session scoped to provisioning actions only. It confers **no read** of any Tenant's operational or guest data; reaching that data requires the separately requested, time-boxed grant of FR-1, which appears in the customer's own audit trail.
- The operator surface is reachable by no hotel-side role, and the product presents no link to it (FR-1, UX `EXPERIENCE-WEB.md.Two audiences, two products`).
- Operator MFA follows FR-84 and FR-85 as for any other password user: off by default, enabled by the operator, and available to be **required across the operator organisation** by the same enforcement setting. Jazzware's own security policy, not this requirement, decides whether to switch it on.
- Every operator action, and every operator sign-in, is recorded in an operator audit trail that is not a Tenant's own (FR-6 governs the Tenant's; this is its counterpart), and no entry carries guest data (AD-4, AD-10).
- Deactivating an operator ends their sessions at next token validation, on the same terms FR-3 sets for a deprovisioned tenant identity.

`[NOTE FOR PM]` Added 2026-09-04. FR-1 has always required a Jazzware operator to exist, and Story 1.1's first acceptance criterion opened with "Given I am authenticated as a Jazzware operator" — a precondition **no requirement stated and no story built**, which would have left the documented provisioning path unbuildable. Found while designing the auth contract.

### 4.2 Guest Request Dispatch

**Description:** The spine of the platform. A Request enters from a telephone operator, a front desk agent, a staff member, or a guest phone call surfaced by Jazz Core, is matched to a Catalog Entry that supplies its Department and SLA Target, and is routed to a Staff Member who accepts, works, and closes it. An SLA Clock runs from creation, pauses on configured conditions, and escalates on Breach. Realizes UJ-2, UJ-5.

**Functional Requirements:**

#### FR-7: Create a Request
A front office or staff user can create a Request against a Location in under fifteen seconds by selecting a Catalog Entry, with Department, SLA Target, and default duration populated from that entry. Realizes UJ-2.
**Consequences (testable):** Catalog search returns matches on partial input within 300ms; a Request cannot be saved without a Location and a Catalog Entry; free-text notes and photos are optional on every Request.

#### FR-8: Guest and Stay context on a Request
A Request created against an occupied Room carries the current Stay's guest name, VIP or loyalty flag, and departure date as reported by Jazz Core.
**Consequences (testable):** Context is read at creation and re-read on display; when Jazz Core is unreachable the Request is still creatable and shows context as unavailable rather than blocking or showing stale data without a marker.

#### FR-9: Routing and assignment
The system routes a new Request to candidate Staff Members by Department, role, and current open Job load, and a supervisor can override the assignment at any point in the lifecycle.
**Consequences (testable):** [ASSUMPTION] v1 routing is rule-based on Department + role + open-load, not skill-graph or predictive; an unassigned Request appears in the Department queue where any eligible Staff Member can accept it; reassignment preserves the SLA Clock, history, and attachments.

#### FR-10: Request lifecycle
A Request moves through logged → dispatched → accepted → in progress → completed → closed, and every transition records actor and timestamp. Realizes UJ-2.
**Consequences (testable):** Illegal transitions are refused; a Request can be cancelled from any state before completed, with a required reason; completion requires the Catalog Entry's configured required fields (which may include a photo).

#### FR-11: Acceptance window
A dispatched Request that is not accepted within the Property's configured acceptance window escalates without human intervention. Realizes UJ-2.
**Consequences (testable):** The acceptance window is configurable per Catalog Entry with a Department default; escalation on non-acceptance is distinguishable in reporting from escalation on completion Breach.

#### FR-12: SLA Clock
The system runs an SLA Clock against each Job's SLA Target from creation, and displays remaining time to every user who can see the Job.
**Consequences (testable):** Elapsed time is computed server-side from timestamps, never from client clocks; the displayed remaining time on mobile and web agree within one second when both are online; time is presented in the Property's local timezone.

#### FR-13: Pause Conditions
A Staff Member can pause an SLA Clock by selecting a configured Pause Condition, and the paused interval is excluded from SLA measurement but retained in history.
**Consequences (testable):** Only Pause Conditions configured for that Catalog Entry are offered; a pause requires a reason from the configured list; total paused duration is visible on the Job and reportable; a Job cannot remain paused beyond a configurable maximum without re-escalating.

#### FR-14: Breach and Escalation
On Breach, the system notifies the next role in the Property's Escalation chain and continues up the chain at configured intervals until the Job is accepted or closed. Realizes UJ-2.
**Consequences (testable):** Escalation chains are configurable per Department; each escalation step is recorded on the Job; a Job that breaches while the property is offline escalates on reconnection with the true breach timestamp.

#### FR-15: Guest follow-up
A front office user is prompted to follow up with the guest after a Request is completed, and can record the outcome, including guest dissatisfaction that converts the Request into a Glitch.
**Consequences (testable):** Follow-up is performed by front office staff through the Property's existing guest channel (typically a call to the Room) — JazzTicketing prompts and records it but does not contact the guest, per §5; follow-up prompting is configurable per Catalog Entry; recorded dissatisfaction creates a linked Glitch under FR-40 with the Request referenced; follow-up outcomes are reportable.

#### FR-16: Repeat-request detection
The system flags a new Request as a repeat when the same Location and Catalog Entry produced a Request within a configurable window on the same Stay. Realizes UJ-5.
**Consequences (testable):** The flag is visible at creation to the front office user and on the dispatched Job; repeat Requests are counted separately in reporting; the window is Property-configurable.

#### FR-17: Staff-raised Requests
Any Staff Member can raise a Request from mobile against their current Location without front-office involvement. Realizes UJ-1.
**Consequences (testable):** A staff-raised Request is indistinguishable in lifecycle from a front-office Request and carries its origin for reporting.

#### FR-18: Open Request views
Front office and department managers can see all open Requests for their scope, filtered by Department, status, SLA state, and Location, sorted by urgency.
**Consequences (testable):** The view updates without a manual refresh within five seconds of a state change; breaching and breached Jobs are visually distinct; the view is exportable.

### 4.3 Housekeeping Operations

**Description:** Room Status as the shared truth between JazzTicketing and the PMS via Jazz Core, boards built from it, and the attendant's day on mobile. Supervisors inspect, reassign, and see the floor. Turndown runs as a second pass with its own Credits. Realizes UJ-1, UJ-4.

**Functional Requirements:**

#### FR-19: Room Status model
The system maintains Room Status for every Room on the occupancy and cleanliness axes, plus OOO and OOS states, and reflects PMS-originated changes without manual entry.
**Consequences (testable):** Status changes from either side reconcile per FR-50; conflicting simultaneous changes resolve by the rule defined in FR-51 and are logged; OOO and OOS are mutually exclusive.

#### FR-20: Room Assignment (board)
A supervisor can generate and adjust Room Assignments for a shift, balanced by Credits, with departures prioritized by the arrivals the PMS reports. Realizes UJ-1, UJ-4.
**Consequences (testable):** Generation completes for a 400-Room Property in under ten seconds; Credit values by Room type and clean type are Property-configurable; an unassigned Room is visible as unassigned rather than silently dropped.

#### FR-21: Attendant room flow
A Room Attendant can start, pause, and complete a Room from mobile, record DND or refuse-service without completing it, and set the Room's cleanliness directly without running a clean. Realizes UJ-1.
**Consequences (testable):** Start and complete timestamps are recorded per Room per attendant; DND and refuse-service set a configured re-attempt reminder; a Room cannot be marked clean *through the clean flow* without being started, while a direct cleanliness change from Set status is permitted, attributed, and distinguishable in reporting from a completed clean; the Inspected state is not settable by an attendant; a supervisor override of either is logged.

#### FR-22: Raise a Fault from a Room
A Room Attendant can raise a Fault from inside the Room card with a photo and short description, generating a reactive Work Order without leaving housekeeping flow. Realizes UJ-1.
**Consequences (testable):** The Work Order carries the Room, the photo, and the reporting Staff Member; the attendant's Room flow is not blocked by the Work Order's lifecycle.

#### FR-23: Board reassignment
A supervisor can move Rooms between Room Assignments during a shift, and affected attendants see the change on their device within seconds. Realizes UJ-4.
**Consequences (testable):** Reassigning a started Room requires confirmation and preserves start time, notes, and any raised Faults; the receiving attendant sees the originating attendant's note; Credits recalculate for both attendants.

#### FR-24: Inspection
A supervisor can inspect a completed Room against the Property's Inspection checklist and pass or reject it, with rejection returning the Room to the attendant's board flagged with notes and photos. Realizes UJ-1.
**Consequences (testable):** Checklists are Property-configurable with scored or pass/fail items; a rejected Room re-enters the originating attendant's board ahead of unstarted Rooms; inspection outcomes are reportable by attendant and by supervisor.

#### FR-25: Turndown
A supervisor can generate a turndown pass as a separate Room Assignment with its own Credits and time window.
**Consequences (testable):** Turndown assignments do not overwrite the day's cleaning record; a Room can carry both a completed clean and a completed turndown on the same date.

#### FR-26: Linen, amenity, and supply requests
A Room Attendant can request linen, amenities, or supplies from mobile, creating a Job routed to the configured Department.
**Consequences (testable):** These are Catalog Entries and follow the Request lifecycle in §4.2; the attendant can continue working while the Job is open.

#### FR-27: Housekeeping floor view
A supervisor or Executive Housekeeper can see live Room Status across floors with attendant progress against median duration. Realizes UJ-4.
**Consequences (testable):** The view distinguishes not started, in progress, DND, refused, clean awaiting inspection, and inspected; an attendant is flagged as behind when elapsed time on a started Room exceeds the Property's rolling median for that Room type and clean type by a configurable percentage (default 25%), with the flag computed server-side and the visual treatment left to UX; the view refreshes without manual action.

#### FR-28: Departure priority
The system orders departure Rooms on a board by the arrival demand the PMS reports for the day. Realizes UJ-1.
**Consequences (testable):** Priority recomputes when arrivals change; a supervisor can pin a Room to the top of a board manually and that override survives recomputation.

#### FR-29: Shift handover
An attendant can end a shift with incomplete Rooms, and those Rooms return to the unassigned pool with their state and notes intact.
**Consequences (testable):** Partially completed Rooms retain start time and raised Faults; the supervisor sees them as handover items rather than as new work.

### 4.4 Engineering and Work Orders

**Description:** Reactive Work Orders from Faults and preventive Work Orders from PM Schedules, both against an Asset registry that accumulates history. Rooms move in and out of service from here and the PMS follows through Jazz Core. Parts consumption is recorded at the level a chief engineer will actually maintain. Realizes UJ-3, UJ-6.

**Functional Requirements:**

#### FR-30: Reactive Work Orders
An engineer or supervisor can raise and work a Work Order against a Location or Asset, through the same lifecycle as a Request. Realizes UJ-3.
**Consequences (testable):** Work Orders and Requests share lifecycle states, SLA behavior, and escalation; a Work Order can be raised from a Fault (FR-22), from the console, or from a guest Request that is reclassified.

#### FR-31: Asset registry
A property administrator can register Assets with a type, Location, identifier, and optional warranty and installation dates, and every Work Order against an Asset accrues to its history. Realizes UJ-3.
**Consequences (testable):** An Asset's full Work Order history is visible from the Job on mobile; Assets can be bulk-imported; moving an Asset to a new Location preserves history.

#### FR-32: PM Schedules
A chief engineer can define PM Schedules that generate preventive Work Orders on calendar, runtime, or occupancy-based triggers.
**Consequences (testable):** [ASSUMPTION] runtime and occupancy triggers in v1 are driven by data Jazz Core or manual entry supplies, not by IoT telemetry (out of scope per §5); a generated Work Order carries its originating PM Schedule; missed and overdue PM Work Orders are reportable.

#### FR-33: Recurring-fault detection
The system flags an Asset or Location that accumulates a configurable number of Work Orders within a configurable window. Realizes UJ-3, UJ-6.
**Consequences (testable):** Default threshold is three Work Orders in ninety days, Property-configurable; flagged Assets appear on the Chief Engineer's and GM's views; the flag clears on a configured review action, not silently.

#### FR-34: Out of Order and Out of Service
An engineer or duty manager can place a Room OOO or OOS from a Work Order with a reason and expected return date, and return it to sale on completion. Realizes UJ-3.
**Consequences (testable):** OOO/OOS is submitted to Jazz Core for PMS write-back per FR-52 and the write-back result is visible on the Job; a Room cannot be returned to sale while an OOO-linked Work Order is open, without an override that is logged; expected return dates that pass are surfaced to the chief engineer.

#### FR-35: Parts and consumption
An engineer can record parts consumed against a Work Order from a Property-maintained parts list.
**Consequences (testable):** Parts consumption is reportable per Asset and per Work Order; v1 tracks consumption and on-hand count only — no purchasing, reorder, or supplier workflow (§5).

#### FR-36: Guest-impacting fast path
A Work Order raised against an occupied Room for a configured guest-impacting Catalog Entry (hot/cold, no hot water, no power, lock failure) receives the Property's priority SLA Target and escalation chain. Realizes UJ-3.
**Consequences (testable):** The fast-path set is Property-configurable; these Work Orders are visually distinct in every queue; they cannot be assigned to an unavailable Staff Member without an explicit override.

#### FR-37: Work Order closure quality
An engineer must record a resolution and, where the Catalog Entry requires it, a root cause and a photo before closing a Work Order. Realizes UJ-3.
**Consequences (testable):** Root-cause values come from a Property-configurable list, not free text alone; closure without required fields is refused; a Work Order closed as "recurring" links to the prior Work Orders it repeats.

#### FR-38: Engineering queue and workload
A chief engineer can see all open Work Orders for the Property by status, SLA state, Asset, and assignee, including preventive work due.
**Consequences (testable):** Preventive and reactive work are distinguishable and separately filterable; overdue preventive work is surfaced rather than buried under reactive volume.

#### FR-39: Public-area and back-of-house work
Work Orders can be raised against non-Room Locations with the same lifecycle and reporting.
**Consequences (testable):** Location hierarchy supports floors, public areas, outlets, and back-of-house spaces; reporting can separate guest-facing from back-of-house work.

### 4.5 Incidents, Glitch Tracking, and Lost & Found

**Description:** What happens when service fails. A Glitch records the failure against the Stay with cause and responsible Department; a Recovery records what was given and who approved it. Lost & Found runs its own chain of custody, which is a compliance matter as much as an operational one. Realizes UJ-5.

**Functional Requirements:**

#### FR-40: Log a Glitch
A duty manager, front office user, or department manager can log a Glitch against a Stay or a Location with category, severity, responsible Department, and description. Realizes UJ-5.
**Consequences (testable):** Categories and severities are Property-configurable with Tenant defaults; a Glitch can be logged without a Recovery; a Glitch against a Stay is visible on that Stay's timeline.

#### FR-41: Link a Glitch to its causes
A user logging a Glitch can link the Requests, Work Orders, and Room records that caused it. Realizes UJ-5.
**Consequences (testable):** Linked Jobs are navigable from the Glitch and the Glitch is visible from each linked Job; linkage is reportable so Glitch volume can be attributed to Job types.

#### FR-42: Record a Recovery
A duty manager can record a Recovery against a Glitch with type, value, and currency. Realizes UJ-5.
**Consequences (testable):** Recovery types are Property-configurable (comp, discount, points, upgrade, amenity, other); recorded value is reportable by Department, category, and period; v1 records the Recovery — it does not post to the PMS folio or any financial system (§5).

#### FR-43: Recovery approval thresholds
A Recovery whose value exceeds the Property's configured threshold for the user's role routes for approval before it is recorded as authorized. Realizes UJ-5.
**Consequences (testable):** Thresholds are configurable per role per Property; the approver and decision timestamp are recorded; a pending approval appears on the approver's queue and escalates on the Property's configured interval.

#### FR-44: Root cause and review
A department manager can assign a root cause to a Glitch from a configurable list and mark it reviewed.
**Consequences (testable):** Unreviewed Glitches older than a configurable age are surfaced to the GM; root-cause distribution is reportable by Department and period.

#### FR-45: Guest history awareness
A front office user opening a Stay sees prior Glitches and Recoveries for that guest within the Property, and — where the Tenant enables it — across the Tenant's Properties.
**Consequences (testable):** Cross-Property visibility is a Tenant-level setting, off by default, and its state is recorded in the audit trail; the view respects the data governance rules in §11.

#### FR-46: Record a Lost & Found Item
Any Staff Member can record a Lost & Found Item from mobile with photo, Location found, date, finder, and category.
**Consequences (testable):** An item record cannot be created without Location, finder, and date; a storage location and reference are assigned on acceptance into storage.

#### FR-47: Chain of custody
Every change of possession or state of a Lost & Found Item is recorded with actor and timestamp, through found → stored → matched → returned or disposed.
**Consequences (testable):** Custody history is immutable and exportable; return requires recording the recipient and the release method; disposal requires a reason and, above a configurable value, an approver.

#### FR-48: Match an enquiry to an item
A front office user can search Lost & Found Items by date range, Location, and category to match a guest enquiry, and record the enquiry outcome.
**Consequences (testable):** Search returns results within two seconds over a Property's twelve-month register; unmatched enquiries are retained and re-checked against later item records for a configurable period; retention and disposal timers per §11 are visible on each item.

### 4.6 PMS and PBX Integration

**Description:** The differentiating subsystem, and now the highest-dependency one. JazzTicketing holds no connection to any PMS or PBX. Jazz Core owns that estate and JazzTicketing consumes it over the Jazz Core API: Room Status flows both ways, Stay context flows in, OOO/OOS flows out, and a guest call surfaces as a Request draft with the Room and Stay already resolved — all through Jazz Core. This removes per-PMS heterogeneity from JazzTicketing's problem space entirely and replaces it with a single, internally owned contract. The trade is real and worth stating plainly: JazzTicketing's integration risk is no longer "will this PMS support it" but "at what latency and under what availability does Jazz Core deliver it" — a dependency on another team rather than another vendor. The capability half of that question is settled (Jazz Core provides all required functionality and is multi-region, confirmed 2026-08-29); the operational half — SLO, joint incident model, test environment — is not yet. Realizes UJ-1, UJ-2, UJ-3.

**Functional Requirements:**

#### FR-49: Jazz Core connection and health
A property administrator can see the state of their Property's Jazz Core connection, the last successful exchange per event type, and current health.
**Consequences (testable):** Health is visible without engineering access and distinguishes JazzTicketing-side failure from Jazz Core-side failure; a degraded or disconnected state notifies configured roles; health history is retained for troubleshooting; JazzTicketing never surfaces PMS or PBX vendor identity to Property users, because it does not know it.

#### FR-50: Room Status synchronization through Jazz Core
Room Status changes propagate between Jazz Core and JazzTicketing in both directions within the agreed tolerance. Realizes UJ-1.
**Consequences (testable):** target propagation is under thirty seconds end to end, JazzTicketing's own share of that budget being under five seconds; the remainder is Jazz Core's and is [ASSUMPTION] pending an agreed SLO rather than a capability question, since Jazz Core's capability is confirmed (Open Question 1); every synchronization event is logged with direction, outcome, and latency, with JazzTicketing-side and Jazz Core-side latency separable; sustained failure surfaces per FR-49 rather than silently diverging.

#### FR-51: Conflict resolution
When Jazz Core and JazzTicketing hold different Room Status for the same Room, the system resolves by the configured authority rule and records the conflict.
**Consequences (testable):** The default rule is Jazz Core-authoritative for occupancy and JazzTicketing-authoritative for cleanliness, Property-configurable; every resolved conflict is logged and reportable; conflict volume above a threshold notifies the property administrator; a conflict is never resolved by discarding a Staff Member's recorded action without a record of it.

#### FR-52: OOO/OOS write-back through Jazz Core
An OOO or OOS state set in JazzTicketing is submitted to Jazz Core, and the outcome is reflected on the originating Work Order. Realizes UJ-3.
**Consequences (testable):** A failed submission is retried on a bounded schedule and, on exhaustion, surfaces to the chief engineer and property administrator with the Room still marked locally; success, failure, and Jazz Core rejection (with reason) are distinguishable on the Work Order.

#### FR-53: Stay context and master data from Jazz Core
The system ingests check-in, check-out, room move, and guest profile context for current Stays, and sources Property master data (Locations, Rooms, Room types) from Jazz Core where Jazz Core is authoritative for it.
**Consequences (testable):** A room move relocates open Jobs for that Stay to the new Room and records the move on each Job; check-out closes the guest-facing follow-up window per FR-15; ingested guest data is limited to the fields §11 permits, enforced on ingestion rather than on display; master-data changes in Jazz Core reconcile into JazzTicketing without manual re-entry; [ASSUMPTION] the split between Jazz Core-owned and JazzTicketing-owned master data is unresolved — Open Question 2.

#### FR-54: Guest-call-to-Request
A guest call from a Room, reported by Jazz Core, surfaces to the receiving operator as a Request draft pre-resolved to that Room and Stay. Realizes UJ-2.
**Consequences (testable):** The draft appears to the operator handling the call within two seconds of JazzTicketing receiving the Jazz Core call event; when the caller cannot be resolved to a Room the operator gets an unresolved draft rather than a wrong one; discarded drafts are not retained as Requests.

#### FR-55: Wake-up call visibility
Wake-up calls reported by Jazz Core are visible in JazzTicketing as scheduled items against the Stay, and reported failures to deliver raise a Job.
**Consequences (testable):** [ASSUMPTION] scope is visibility and exception handling only — scheduling remains a Jazz Core/PBX function; a failed wake-up creates a Job on the configured Department with priority SLA.

#### FR-56: Phone-posted status and minibar events
Postings made by staff through room phones (minibar consumption, room-status codes), as reported by Jazz Core, are reflected in JazzTicketing.
**Consequences (testable):** A phone-posted Room Status is treated identically to an in-app status change for FR-50 and FR-51; minibar postings attach to the Stay; financial posting remains a Jazz Core/PMS function — JazzTicketing records, never posts.

#### FR-57: Degraded-mode operation
JazzTicketing remains fully operable for Job creation, dispatch, and closure while Jazz Core is unavailable.
**Consequences (testable):** Jobs created during an outage carry a marker that context was unavailable; Room Status changes made locally during an outage are queued and reconciled on recovery per FR-51; every surface that would normally show Stay or Jazz Core-sourced context instead shows an explicit stale-context marker naming the time of the last successful exchange, and no interaction is blocked by its presence; a Jazz Core outage never blocks sign-in, dispatch, or closure.

#### FR-77: Jazz Core API contract and version tolerance
JazzTicketing depends on a versioned Jazz Core API contract and degrades predictably when Jazz Core is ahead of or behind it.
**Consequences (testable):** The consumed contract is versioned and pinned per environment; an unknown event type or field is ignored rather than fatal; a missing required capability at a Property disables the dependent JazzTicketing feature with an explicit reason surfaced in FR-49 health, rather than failing at point of use; contract-level integration tests run against a Jazz Core test environment in CI.

#### FR-83: Tenant settings and default inheritance
A tenant administrator can manage Tenant-level identity, defaults and governance, and see which Properties inherit each default.

**Consequences (testable):**
- Every Tenant default displays the count of Properties currently inheriting it; that count is the stated blast radius of a change.
- A Property that overrides a default stops inheriting it permanently — a later Tenant-level change does not silently re-apply — and the override is visible from both the Tenant and the Property surface.
- Tenant identity provider configuration (FR-3) lives here, with just-in-time provisioning **off by default**: authentication never implies access.
- Cross-Tenant guest history (FR-45) and retention settings (DG-2, DG-3) are Tenant-level, and every change to them is attributed in the audit trail.
- Regions are displayed as a summary and are not settable here; region is chosen at Property creation and immutable thereafter (DG-4).

#### FR-81: Custom role definition
A tenant administrator can define and duplicate roles, subject to guards that prevent incoherent or escalated roles.

**Consequences (testable):**
- A permission with a stated dependency cannot be enabled while its dependency is disabled, and the dependency is named in the interface.
- An administrator cannot grant a role any permission they do not themselves hold; the attempt is refused server-side, not only disabled in the interface.
- Shipped roles are duplicable but not editable, so the shipped baseline stays intact for support.
- A duplicated role is independent at creation — subsequent changes to its source do not propagate — and the interface states this before the copy is made.
- Role creation, duplication and every permission change are recorded in the audit trail with actor and previous value (FR-6).
- Approval thresholds (FR-43) are a per-role value settable here.

#### FR-82: Roster import with explicit mapping
A property or tenant administrator can create and update users in bulk from a roster file, with column mapping and validation before any record is written.

**Consequences (testable):**
- Source columns are mapped explicitly to destination fields; no automatic mapping is applied without review.
- Fields outside the permitted dataset (payroll identifiers, dates of birth, and anything else excluded by DG-1) are refused with a stated reason rather than silently ignored.
- Every row is validated before write, and rows with problems are presented individually with a proposed resolution; a partial import is a supported outcome.
- Rows without an email address create PIN-only accounts (FR-4), and the count of these is shown before confirmation.
- The import is recorded in the audit trail with the file name, row count and outcome.

`[NOTE FOR PM]` FR-81 and FR-82 are **UX-originated scope confirmed by Tanim on 2026-09-02**. Neither was in the original PRD. The role editor in particular carries security-sensitive logic (dependency and escalation guards, server-side enforcement) and should not be estimated as a form.

#### FR-80: Floor layout definition and plan view
A property administrator can define a per-floor layout, and users can view Room Status positioned by that layout instead of in numeric order.

**Consequences (testable):**
- A layout describes wing, corridor side, sequence, and the position of service rooms and vertical circulation — it is structured data, not an uploaded drawing; no CAD import and no drawing canvas is in scope.
- The plan view is available only for floors with a layout and is absent, not broken, for floors without one; the numeric grid remains the default view everywhere.
- State vocabulary in the plan view is identical to the grid — a tile never means something different between views.
- `[NOTE FOR PM]` This is **new scope arising from UX review, not from the original PRD**, and it carries onboarding cost: someone enters a layout per floor, and a layout editor is a further undesigned screen. It belongs in R2 at the earliest, behind the R1 spine, and should be priced as configuration tooling rather than as a view.

#### FR-79: Room Status discrepancy reporting
A Staff Member can report that a Room's actual condition does not match the Room Status the system holds, without changing occupancy themselves. Realizes UJ-1.

**Consequences (testable):**
- Discrepancy types cover at minimum occupied-shown-vacant (sleep), vacant-shown-occupied (skip), and bed-not-slept-in; the set is Property-configurable.
- A discrepancy routes to Front Office and the reporter's supervisor, and appears on the Stay and the Room's history; it never mutates occupancy, which stays Jazz Core-authoritative per FR-51.
- Occupancy discrepancies are reportable as a daily count per Property, because a rising count is a front-desk process problem rather than a housekeeping one.
- A discrepancy raised offline queues per FR-58 and carries the time it was observed, not the time it synced.

#### FR-78: Per-Property capability negotiation
JazzTicketing discovers which Jazz Core capabilities are available for a given Property and adapts its interface accordingly.
**Consequences (testable):** A Property whose Jazz Core deployment does not report call events shows no guest-call-to-Request affordance rather than a broken one; capability state is visible to the property administrator in FR-49 health; features degraded by capability absence are excluded from that Property's SLA and adoption reporting rather than counted as failures.

### 4.7 Mobile Application Foundation

**Description:** The surface most of the workforce touches, on Property-issued Shared Devices and personal handsets, in corridors with unreliable coverage, in several languages. Cross-cutting behaviors that every mobile feature depends on. Realizes UJ-1, UJ-3.

**Functional Requirements:**

#### FR-58: Offline action queueing
A Staff Member can start, pause, complete, and annotate Jobs and Rooms while the device has no connectivity, and the actions apply when connectivity returns. Realizes UJ-1.
**Consequences (testable):** Queued actions carry the timestamp of the action, not of the sync; the interface shows what is queued and unsynced; a queued action surviving a device restart is a requirement, not a best effort; sync conflicts resolve by the rule in FR-59 and are never silently discarded.

#### FR-59: Sync conflict handling
When a queued offline action conflicts with a server-side change, the system resolves it deterministically and makes the resolution visible.
**Consequences (testable):** Resolution rules are documented per action type (e.g. a supervisor's reassignment beats a queued start; a completion is never lost, it becomes a completion on a reassigned Job); the affected Staff Member and supervisor can see that a conflict occurred and what won.

#### FR-60: Push notification
A Staff Member receives push notification of dispatch, escalation, and reassignment relevant to their role and Property.
**Consequences (testable):** Notification routing respects the signed-in Staff Member on a Shared Device; notifications are suppressed for Jobs already accepted by someone else; a Staff Member can see in-app what they were notified about even if the push was missed.

#### FR-61: Multi-language interface
A Staff Member can use the mobile interface in their configured language. Realizes UJ-1.
**Consequences (testable):** The v1 target locale set is English, Spanish (Spain), Spanish (Mexico), Portuguese, Dutch, Hebrew, Chinese, and Arabic — eight locales, of which **Hebrew and Arabic are right-to-left**, with **Arabic shipping in R1** as the RTL proof; language is a Staff Member attribute applied at sign-in on a Shared Device; free-text content is not machine-translated in v1 and is shown as entered; the interface renders correctly in RTL including Job queues, SLA indicators, and mixed-direction content such as Room numbers inside translated sentences.

**Feature-specific NFRs:**
- **RTL is an architecture and design requirement, not a translation task.** Both surfaces must be built RTL-capable from the first screen; retrofitting bidirectional layout after the console and mobile app exist is a rebuild of the layout layer, not a configuration change.
- Locale variants (es-ES vs es-MX, pt-BR vs pt-PT, Simplified vs Traditional Chinese) must be resolved before translation begins — Open Question 6.

**Notes:** `[NOTE FOR PM]` Eight locales including two RTL scripts is a substantial and frequently underestimated cost, spanning design, layout, testing, and ongoing translation maintenance across every release. The release plan in §6.3 ships the full i18n and RTL machinery plus Arabic in the first release and the remaining locales progressively; shipping all eight at once is the alternative and it is materially more expensive.

#### FR-62: Photo capture and attachment
A Staff Member can attach photos to Jobs, Faults, Inspections, Glitches, and Lost & Found Items from the device camera.
**Consequences (testable):** Photos are compressed on device before upload; capture works offline and uploads with the queued action; attachment size and count limits are configured centrally and enforced.

#### FR-63: Mobile Job queue
A Staff Member sees their assigned and available Jobs ordered by SLA urgency, with the information needed to act without opening each one.
**Consequences (testable):** Every action needed to accept, start, and complete a Job from the queue is reachable within the one-handed thumb zone on the baseline device (NFR-5), verified in usability testing with gloved and ungloved hands; SLA state is distinguishable without opening the Job, meeting NFR-6's non-colour requirement at arm's length in low light; the queue reflects a dispatch within five seconds when online.

#### FR-64: Device and session hygiene
The mobile application protects Property and guest data on Shared Devices.
**Consequences (testable):** Guest names and Stay context are not retained on device after sign-out; local caches are encrypted at rest; a remote sign-out invalidates a device session at next contact.

### 4.8 Notifications and Escalation Routing

**Description:** How the system reaches people, on which channel, without becoming noise that staff learn to ignore. Shared by every feature that dispatches or escalates.

**Functional Requirements:**

#### FR-65: Notification routing rules
A property administrator can configure, per Department and event type, which roles are notified and on which channels.
**Consequences (testable):** Supported channels in v1 are push and in-app, with email for management-level events; [ASSUMPTION] SMS is configurable but off by default pending per-Property cost confirmation; rules are Property-scoped with Tenant defaults.

#### FR-66: Escalation chain configuration
A property administrator can define ordered Escalation chains by role, with an interval per step.
**Consequences (testable):** A chain applies to both non-acceptance (FR-11) and Breach (FR-14) with separately configurable intervals; a chain that reaches its end holds at the final role and continues to remind rather than stopping silently.

#### FR-67: Notification suppression
The system suppresses notifications that are no longer actionable and coalesces bursts to the same recipient.
**Consequences (testable):** A Job accepted before a notification is delivered does not notify other candidates; repeated escalations on the same Job to the same recipient coalesce within a configurable window; suppression never applies to Breach notifications to management roles.

#### FR-68: Quiet hours and duty routing
Notification routing respects Property-configured shift and quiet-hour rules so that off-shift staff are not paged for routine work.
**Consequences (testable):** Guest-impacting fast-path Jobs (FR-36) override quiet hours; overrides are logged; a Property with no configuration routes to the Department default rather than to no one.

### 4.9 Reporting and Dashboards

**Description:** What managers and GMs look at, and the evidence a brand audit or an owner review needs. Operational views are live; analytical views are periodic. Realizes UJ-4, UJ-6.

**Functional Requirements:**

#### FR-69: Department operations dashboard
A department manager sees live open load, SLA state distribution, breaches, and staff workload for their Department and Property. Realizes UJ-4.
**Consequences (testable):** The dashboard is current within thirty seconds; it distinguishes breached, breaching, and within-target Jobs; it is scoped to the manager's Department unless their role spans more.

#### FR-70: Property operations dashboard
A GM or duty manager sees cross-Department state for the Property: open Jobs, breaches, Rooms not ready against arrivals, OOO/OOS count, open Glitches. Realizes UJ-6.
**Consequences (testable):** Every figure is drillable to the underlying records; the dashboard names its own data freshness.

#### FR-71: SLA and response reporting
A manager can report on response and completion time and SLA compliance by Department, Catalog Entry, shift, and period, against the Property's recorded baseline. Realizes UJ-6.
**Consequences (testable):** The pre-launch baseline captured at onboarding is stored per Property and shown alongside current figures; medians and percentiles are available, not only means; paused time is separable from active time.

#### FR-72: Recurring-fault and Asset reporting
A chief engineer or GM can report on Assets and Locations by Work Order frequency, cost of parts consumed, and OOO duration. Realizes UJ-3, UJ-6.
**Consequences (testable):** Recurring-fault flags (FR-33) are reportable as a list with drill-down; OOO duration is reportable as revenue-relevant room-nights lost.

#### FR-73: Glitch and Recovery reporting
A GM can report Glitch volume, category, responsible Department, root cause, and Recovery value by period. Realizes UJ-5, UJ-6.
**Consequences (testable):** Recovery value totals are reportable by currency without conversion in v1; Glitches linked to Jobs are attributable to Catalog Entries.

#### FR-74: Adoption and data-quality reporting
A GM sees line-staff mobile usage against roster and an explicit data-completeness indicator per Department. Realizes UJ-6.
**Consequences (testable):** A Department below a configurable usage threshold is marked as having incomplete data wherever its figures appear; the indicator cannot be turned off from within reporting.

#### FR-75: Export and evidence pack
A manager can export any report and generate a brand-standard evidence pack for a date range. Realizes UJ-6.
**Consequences (testable):** Exports are CSV and PDF; exports respect the requesting user's Property and Department scope; every export is recorded in the audit trail with actor, scope, and period; [ASSUMPTION] the evidence pack's required contents must be confirmed against the specific brand standards the target Properties are audited against.

#### FR-76: Corporate cross-Property view
A corporate user at a multi-Property Tenant can compare Properties on the same operational definitions.
**Consequences (testable):** Comparison uses Tenant-level metric definitions, and a Property whose configuration diverges from them is marked as not comparable rather than silently normalized; no guest-identifying data appears in cross-Property views.

## 5. Non-Goals (Explicit)

- **We are not building a guest-facing product in v1.** No guest app, web portal, chatbot, or in-room tablet surface. The guest's channel is the hotel's existing one.
- **We are not building an AI product in v1.** No automatic classification, duration prediction, predictive escalation, or natural-language intake. The data model is designed so these become possible later; nothing ships that depends on them.
- **We are not integrating with PMS or PBX systems.** JazzTicketing has exactly one upstream: the Jazz Core API. No PMS-specific or PBX-specific code, credentials, certification, or vendor relationship enters this product. Anything the estate needs that Jazz Core does not expose is a Jazz Core requirement, not a JazzTicketing one.
- **We are not becoming a PMS.** Reservations, rates, inventory, folio, and night audit stay where they are. JazzTicketing reads and writes the operational slice, through Jazz Core, and nothing else.
- **We are not becoming a financial system.** Recoveries and parts are recorded, never posted, approved for payment, or reconciled.
- **We are not building labor management.** No rostering, scheduling, time and attendance, or payroll. Boards are built from a roster the Property supplies or enters, not from a scheduling engine.
- **We are not building F&B, spa, or activity operations.** Those Departments receive Jobs; their own workflows are out.
- **We are not building an IoT platform.** No sensor ingestion, BMS, door-lock, or energy-management integration in v1.
- **We are not shipping on-premises.** A multi-region multi-tenant cloud deployment. Property-side components, if architecture concludes they are needed for NFR-2, are Jazzware-operated, never customer-managed applications.
- **We are not chasing incumbent feature parity.** Scope is judged against the four spines and the integration wedge, not against a competitor's grid.

## 6. MVP Scope

### 6.1 In Scope

- The four operational spines: guest request dispatch (§4.2), housekeeping operations (§4.3), engineering and work orders (§4.4), and incidents, glitch tracking and Lost & Found (§4.5).
- Multi-tenant foundation: Tenant → Property → Department → Staff Member hierarchy, role-based access, corporate SSO, Shared Device sign-in, Property-level configuration, audit trail (§4.1).
- Jazz Core integration: two-way Room Status, Stay context and master data, OOO/OOS write-back, guest-call-to-Request, wake-up visibility, phone-posted status, versioned contract handling, per-Property capability negotiation, and degraded-mode operation (§4.6).
- Mobile application for line staff with offline queueing, push, photo capture, multi-language interface, and Shared Device hygiene (§4.7).
- Notification and escalation routing configurable per Property and Department (§4.8).
- Operational dashboards, SLA and recurring-fault reporting, Glitch and Recovery reporting, adoption/data-quality reporting, exports and the brand evidence pack (§4.9).
- Onboarding capture of each Property's pre-launch baseline, without which SM-2 cannot be claimed.

`[NOTE FOR PM]` **This full scope is a v1 platform, not a minimum viable product.** With the existing team confirmed (Open Question 4) and no design partner until after the MVP ships (Open Question 2), seventy-eight FRs delivered as one release is not a credible plan. §6.3 slices it. The slicing is a proposal and needs Tanim's confirmation before anything moves downstream.

### 6.3 Release Slicing (proposed — confirm before UX and architecture)

The constraint set is now known: an existing team already carrying adapter work, no design partner and therefore no external validation until after ship, a multi-region obligation, and eight locales including two RTL scripts. That argues for a first release that is narrow in features and complete in foundations, because the foundations (tenancy, multi-region, RTL, offline, Jazz Core contract) are the parts that cannot be retrofitted cheaply and the features are the parts that can be added incrementally.

**R1 — Prove the spine end to end.** Tenancy, identity, configuration, audit (FR-1..FR-6). Job core: lifecycle, SLA Clock, pauses, routing, escalation (FR-7..FR-18). Jazz Core integration in full (FR-49..FR-57, FR-77, FR-78). Mobile foundation including offline, push, photos, shared-device sign-in, and the complete i18n/RTL machinery (FR-58..FR-64). Notification and escalation routing (FR-65..FR-68). Minimum reporting: department dashboard, SLA reporting, adoption and data-quality reporting (FR-69, FR-71, FR-74). Locales: English plus **Arabic**, to prove the RTL path is real rather than planned.
*This is the demonstrable product: a guest calls, Jazz Core reports it, a Request appears pre-resolved, a phone buzzes, a clock runs, an escalation fires, a dashboard shows it. It is also the whole of the thesis.*

**R1 also carries FR-86, Jazzware operator authentication**, because it is a prerequisite
rather than a feature: Story 1.1 provisions a Tenant "given I am authenticated as a
Jazzware operator", so without it nothing can be provisioned by the documented path and R1
has no starting state.

**R2 — Housekeeping** (FR-19..FR-29) with Room Status depth, boards, inspections, turndown, **plus multi-factor authentication (FR-84, FR-85)** — new scope that a first customer's security review will ask for, deliberately not competing with the R1 spine. The highest-volume adoption surface and the strongest proof of Jazz Core's two-way Room Status.

**R3 — Engineering and work orders** (FR-30..FR-39) with the Asset registry, PM Schedules, and recurring-fault detection, plus Asset reporting (FR-72).

**R4 — Incidents, Glitch tracking, and Lost & Found** (FR-40..FR-48), the remaining reporting and evidence pack (FR-70, FR-73, FR-75, FR-76), and the remaining locales. Confirmed: Lost & Found capture is not a line-staff mobile action before this release.

**Held across all releases:** every release is demo-ready at a property, because with no design partner the demo is the only feedback channel that exists.

**Timeline: Q2 2027.** [ASSUMPTION] Q2 2027 is read as the target for **R1** — the demonstrable spine — with R2 through R4 following it, not as the delivery date for all four releases. From August 2026 that is roughly three quarters for the whole of R1: tenancy, Job core, the full Jazz Core integration, a mobile client with offline sync and complete bidirectional localization, notification routing, and enough reporting to measure anything. On the existing team, alongside its current adapter work, that is a demanding but not unreasonable target — *provided* the foundation items (multi-region tenancy, RTL, offline) are built first rather than deferred, since each of them is a rebuild if retrofitted. Correct this reading if Q2 2027 was meant as the date for the full four-release scope; that would be a different plan and would need either more people or fewer spines.

### 6.2 Out of Scope for MVP

- Guest-facing surfaces of any kind — the differentiator is operational, and a guest surface doubles the design and support burden for v1. *Deferred to v2.*
- AI triage, duration prediction, predictive escalation, and natural-language intake — they need the operational history v1 produces. *Deferred to v2/v3.* `[NOTE FOR PM]` This is the section most likely to be pulled forward by enthusiasm during the pitch; hold the line or move it deliberately with a scope trade, not as an addition.
- F&B/POS, spa, and activity workflows. *v2 at the earliest.*
- Procurement, purchasing, reorder points, and supplier management. *No committed release.*
- Labor scheduling, time and attendance, payroll. *No committed release — likely an integration rather than a build.*
- IoT/BMS, door locks, energy management. *v3 or an integration partnership.*
- Financial posting of Recoveries to the folio. *v2, and dependent on FR-42's data proving accurate in practice.* `[NOTE FOR PM]` GMs will ask for this early.
- Cross-Tenant benchmarking. *Not planned; raises data-governance questions we do not need in v1.*
- Any JazzTicketing-side PMS or PBX connector. *Not planned at any horizon — it belongs to Jazz Core by design.*
- On-premises deployment. *Not planned.*
- Native tablet-optimized layouts beyond responsive behavior. *v2.*

## 7. Cross-Cutting Non-Functional Requirements

- **NFR-1 Availability.** The platform targets 99.9% monthly availability per Property, measured on Job creation and state transition. Planned maintenance occurs outside each Property's local peak windows (checkout 09:00–12:00, evening turndown 17:00–21:00) — a constraint that a global window cannot satisfy and architecture must design around.
- **NFR-2 Survivability.** A Property must remain operable for at least the duration of a shift through either WAN loss or Jazz Core unavailability, with degraded features clearly indicated (FR-57). Where this lands — client-side queueing alone or a Property-side component — is architecture's decision and the single most consequential one in this PRD. Note that the two failure modes are now separable: Jazz Core can be down while the platform is reachable, and the product must stay useful in that state.
- **NFR-3 Latency.** Dispatch reaches an online recipient's device within five seconds at p95. Console list views load within two seconds at p95 for a 400-Room Property. Catalog search responds within 300ms at p95.
- **NFR-4 Scale.** Design point: a Tenant of 200 Properties, a Property of 1,500 Rooms, 4,000 open and closed Jobs per Property per day at peak, and 500 concurrent mobile sessions per Property. [ASSUMPTION] — derived from category norms, to be replaced with figures from the Jazzware installed base.
- **NFR-5 Mobile device support.** **Property-issued Shared Devices**, passing between staff across shifts. There is no BYOD path: a personal handset in use is governed by the same shared-device rules, so the client never reasons about device ownership (UX `EXPERIENCE.md.Shared Devices and Sessions`). [ASSUMPTION] Baseline class Android 10 / iOS 15, 3 GB RAM on intermittent Wi-Fi, cold start to usable Job queue under four seconds — now a **procurement input as well as an engineering floor**, since the Property is buying the hardware, and it sets the floor for the offline store and the bidirectional layout work alike.
- **NFR-6 Accessibility.** WCAG 2.1 AA for the web console. Mobile meets platform accessibility guidelines, with the specific requirement that Job state is never conveyed by colour alone — SLA state must be legible to a colour-blind attendant in a dim corridor.
- **NFR-7 Security.** Encryption in transit and at rest; least-privilege service credentials for the Jazz Core connection; no shared administrative accounts; secrets never resident on Shared Devices; penetration test before first production Property.
- **NFR-8 Observability.** Every Job state transition, notification delivery, Jazz Core exchange, and sync conflict is traceable end to end, with JazzTicketing-side and Jazz Core-side contributions to latency and failure separable. A support engineer must be able to answer "why did this Job not reach this phone" from telemetry alone.
- **NFR-9 Time correctness.** All SLA computation is server-side in UTC and presented in Property-local time, correct across DST transitions and across Properties in different zones within one Tenant.
- **NFR-10 Localization and bidirectionality.** Interface strings, date/time, number formats, and text direction are locale-driven across both surfaces; the data model does not assume a single language or a single direction for free text. Both surfaces are built bidirectional from the first screen per FR-61.
- **NFR-11 Jazz Core dependency posture.** JazzTicketing treats Jazz Core as an external system with an agreed SLO, not as an in-process guarantee: every call is timeout-bounded and retried within a budget, no user-facing operation blocks indefinitely on it, and its availability and latency are measured and reported independently of JazzTicketing's own (FR-49, NFR-8). JazzTicketing's own availability target (NFR-1) explicitly excludes Jazz Core outages, which are reported separately.

## 8. Operational Requirements

- **OR-1 Support model.** 24/7 support for guest-impacting failures, with a defined severity ladder and response targets. Hotels operate continuously; a weekday support model is not viable and must be costed in the pitch.
- **OR-2 RTO / RPO.** [ASSUMPTION] RTO 1 hour, RPO 15 minutes for operational data. Confirm against what management is willing to fund.
- **OR-3 Onboarding.** A Property reaches first production Job within days of contract, not months. The onboarding runbook — master-data reconciliation with Jazz Core, Catalog and SLA configuration, roster load, Jazz Core connection and capability verification, baseline capture, staff training, and (where the plan view is wanted) per-floor layout entry per FR-80 — is a v1 deliverable, not documentation written afterward. Because SM-1 is measured on this and no FRs currently implement it, either the runbook's tooling becomes requirements or SM-1's target must be defended manually.
- **OR-4 Jazz Core dependency operations.** Jazz Core health, alerting, and remediation remain with the Jazz Core function. What is new is the seam: a defined escalation path from JazzTicketing support into Jazz Core support, a shared severity ladder, and an agreed SLO (Open Question 2). Without that agreement, every property-facing incident becomes a two-team triage with no owner — which is the operational failure mode this dependency introduces.
- **OR-5 Release cadence.** Releases do not interrupt an operating Property; mobile clients must tolerate a server ahead of them by at least one release.

## 9. Integration and Dependencies

- **Jazz Core — the single upstream, and the critical-path dependency.** JazzTicketing consumes Room Status, Stay context, master data, guest call events, wake-up events, and phone postings from Jazz Core, and submits OOO/OOS to it. This eliminates PMS and PBX heterogeneity, certification, and per-vendor effort from JazzTicketing entirely. It replaces them with a dependency on another Jazzware team's API surface, latency, availability, roadmap, and release cadence. **Tanim confirms (2026-08-29) that Jazz Core already provides all required functionality and is multi-region.** That closes the largest unknown in the plan: there is no Jazz Core work package to estimate, no PMS certification path, and no residency seam between the two systems. What remains open is narrower and operational rather than existential — the agreed availability and latency SLO, the joint incident model, and a Jazz Core test environment JazzTicketing's CI can exercise (FR-77).
- **Jazz Core test environment.** Contract tests (FR-77) require a Jazz Core environment JazzTicketing's CI can exercise. Confirm one exists or schedule it as a joint prerequisite — it is also what makes every release demo-ready under RO-4.
- **Identity provider.** Per-Tenant SSO for corporate users (FR-3).
- **Push notification services.** Platform push for mobile; deliverability on Property Wi-Fi with restrictive egress is a known risk and, with no design partner to validate against, must be tested on representative networks internally.
- **Translation supply.** Eight locales (FR-61) need a supplier and a maintenance path across releases; unowned translation is how locales silently rot.
- **No longer dependencies:** PMS vendors, PBX vendors, PMS certification programmes, and per-brand connector approvals. All of these sit behind Jazz Core.

## 10. Stakeholders and Approvals

- **Product decision and funding:** Jazzware management, on the strength of the brief and this PRD.
- **Engineering ownership:** Tanim's group, including the adapter function whose scope this extends.
- **Jazz Core owner:** a required party, not a consulted one. The capability surface is confirmed; what still needs their signature is an SLO and a joint incident model (Open Question 1), plus a test environment.
- **First Property:** none until after MVP ships — the product is built to specification and demonstrated afterward. Risk accepted (RO-1).
- **Approval to proceed to architecture:** none outstanding. Architecture can start.

## 11. Data Governance and Compliance

- **DG-1 Guest data minimization.** JazzTicketing stores the smallest guest dataset that makes the operational context useful: name, Room, Stay dates, VIP/loyalty flag, and language. No payment data, no identity-document data, no marketing profile.
- **DG-2 Retention.** Guest-linked records (Requests carrying Stay context, Glitches, Recoveries, Lost & Found Items) have Tenant-configurable retention within a platform maximum, after which guest identifiers are removed while the operational record survives in de-identified form.
- **DG-3 Right to erasure.** A guest erasure request is executable per Property and per Stay, removing guest identifiers while preserving de-identified operational history and the audit trail.
- **DG-4 Residency.** **Multi-region at launch — confirmed.** Property data resides in the region its market requires, and the platform is designed multi-region from day one rather than retrofitted. Jazz Core is confirmed multi-region, so there is no residency seam between the two systems. Two consequences remain and both belong to architecture: tenancy isolation must be region-aware (a Tenant may span regions while a Property must not), and cross-Property corporate views (FR-76) must work across regions without relocating guest-identifying data. `[NOTE FOR PM]` Multi-region at launch, on an existing team, alongside eight locales and two RTL scripts, is the largest single cost driver introduced by this round of answers. It is the right call for a global estate; it should be visible in the pitch as a cost, not absorbed silently.
- **DG-5 Staff data.** No works-council or union constraints are known at target Properties. Staff performance data (durations, inspection outcomes, adoption) remains personal data under GDPR and the other regimes a multi-region estate implies, so it is minimized, access-controlled by role, and retained under DG-2. The aggregate-only reporting mode is retained as a configuration rather than dropped — it costs little now and a single works-council objection in one European Property would otherwise stall reporting there.
- **DG-6 Accessibility compliance.** WCAG 2.1 AA per NFR-6, evidenced before first production Property.
- **DG-7 Out of scope.** PCI-DSS scope is avoided by design: no cardholder data enters the platform, and Recovery values are amounts, not transactions.

## 12. Rollout and Change Management

**The shape of this section changed with Open Question 2.** There is no design partner: the MVP is built to specification and demonstrated to Properties afterward. That is a legitimate decision for a product sold into an installed base, and it removes a dependency on a customer's timeline — but it means the first honest feedback on whether room attendants will actually use this arrives *after* the build, not during it. The mitigations below exist because of that, and they are not optional garnish.

- **RO-1 No design partner — build to specification, demonstrate after ship. Risk reviewed and accepted by Tanim (2026-08-29).** The exposure is recorded rather than re-argued: line-staff adoption (SM-3) is the assumption most likely to be wrong and the one no internal review can predict, and it will now be tested after the build rather than during it. The two mitigations remain available and cheap if wanted later: putting the mobile prototype in front of housekeeping and engineering staff at any accessible property as usability testing, and treating each release demo as a structured feedback event. Neither is a commitment of this plan.
- **RO-2 Baseline capture at deployment, not before.** Pre-launch baselines cannot be captured without a design partner, so SM-2 changes shape: at the first Property, the first thirty days of operation become the reference period, and improvement is measured from it. A Property that can supply its own historical response data during onboarding gives a stronger baseline and should be asked.
- **RO-3 Staff enablement and device provisioning.** Line-staff training measured in minutes, not hours, delivered in the locales of FR-61. Handset provisioning — count per Property, enrolment, replacement, charging practice — is part of onboarding (OR-3) now that the device model is Property-issued. If a room attendant needs a training session to use the app, the app is wrong — and with no design partner, this is the assumption most in need of early external testing.
- **RO-4 Demo readiness as a release gate.** Every release in §6.3 is demonstrable end to end against a Jazz Core test environment with realistic Property data. With no live Property, the demo environment is the product's only mirror and it must be maintained as a first-class asset.
- **RO-5 Adoption watch from day one at the first Property.** FR-74's adoption and data-quality reporting must exist in R1, precisely because there is no earlier signal.
- **RO-6 Internal dogfooding.** Jazzware's own support and adapter operations teams run their internal work through the Job core during the build, which is the only continuous usage signal available before the first Property.

## 13. Success Metrics

**Measurement reality after this round of answers:** with no design partner, none of the deployment metrics can be measured until after the MVP ships. SM-8 and SM-9 are therefore added as the only signals available during the build, and they are the ones that will be argued about in the pitch — a plan whose first evidence arrives after the money is spent needs interim evidence of some other kind.

**Primary**

- **SM-1: Time to first production Job.** Days from a Property agreeing to deploy to its first Job created; target under ten working days. Validates FR-5, FR-49, FR-78, OR-3 — and the thesis that consuming Jazz Core converts into deployment speed. First measurable at the first deployment.
- **SM-2: SLA compliance improvement.** Percentage of Jobs closed within SLA Target, measured against the reference period defined in RO-2 (the Property's own first thirty days, or its supplied historical data where available); target a measurable improvement by day 90 of operation. Validates FR-12, FR-14, FR-71.
- **SM-3: Line-staff mobile adoption.** Daily active line staff as a percentage of rostered line staff; target above 80% by day 30 at a live Property. Validates FR-4, FR-58, FR-61, FR-63, FR-74. **The metric most at risk from having no design partner.**

**Secondary**

- **SM-4: Median response time by Department**, against the RO-2 reference period. Validates FR-9, FR-10, FR-63.
- **SM-5: Recurring faults surfaced and resolved** — Assets flagged under FR-33 receiving a review action within 30 days. Validates FR-31, FR-33, FR-72. First measurable after R3.
- **SM-6: Glitch capture rate** — Glitches logged per 100 occupied room-nights, expected to *rise* on introduction. Validates FR-40, FR-41. First measurable after R4.
- **SM-7: Property retention** — Properties still live at 12 months from their own go-live. Target set once the first deployments exist; the year-one property-count figure inherited from the brief is withdrawn as unfounded now that no design partner is committed.

**Build-phase signals (available before any Property)**

- **SM-8: Demo-to-pilot conversion.** Properties demonstrated to that agree to a deployment, and time from demo to agreement. The earliest external validation the plan permits, and the first honest test of the value proposition.
- **SM-9: Release demo-readiness.** Each release in §6.3 demonstrable end to end against the Jazz Core test environment on its target date. A proxy for progress that cannot be gamed by burn-down charts. Validates RO-4.

**Counter-metrics (do not optimize)**

- **SM-C1: Requests logged per occupied room.** A *rise* early is success (capture improving), not failure. Counterbalances SM-4 — driving response time down by discouraging logging is the failure mode this catches.
- **SM-C2: Median Job closure time versus rejected-Inspection rate and repeat-Request rate.** Fast closure that produces rework is not speed. Counterbalances SM-2 and SM-4.
- **SM-C3: Notifications delivered per Staff Member per shift.** Escalation that pages everyone works until staff stop looking. Counterbalances SM-2; watched alongside FR-67.
- **SM-C4: Configuration burden at onboarding.** Hours of configuration per Property. Counterbalances SM-1 — hitting the speed target by shifting work onto the customer is not a win.
- **SM-C5: Feature completeness versus demo count.** With no design partner, the standing temptation is to keep building instead of showing. Counterbalances SM-9: releases demonstrated to real Property staff, not just demonstrable.

## 14. Open Questions

Two answer rounds are recorded in `.memlog.md`. **Closed:** the PMS estate (no direct integration — Jazz Core owns it), Jazz Core capability (**confirmed complete**), Jazz Core regionality (**confirmed multi-region**), design partner (none — risk accepted), incumbent relationship (no constraint), team (existing), commercial model (bundled), brand standards (none specific), languages, device policy (none defined), residency (multi-region), works-council constraints (none), and timeline (Q2 2027). **Nothing outstanding blocks the architecture phase.**

1. **What availability and latency SLO will the Jazz Core team commit to, and what is the joint incident and escalation model** (OR-4, NFR-11)? Capability is confirmed; this is the operational half. FR-50's propagation target rests on it, and without a shared severity ladder every property-facing incident becomes two-team triage with no owner. *Owner: Tanim, with the Jazz Core owner.*
2. **Which master data is Jazz Core authoritative for** — Properties, Locations, Rooms, Room types, staff roster — and which does JazzTicketing own (FR-53)? Shapes the configuration model and a meaningful share of onboarding effort (SM-1). *Needed early in architecture.*
3. **Is there a Jazz Core test environment JazzTicketing's CI can exercise** (FR-77, RO-4)? It gates contract testing and every release demo.
4. **Device procurement.** The model is settled — Property-issued Shared Devices, no BYOD — which puts a hardware line item on every Property. How many handsets per Property, who buys them, and whether that cost sits with Jazzware or the hotel belongs in the rollout plan and the commercial conversation, not discovered at go-live. The baseline device class (NFR-5) becomes a purchasing spec.
5. **Locale variants and translation ownership** (FR-61): es-ES and es-MX both, or one; pt-BR or pt-PT; Simplified or Traditional Chinese; numeral form for Arabic; and who supplies and maintains all eight across releases. Arabic is settled as R1's RTL locale.
6. **Does Q2 2027 mean R1 or the full four releases?** The PRD reads it as R1 (§6.3). If it means everything, the plan needs either more people or fewer spines.
7. **Onboarding tooling.** SM-1 measures time to first production Job and no FRs implement onboarding (OR-3). Either the runbook's tooling becomes requirements or the target is defended manually.

## 15. Assumptions Index

Every `[ASSUMPTION]` in this document, for explicit confirmation:

1. §4.2 FR-9 — v1 routing is rule-based (Department + role + open load), not skill-graph or predictive.
2. §4.4 FR-32 — PM Schedule runtime/occupancy triggers are fed by Jazz Core or manual data, not IoT telemetry.
3. §4.6 FR-50 — Jazz Core's share of the sub-30-second propagation budget is assumed pending an agreed SLO (Open Question 1). This is now a service-level assumption, not a capability one.
4. §4.6 FR-53 — the Jazz Core / JazzTicketing master-data split is unresolved (Open Question 2).
5. §4.6 FR-55 — wake-up scope is visibility and exception handling, not scheduling.
6. §4.7 FR-61 — eight locales including two RTL scripts ship across the release plan, with full RTL machinery and Arabic in R1. Numeral form in Arabic locales (Western vs Eastern Arabic digits) is an open rendering decision — the UX spine assumes Room numbers, Job identifiers and times stay Western in every locale.
7. §4.8 FR-65 — SMS is configurable but off by default pending per-Property cost confirmation.
8. §4.9 FR-75 — with no specific brand standard to satisfy, the evidence pack is a configurable export rather than a certified artifact.
9. §6.3 — the four-release slicing is proposed by this PRD; **Q2 2027 is read as R1's target, not the full scope's** (Open Question 6).
10. §7 NFR-4 — scale design points are category norms, not measured figures from the Jazzware base.
11. §7 NFR-5 — baseline device class assumed as Android 10 / iOS 15, 3 GB RAM on Property-issued handsets; now a purchasing spec as well as an engineering floor (Open Question 4).
12. §8 OR-2 — RTO 1 hour / RPO 15 minutes is proposed, not agreed.
13. **Whole document** — competitor positioning inherited from the brief remains unvalidated; web research was unavailable when both documents were written.

*Resolved and withdrawn across the two answer rounds:* the assumed PMS estate and certification gates (dissolved — Jazz Core owns integration), **Jazz Core capability availability (confirmed complete)**, **Jazz Core regionality (confirmed multi-region)**, EU-only residency (superseded by multi-region), works-council constraints (confirmed absent), and the year-one property-count target (withdrawn as unfounded without a design partner).
