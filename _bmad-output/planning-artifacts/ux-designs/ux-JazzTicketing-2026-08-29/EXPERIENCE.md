---
name: JazzTicketing Mobile
status: final
updated: 2026-09-02
sources:
  - "{planning_artifacts}/prds/prd-JazzTicketing-2026-08-29/prd.md"
  - "{planning_artifacts}/briefs/brief-JazzTicketing-2026-08-29/brief.md"
---

# JazzTicketing Mobile — Experience Spine

Scope: the line-staff mobile application. The web console is a separate surface and a later run; `DESIGN.md` tokens are authored to be shared with it. `DESIGN.md` owns how it looks, this spine owns how it works, and both win over any mock.

## Foundation

Single-surface mobile, Android and iOS at parity, inheriting platform navigation, gestures, and dynamic type. No UI system named — `[ASSUMPTION]` the component library is built on the platform primitives against `DESIGN.md` rather than adopted from shadcn/MUI/Material, because the offline, RTL, and target-size requirements touch every component anyway.

Four conditions shape every decision here, and they are not negotiable garnish — they are the product:

1. **The device is the hotel's.** Property-issued Shared Devices that pass between shifts, Android 10 / iOS 15, 3 GB RAM (PRD NFR-5). There is no BYOD path: a staff member using a personal handset is governed by the same shared-device rules, so the app never has to reason about whose phone it is running on.
2. **The network is unreliable and Jazz Core can be down independently of it** (PRD FR-57, FR-58, NFR-2). Offline is a normal operating mode, not an error path.
3. **Eight locales, two of them right-to-left** (PRD FR-61). Layout is authored in logical direction.
4. **Sessions are short and interrupted.** The median session is seconds long, one-handed, and frequently abandoned mid-task. Nothing may depend on the user finishing what they started.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Sign in | Cold start, sign-out, session timeout | PIN entry with language selection on the same screen |
| Board | Home for Room Attendant | The shift's Room Assignments, ordered by departure priority |
| My Work | Home for Engineer, Runner, Supervisor; tab for all roles | Assigned and available Jobs ordered by SLA urgency |
| Now group | Top of Board, dual-role Staff Members only | Dispatched Jobs surfaced on the Board so time-critical work does not wait for a tab switch |
| Job detail | Job card tap, push notification | One Request or Work Order: accept, work, pause, complete |
| Room detail | Board room tap | One Room: start, DND, refuse, complete, raise Fault |
| Set status | Room detail overflow | Set cleanliness directly, without running a clean. Occupancy is read-only |
| Report discrepancy | Set status sheet | What the attendant found when the Room does not match Jazz Core |
| Raise | Global action from Board, Room detail, Job detail, My Work | Report a Fault or request linen/amenities against a Location |
| Asset history | Job detail, when the Job carries an Asset | Prior Work Orders on this Asset — the recurring-fault signal |
| Lost & Found capture | Raise sheet | Record a found item with photo, Location, and finder. **R4** — not a line-staff action before then |
| Inbox | Tab | Dispatches, escalations, reassignments — what you were notified about |
| Floor | Tab, Supervisor role only | Live Room Status across floors as a room grid; entry to Room detail |
| Boards | Floor header, Supervisor | Every attendant's board with progress against median; entry to reassignment |
| Reassign | Boards, Supervisor | Move Rooms between Room Assignments; confirms when a Room is already started |
| Inspection | Room detail, Supervisor | Scored checklist, pass or reject with note and photo |
| Approvals | My Work, Supervisor | Recovery approvals above threshold and non-acceptance escalations |
| Open jobs | My Work header, Supervisor | Every open Job across Departments, filtered by Department, SLA state and assignment |
| Assign | Open jobs, Job detail, Supervisor | Send one or several Jobs to a Staff Member or a Department queue |
| Department load | Floor header, Supervisor | Open Jobs, breaches, and rooms-not-ready against arrivals for the shift |
| Me | Header avatar | Language, notification settings, queued actions, sign out |

Bottom tab bar of three, role-shaped: Attendant sees Board · My Work · Inbox; Engineer and Runner see My Work · Inbox · Me; Supervisor sees Floor · My Work · Inbox. No drawer, no nested tabs. Modal depth is one: a bottom sheet may open over a screen, never over another sheet.

**Floor and its companions are one surface family on two form factors, with a division of labour rather than a shrunken copy.** Mobile Floor is for a supervisor standing in a corridor mid-shift: see which rooms are stuck, move a handful between boards, open a room. Console Floor is for planning and the whole property at once: the full grid, arrivals against readiness, bulk reassignment, and the numbers a duty manager reports upward. `[NOTE FOR UX]` The temptation is to render the console's grid on a phone; resist it. The two share data, vocabulary, and state semantics — not layout. Mobile Floor carries the subset a supervisor can act on while walking, and defers everything else to the console.

**Home is the role's answer to "what next".** An attendant opening the app cold lands on Board with the next Room at the top. An engineer lands on My Work with the most urgent Job at the top. Nobody lands on a dashboard.

**A Staff Member holding both roles lands on Board, and dispatched Jobs come to her there.** The reasoning is worth keeping, because the decision looks arbitrary without it. Board is *planned* work that defines the shape of a shift; dispatched Jobs are *episodic*. So Board is the stable home — and a home that moves depending on state is a home nobody can build a habit around when they open it forty times a shift. But a Job carries an SLA Clock and a Room does not, and time-critical work must never depend on someone choosing the right tab. So Board opens with a **Now group** above the rooms: any accepted or awaiting-acceptance Job, ordered by SLA urgency, on the same screen as her board.

The tension this creates is real and is resolved deliberately rather than ignored. The Glossary keeps **Job** and **Room Assignment** distinct, and this screen does not merge them: the Now group renders Job cards, the board below renders Room cards, the two are visually and structurally separate, and no card type does double duty. One screen carries both kinds of work; the model still knows they are different things. My Work remains a tab for the full Job list — the Now group is the urgent subset, not a replacement for it.

→ Composition reference: `mockups/mobile-key-screens.html`. Spine wins on conflict.

## Voice and Tone

Microcopy. Brand posture lives in `DESIGN.md.Brand & Style`.

Every string is written to be translated into eight locales and read by someone whose first language may not be the one they have selected. Short sentences, concrete nouns, verbs the user would actually say. No idiom, no humour, no exclamation marks, no encouragement.

| Do | Don't |
|---|---|
| "Room 1204 · Departure" | "Let's get room 1204 sparkling!" |
| "12 min left" | "Hurry — SLA at risk!" |
| "Saved on this phone. It will send when you have signal." | "Network error (code 503)" |
| "3 actions waiting to send" | A red badge with "3" |
| "Guest details are not available right now. Last updated 09:14." | "Failed to load guest data" |
| "Mark room clean?" | "Are you sure you want to perform this action?" |
| Name the object: "Reassigned to Ana." | "Assignment updated successfully." |

Numbers and times are localized; Room numbers are not translated and stay in Latin digits with tabular figures, isolated from surrounding RTL text so they never visually reverse.

## Component Patterns

Behavioural. Visual specs live in `DESIGN.md.Components`. → Composition reference: `mockups/mobile-key-screens.html` — housekeeper set H1–H9, supervisor set S1–S9, plus two RTL/dark variants. Spine wins on conflict.

| Component | Use | Behavioural rules |
|---|---|---|
| Job card | My Work, Inbox | Whole card is the tap target. Shows enough to act without opening: SLA chip, Location, Catalog Entry, Department. Never shows guest name in a list — only inside Job detail. |
| SLA chip | Job card, Job detail | Counts down live while the screen is open; recomputes from server timestamps on every foreground, never from a local clock (PRD NFR-9). Paused chips show accumulated pause, not a running number. |
| Now group | Board, dual-role only | Appears only when the Staff Member holds a dispatchable role *and* has open Jobs. Renders Job cards, never Room cards. Disappears entirely when empty — no empty-state header. |
| Room card | Board, Floor | Tap opens Room detail. Status is written as words. A rejected Inspection returns the Room to the top of the board with the supervisor's note visible on the card itself. |
| Primary action bar | Job detail, Room detail | Exactly one action, labelled with a verb, reflecting the single legal next transition. When more than one transition is legal, the bar carries the expected one and the rest live in the overflow. |
| Raise sheet | Everywhere | Two taps to a Fault: category, then photo-or-skip. Location is pre-filled from context and editable. Never blocks the flow the user was in. |
| Photo capture | Raise, Job completion, Inspection, Lost & Found | Compresses on device before queueing. Capture always succeeds offline. Upload state is labelled per photo. |
| Queue counter | Header, all screens | Present whenever queued actions exist; tapping opens the queue list in Me. Disappears silently on successful sync — no success toast. |
| PIN pad | Sign in | Language selector above the pad, languages shown in their own scripts. Sign-in completes in under five seconds (PRD FR-4). |
| Bottom sheet | Confirmations, pickers, Raise | One level. Irreversible actions are confirmed here with the verb spelled out and the object named. |
| Inbox row | Inbox | Records what the user was notified about, whether or not the push arrived. A Job already accepted by someone else is shown as taken, not removed. |

## State Patterns

→ Rendered states: `mockups/mobile-key-screens.html` — H2/H3 (queued, rejected inspection), S6/S8 (breach, escalation, approval), and the RTL/dark pair (offline).

| State | Surface | Treatment |
|---|---|---|
| Cold open, cached | Board, My Work | Render cached work immediately, refresh behind it. Never a blocking spinner on the home surface. |
| Cold open, no cache | Board, My Work | Skeleton rows with "Loading your work…". If it fails: "We couldn't load your work. Pull down to try again." |
| No work assigned | Board, My Work | "Nothing assigned right now." Plus the Raise action, so a staff member can still report something. |
| Offline | Global | Persistent header strip: "No signal — your work is saved on this phone." No modal, no blocked action. |
| Action queued | Job card, Room card, Job detail | Per-item marker "Waiting to send" in `state-offline`. The item still shows its new state — the attendant's action is real to them the moment they take it. |
| Syncing | Header | Queue counter counts down. No full-screen progress. |
| Sync conflict lost | Job detail, Room detail | Explicit, never silent (PRD FR-59): "This job was reassigned to Ana while you were offline. Your note was saved to it." The user's contribution is always preserved and named. |
| Jazz Core unavailable | Job detail, Room detail | Context fields show "Guest details are not available right now. Last updated {time}." Every other action stays live (PRD FR-57). |
| SLA breached | Job card, Job detail | ▲ glyph, "Overdue by 8 min", `state-breach`. The card does not move or flash; it sorts to the top and stays legible. |
| SLA paused | Job detail | ‖ glyph, "Paused — guest DND", with who paused it and when. |
| Priority Job | Job card | Emphasis border on the start edge plus the word "Priority" (PRD FR-36). |
| Dispatch arrives while on Board | Board, dual-role | The Job enters the Now group in place, with one non-blocking notice. The Room in progress is never interrupted and never loses state. |
| Permission denied | Any | Explain, don't hide: "Only a supervisor can reassign rooms." |
| Session timed out | Global | Return to Sign in. Queued actions survive and stay attributed to the signed-out Staff Member (PRD FR-4). |
| Photo upload failed | Job detail | Retry affordance on the tile. The Job's completion is never rolled back for a failed photo. |

## Interaction Primitives

- **Tap to act.** Every core action is reachable by tap alone. No gesture is the only way to do anything.
- **Swipe** is reserved for platform-native list affordances and is always duplicated in the overflow menu.
- **Long-press** is unused. Attendants wear gloves; press-and-hold is unreliable and undiscoverable.
- **Pull-to-refresh** on Board, My Work, and Inbox only.
- **Confirm sheets** for irreversible actions only — completing a Room, closing a Job, disposing of a Lost & Found Item. Everything else is immediate and undoable.
- **Banned:** carousels, onboarding tours, celebration animations, streaks, gamified counters, badge dots without numbers, autoplaying anything, and any modal that appears without the user acting.

## Room Status Authority

Two axes, two owners, and the split is the whole design of this surface (PRD FR-19, FR-51).

- **Cleanliness is the floor's to set.** An attendant moves a Room between dirty and clean, from the clean flow or directly from Set status when no clean is involved — she found it already made, she is correcting a mistake, she is closing off a room at shift end. Inspected is a supervisor state, shown to her but locked, because a room cannot inspect itself.
- **Occupancy is Jazz Core's.** Vacant and occupied follow the PMS, and no mobile control changes them. The reason is not hierarchy, it is truth: occupancy is what the hotel has sold, and a housekeeper is not in a position to know that.
- **So a mismatch is reported, not overridden.** When a Room shows vacant and she finds luggage and a slept-in bed — the sleep, the skip, the early arrival nobody keyed — she files a **discrepancy**: what she saw, optionally a photo, routed to the front desk and her supervisor. Occupancy stays as Jazz Core has it until they resolve it.

`[NOTE FOR UX]` This is the point where a housekeeping product usually goes wrong in one of two ways: it lets attendants set occupancy, and the PMS and the floor drift apart; or it gives them no way to say "this room is not what you think", and discrepancies surface at night audit instead of at 09:00. The discrepancy path is the cheap fix and it needs an FR — see PRD FR-79.

## Offline and Sync

The behavioural centre of this app, and the pattern most likely to be got wrong.

- **Every action is optimistic and durable.** It applies locally, survives app kill and device restart, and carries the timestamp of the action rather than of the sync (PRD FR-58).
- **The user is never asked to manage sync.** No manual "sync now" as a required step; it exists in Me as a reassurance, not a duty.
- **Queued work is visible but not alarming.** A marker on the item, a counter in the header. Neutral language, `state-offline` colour, no red.
- **Conflicts are surfaced to both sides.** When a supervisor's reassignment beats a queued start, the attendant sees what happened and where their work went; the supervisor sees that an attendant had started it (PRD FR-59).
- **Nothing is ever silently discarded.** If a queued action cannot be applied, it becomes a message in Inbox with the original content intact.
- **A day's work must fit.** The device holds at least a full shift of Jobs, Rooms, notes, and queued photos without eviction.

## Internationalization and Bidirectionality

→ Mirrored reference: `mockups/mobile-key-screens.html` — H-AR (attendant board) and S-AR (supervisor floor), both Arabic, dark, offline.

- **Logical layout everywhere.** Start/end, never left/right. Mirroring is a property of the layout, not a second stylesheet.
- **Directional icons mirror; content icons do not.** Chevrons and progress arrows flip; camera, clock, and warning do not.
- **Numbers stay LTR inside RTL text.** Room numbers, times, and credit counts are bidi-isolated so "Room 1204" never renders as "4021".
- **Separators next to numerals sit inside the isolate.** Caught in the mockups: an Arabic pill reading "إعادة تنظيف · ١٩ د" rendered as "١٩٠ د" — the middot resolved against the Eastern digits and read as a zero, turning 19 minutes into 190. Any punctuation adjacent to a numeral is either inside the isolated span or dropped. In RTL a separator is not decoration; it can change the number.
- **Language is chosen before authentication** and belongs to the Staff Member, applied at sign-in on a shared device (PRD FR-61).
- **Layout survives ×1.6 string growth.** German and Portuguese expand; buttons wrap rather than truncate, and no label is baked into an image.
- **Free text is shown as entered, never machine-translated** (PRD FR-61) — a supervisor's note in Spanish stays in Spanish, with its language indicated.
- **The eight locales ship progressively** (PRD §6.3): the machinery and **Arabic** in R1, the remainder across R2–R4. Arabic is the R1 RTL proof and must be a real translation, not pseudo-localization — the point is to prove the path is real, and Arabic exercises the harder end of it (joined script, contextual letterforms, Eastern Arabic numerals as a rendering decision).
- **Numeral form is a decision, not a default.** Arabic locales may render digits as Western (1204) or Eastern Arabic (١٢٠٤). Room numbers must match what is printed on the door and what the guest says on the phone, so Room numbers, Job identifiers, and times stay Western Arabic in every locale; only free-flowing quantities follow locale convention. `[ASSUMPTION]` Confirm against the target properties.

## Shared Devices and Sessions

→ Reference: `mockups/mobile-key-screens.html` H1.

The device belongs to the Property and passes between people. Every rule below follows from that one fact, and the absence of a BYOD path is what keeps them simple: the app never reasons about device ownership, only about who is signed in right now.

- **PIN-first sign-in completing in under five seconds** (PRD FR-4). Staff perform it many times a shift; it is the most-repeated interaction in the product and its cost compounds.
- **The sign-in screen is language-neutral** — language names in their own scripts, no prose to read before choosing, because the person signing in has not yet told the app which language they read.
- **Short inactivity timeout** returns to Sign in without losing in-progress input. A handset left on a linen cart must not stay signed in as the last person who held it.
- **Sign-out clears guest names and Stay context from the device** (PRD FR-64) but **never** clears queued actions, which stay attributed to the Staff Member who took them and sync under that identity when signal returns.
- **The lock screen never carries guest identity.** A notification shows the Job and the Location; whoever picks the handset up may not be the person it was sent to (PRD FR-60).
- **Local caches are encrypted at rest**, and a remote sign-out invalidates the device session at next contact.
- **Queued work belongs to the Staff Member, never to the device** — the rule that makes a handset genuinely interchangeable mid-shift.

`[NOTE FOR UX]` Settling on Property-issued devices removes a set of questions the design could not have answered anyway — who pays for data, what happens at offboarding, whether a staff member may decline. It also puts a hardware cost on each Property that the rollout plan should carry explicitly rather than discover.

## Notifications

- Push carries the Job, the Location, and the SLA state — enough to decide whether to move without opening the app.
- Every push has an Inbox counterpart, so a missed or suppressed notification is never lost work (PRD FR-60).
- A Job accepted by someone else stops notifying immediately (PRD FR-67).
- Quiet hours are respected except for guest-impacting priority Jobs (PRD FR-68).
- `[NOTE FOR UX]` Notification volume is the fastest way to lose this audience — SM-C3 counts notifications per Staff Member per shift, and the design should treat a rising count as a defect.

## Accessibility Floor

Behavioural. Visual contrast lives in `DESIGN.md`.

- **The greyscale test is the gate.** Every state screen is reviewed with colour removed; if urgency is not readable, the screen fails (PRD NFR-6).
- TalkBack and VoiceOver: every interactive element carries role, label, and state. The SLA chip announces "Overdue by 8 minutes", not "red".
- Live SLA changes announce politely, never interrupting an in-progress announcement.
- Dynamic type to the largest accessibility setting, with reflow instead of truncation.
- All targets ≥ 48px with ≥ 8px separation; the primary action ≥ 64px.
- No information conveyed by colour, position, or motion alone.
- Screen-reader order follows visual order in both directions.

## Key Flows

- **KF-1. Rosa clears her board without calling the desk (realizes PRD UJ-1).**
  1. Rosa taps her PIN on a shared handset; the pad is already showing Tagalog because she selected it from the language row.
  2. Board opens on her 22 credits, departures first, the next Room at the top with "Departure · Not started".
  3. She opens 1204, taps **Start** in the thumb zone, and cleans.
  4. She finds a cracked mirror, taps **Raise**, picks "Damage — bathroom", takes one photo, and returns to the room — two taps and a shutter, no supervisor, no phone call. The Work Order is on its way to Engineering; her Room state is untouched.
  5. She taps **Complete**; the confirm sheet names the Room; the card moves to done and the PMS learns it through Jazz Core.
  6. **Climax:** in the stairwell she marks 1206 DND with no signal at all. The card shows "Waiting to send" and the header shows "1 queued" — her work is real to her immediately, and it lands when she reaches the corridor.

- **KF-2. Miguel sees the AC unit's history before he touches it (realizes PRD UJ-3).**
  1. Push: "Priority · Room 1518 · Hot/cold · 20 min". He accepts from the notification.
  2. Job detail opens with the SLA chip counting and an **Asset history** row: "Fan-coil unit · 4 work orders in 90 days".
  3. He opens the history, reads four closures of "recharged", and works the Job.
  4. He completes it, and completion requires a root cause: he picks "Recurring — suspect coil" from the list and links the prior Work Orders.
  5. **Climax:** the Asset is flagged for the Chief Engineer that evening rather than after the fifth guest complaint. If the Room must come out of service, he sets OOO from the same screen and Jazz Core stops it being sold.

- **KF-3. Ana receives six rooms mid-shift without losing what she started (realizes PRD UJ-4, from the receiving side).**
  1. Ana is mid-Room when six Rooms arrive from another attendant's board.
  2. A single non-blocking notice: "6 rooms added to your board." Her current Room is untouched and stays in progress.
  3. The new Rooms carry the originating attendant's notes and any Faults already raised; one was already started and shows "Started by Rosa 10:12".
  4. Her credit total updates on the Board header.
  5. **Climax:** nothing she was doing was interrupted, and no context was lost in the handover — the failure mode this flow exists to prevent.

## Alignment with the Jazzware visual identity

The palette is Jazzware's, and the sign-in screen carries the brand's petrol→steel gradient and two-tone wordmark — Jazz in white, Ticketing in cyan — so the first screen of a shift places the app in the family (`DESIGN.md.Colors`, `DESIGN.md.Components`).

JazzTicketing is the real ticketing product; there is no shipped ticketing surface for it to reconcile with, so the vocabulary in the PRD Glossary stands as authored — **Job**, **Request**, **Work Order**, **Room Assignment** — and urgency is modelled as SLA Target plus the guest-impacting fast path (PRD FR-36) without inheriting an external scale.

## Open Questions

None outstanding for the mobile spine.

*Resolved 2026-08-29:* the R1 RTL locale is **Arabic**; Supervisor Floor ships on **both** mobile and the web console with the division of labour above; **Lost & Found capture waits for R4**; the device model is **Property-issued Shared Devices with no BYOD path**; and a dual-role Staff Member lands on **Board with a Now group** carrying dispatched Jobs.

Two related items sit outside this spine and are carried in the PRD: the Jazz Core SLO, and confirmation of the baseline device class now that the Property is buying the hardware.

## Assumptions Index

- Foundation — component library built on platform primitives rather than an adopted UI system.
- Shared Devices and Sessions — the inactivity timeout length is proposed, not measured; too short is friction, too long is a signed-in handset on a cart. Confirm with staff at the first Property.
- IA — the Now group is a designer decision, not a researched one. It is the single piece of this design most worth putting in front of real dual-role staff at the first demo.
- Foundation / IA — role determines the home surface; Attendant → Board, Engineer/Runner → My Work, Supervisor → Floor.
- `DESIGN.md` — palette sourced from a Jazzware visual reference image rather than a design-system file; confirm exact token values against the real system if one exists.
- Whole spine — authored on Fast path from the PRD without line-staff research, which is the acknowledged consequence of having no design partner (PRD RO-1).
