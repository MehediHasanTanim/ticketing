---
name: JazzTicketing Web Console
status: final
updated: 2026-09-02
sources:
  - "{planning_artifacts}/prds/prd-JazzTicketing-2026-08-29/prd.md"
  - "./EXPERIENCE.md"
  - "./DESIGN.md"
---

# JazzTicketing Web Console — Experience Spine

The manager and front-office surface. `DESIGN.md` owns the visual identity for **both** surfaces — one token set, two densities — and `EXPERIENCE.md` owns the mobile behaviour. This file owns console behaviour only. All three win over any mock.

## Foundation

Desktop browser, 1280px design width, 1440px comfortable, degrading to 1024 with the navigation collapsed to an icon rail. Not responsive down to a phone: the phone already has a better app, and a console squeezed onto 390px is how you get a product that is bad at both. Tablet lands on the console layout at 1024.

Corporate and management users authenticate through the Tenant's identity provider (PRD FR-3); property users who have no SSO get username and password. No PIN path here — PIN belongs to shared handsets.

Four conditions shape the console, and they are the inverse of mobile's:

1. **Sessions are long and seated.** An operator holds Dispatch open for an eight-hour shift. Layout stability matters more than motion; nothing reflows under the cursor.
2. **Keyboard beats mouse.** The 15-second Request (PRD FR-7) is a keyboard target. Every high-frequency action has a shortcut and no core action requires drag-and-drop.
3. **Density is a feature.** A manager wants forty rows visible, not eight. Comfort comes from alignment and rhythm, not whitespace.
4. **These users read numbers.** Tabular figures, medians before means, and every figure drills through to the records behind it.

## Information Architecture

| Surface | Reached from | Purpose | Primary role |
|---|---|---|---|
| Dispatch | Nav · home for front office | Live call panel + open jobs; log a Request against a Room in seconds | Operator, front desk |
| All jobs | Dispatch header | Every open Job, filtered by Department, SLA state, assignment; multi-select actions | Supervisor, duty manager |
| Job detail | Any job row | Drawer: full record, timeline, escalations, attachments, actions | All |
| Assign | Any unassigned job, single or multi-select | Ranked candidates by load and proximity, skill stated, or a department queue | Supervisor, duty manager |
| Housekeeping | Nav | Property-wide Room Status, arrivals vs readiness, not-ready list | Executive Housekeeper |
| Floor plan | Housekeeping · Grid/Plan toggle | The same rooms in corridor positions — the walk, not a sorted list | Supervisor, Executive Housekeeper |
| Boards | Housekeeping header | Build and balance Room Assignments by Credits; turndown pass | Executive Housekeeper, supervisor |
| Engineering | Nav | Reactive queue beside the preventive schedule | Chief Engineer |
| Asset | Any asset reference | Work Order history, recurring-fault flag, parts, room-nights lost | Chief Engineer, GM |
| Incidents | Nav | Glitch log, linked causes, Recovery with approval routing | Duty Manager, GM |
| Stay | Guest or room lookup | One guest's stay on a single clock | Front desk, duty manager |
| Dashboard | Nav | Shift state first, trend second, every figure drillable | GM, Director of Ops |
| Reports | Nav | Response and SLA against the Property's own baseline; exports | GM, department managers |
| Configuration | Nav · setup | Catalog, SLA, pauses, escalation, Credits, checklists, roles, notifications | Property administrator |
| Jazz Core | Nav · setup | Connection health, per-Property capability negotiation, conflicts | Property administrator |
| Sign in | Unauthenticated | SSO first, password fallback, property picker | All |
| Users | Nav · administration | Who exists, how they authenticate, their roles per property | Property / tenant administrator |
| Add a person | Users header | Invite by email, or create a PIN account for staff with no mailbox | Property / tenant administrator |
| Roster import | Users header | Explicit column mapping, row validation, preview before anything is written | Property / tenant administrator |
| User detail | Users row | Identity, skills, per-property access grants, offboarding | Property / tenant administrator |
| Roles | Nav · administration | Permissions matrix across the shipped role set | Tenant administrator |
| Role editor | Roles · New / Duplicate | Define or adapt a role, with dependency and escalation guards | Tenant administrator |
| Tenant settings | Nav · administration | Tenant identity, SSO, the defaults properties inherit, governance | Tenant administrator |
| Properties | Tenant settings · Properties tab | Tenancy, regions and residency, tenant defaults, onboarding state | Tenant administrator |
| Add property | Properties header | Create a property; region and Jazz Core identity are permanent | Tenant administrator |
| Property setup | Properties · Continue setup | Onboarding checklist split into blocking, recommended and optional | Property / tenant administrator |
| Property detail | Properties row · Open | What this property overrides, who can see it, its governance settings | Property administrator |
| Audit log | Nav · administration | Every state and configuration change with actor and previous value | Property / tenant administrator |

Left navigation is persistent and grouped Operations / Insight / Setup / Administration, because those are three different jobs and three different frequencies. Badge counts appear only where a number changes a decision — open dispatch load, and incidents awaiting a decision.

→ Composition reference: `mockups/web-key-screens.html` (W1–W35, plus W-AR). Spine wins on conflict.

## The Floor split — console half

Mobile Floor and console Housekeeping are one surface family on two form factors, and the division is fixed (see `EXPERIENCE.md.Information Architecture`):

- **Mobile** is for acting while walking: one floor, what is stuck, move a handful of rooms, open a room.
- **Console** is for planning the whole property: every floor at once, arrivals against readiness, board construction by Credits, bulk reassignment, turndown generation, print.

They share data, vocabulary and state semantics. They do **not** share layout, and the console grid is never rendered on a phone.

## Authentication

- **SSO is the primary path** and the button that looks like the primary action (PRD FR-3). Password is the fallback for property accounts a tenant has not federated, and it is visually secondary rather than hidden — hiding it produces support calls.
- **No PIN on the console.** PIN is the shared-handset credential; offering both on one screen teaches nobody which is theirs.
- The property picker appears only for a user with access to more than one, and the region is stated at sign-in because it is a residency fact, not a detail (PRD DG-4).
- Sign-in never asks for a PMS, PBX or payment credential, and says so — a hotel has been phished with a screen that looked like this one.

## Floor plan — a schematic, not a drawing

The Grid view is the default and needs no setup: rooms in numeric order, correct at every property from day one. The **Plan** view is the opt-in peer that shows the same rooms in corridor positions — odd numbers one side, even the other, the service core and lift bank where they physically are — so a supervisor sees the walk rather than a sorted list.

It is deliberately *not* an architectural floor plan. It is generated from a per-floor layout — wing, corridor side, sequence, and where service rooms sit — which is Location configuration somebody enters once per floor (PRD FR-80). That is real onboarding cost, so:

- Grid stays the default view; Plan is available where the layout has been entered and simply absent where it has not.
- The layout is data, not artwork: no CAD import, no drawing canvas, no per-property design work in v1.
- `[NOTE FOR UX]` A layout editor is the natural companion screen and is **not** designed. Until it exists, layouts arrive by import or by a support-assisted setup, and that should be an explicit onboarding step rather than a surprise.

## Administration

Administration is a distinct navigation group because its frequency and its risk are both different from operations: it is touched rarely and it decides what everyone else can do.

- **Access is granted per Property and per role**, never globally (PRD FR-2). One person may be an attendant at one hotel and a supervisor at another, and every surface shows that rather than flattening it to one label.
- **The role matrix is the primary artefact**, because an administrator's real question is comparative — who can approve a recovery, who can override an inspection.
- **Permission is enforced server-side.** Hiding a control is never the security boundary; the interface hides what it can and the server refuses regardless.
- **Two governance rows are load-bearing** and stated on the matrix: corporate viewers never see guest identity, so a cross-property view cannot become a guest database (PRD FR-76, DG-1); and line staff see a guest name only inside a job they are assigned, never in a list.
- **Offboarding is one action** that revokes access and ends sessions everywhere, because a partially offboarded account is the failure that gets noticed at audit.
- **Overrides are highlighted in the audit log**, not buried. An inspection passed without a re-check is legitimate and also the entry an auditor asks about first.

## Two audiences, two products

PRD FR-1 reads "An administrator can create a Tenant and Properties under it." That single sentence names two different actors, and treating them as one would put a commercial function inside the hotel's app.

- **A Tenant is a commercial customer.** Creating one creates a customer and its first administrator, so it is a **Jazzware function on a Jazzware-internal surface** (W35), reachable by no hotel-side role. It looks different on purpose — different brand, different navigation, an amber accent instead of petrol — because an internal tool that looks like the customer product is how someone acts in the wrong context.
- **Everything below the Tenant belongs to the customer.** A tenant administrator creates properties, connects identity, sets defaults, grants access and configures governance (W34). Jazzware does not configure a customer's properties for them, and provisioning grants Jazzware no standing access to their data — support access is separately requested, time-boxed, and appears in the customer's own audit log.

`[NOTE FOR UX]` The internal surface is sketched here to make the boundary explicit and to stop tenant creation leaking into the hotel product. It is **not** a designed internal tool: fleet health, usage, support-access request flows and Jazz Core org management are named in its navigation and undesigned. If Jazzware wants that console, it is its own project.

## Tenant settings and inheritance

- **Every default states how many properties inherit it.** That count is the blast radius of the edit, and it is the only number that makes "change the tenant default" a safe decision.
- **A property that overrides a default stops inheriting it** — silently re-inheriting on a later tenant change would be worse than either behaviour, so overrides are sticky and visible from both sides (W33 shows the property's half).
- **Regions are summarised, never set here.** A tenant may span regions; a property may not. Region is chosen at property creation and permanent from then (DG-4).
- **Just-in-time SSO provisioning is off by default.** Someone who can authenticate is not automatically someone who should see a property — access stays a deliberate grant (FR-2, FR-3).
- **Cross-property guest history is a lawful-basis decision, not a toggle**, and the interface says so with the administrator's name attached to the change (FR-45).

## Role editing — the two guards

Tenant administrators can define roles (PRD FR-81), which means the interface has to assume an administrator who is careless or hostile rather than one who is careful.

- **Dependency guard.** A permission that requires another cannot be granted while that other is off, and the requirement is stated on the row ("Requires: inspect rooms") rather than enforced silently. Overriding an inspection without being able to inspect is not a coherent role.
- **Privilege-escalation guard.** An administrator cannot grant a role a permission they do not themselves hold. The row is visible, disabled, and says why — hiding it would just produce a support ticket, and allowing it would let any tenant admin mint themselves a superuser.
- **Shipped roles are duplicable, not editable.** A property that needs a variation gets a copy; the shipped set stays a known baseline that support can reason about.
- **A duplicate is independent from creation.** Later changes to its source do not flow in, and the screen says so — two roles that silently drift apart is the most common mess in a permissions model.
- **Blast radius before saving.** How many people hold this role and what they gain or lose. A role that affects nobody yet says that too.
- **Permission is enforced server-side.** Every guard above is a courtesy to the administrator; the boundary is the server (PRD FR-2).

## Bulk import — mapping is the whole job

- **Columns are mapped explicitly, never guessed.** A wrong auto-mapping that nobody reviewed is worse than a blank one.
- **Refused columns are refused, not skipped.** Payroll identifiers, dates of birth and similar are named as not imported, because "we'll just store it" is how a service-operations tool acquires an HR data problem (DG-1).
- **Validation before writing.** Problem rows are shown as rows with a proposed fix, not as an error count. A partial import — take the 151, handle 3 by hand — is a first-class outcome.
- **Line staff arrive as PIN accounts.** Most rows have no email, and the import says how many, because an administrator expecting 154 mailboxes should be corrected before the send, not after.
- **The import is audited** with file name and row count (PRD FR-6).

## Property lifecycle

- **Two fields are permanent and the form says so:** region, because it is a residency commitment that means a cross-region migration to undo (DG-4); and the Jazz Core property identity, because a wrong one is not a typo, it is a different hotel.
- **Setup separates blocking from recommended from optional.** Time-to-first-job is the metric this product is sold on (SM-1), so the surface shows what is actually in the way rather than a completion percentage.
- **Going live is a deliberate action**, never a side effect of finishing the checklist — a configured property is not a trained one.
- **Property detail holds no settings of its own.** It states what has been overridden and links to the surface that owns each thing, so there is exactly one place to change any given value.

## Component Patterns

Behavioural. Visual specs live in `DESIGN.md.Web console`.

| Component | Use | Behavioural rules |
|---|---|---|
| Data table | Every list surface | Sticky header. Row click opens the drawer, never navigates away. Sortable columns; sort is a user preference and persists per surface. Column set is fixed in v1 — no column chooser. |
| Row state | Data table | A Job's own state (priority, breach) is rendered on the row and **outranks** transient UI state. Selection may never mask it. |
| Filter row | Every list surface | One row above the table, chips for values plus a segmented control for time scope. Filters are URL state so a manager can send a colleague the exact view. |
| Drawer | Job, asset, stay detail | 520px, opens over the list, keeps context behind. One level deep. Escape closes; the list keeps its scroll position and selection. |
| Bulk action bar | Table with selection | Appears only with a selection. Names the count in every verb ("Assign 2 jobs"). Destructive bulk actions require a confirm naming the count. |
| Panel | Layout unit | Titled, hairline-bordered, fills available height. A panel whose data has a freshness or completeness caveat states it inside itself, not in a tooltip. |
| KPI tile | Dashboard, section headers | A number, its label, and one line of context. Drills through to the records. Never a sparkline inside the tile in v1. |
| Timeline | Job, stay, configuration history | Chronological, actor and clock on every entry, terminal states marked. This is the artefact a dispute is settled from. |
| Form field | Configuration, incident | Label above, value in the field, constraint stated beneath rather than in a placeholder. |
| Command palette | Global ⌘K | Rooms, jobs, guests, and navigation in one input. |
| Modal | Create and assign flows | Centred, 720px, one level, never over a drawer. Used where a task has its own beginning and end (a new catalog entry, an assignment) rather than inspecting something. |
| Permissions matrix | Roles | Roles as columns, permissions as rows; grant state is a glyph plus a word, never a colour alone. Scrolls horizontally inside its own container. |
| Access grant row | User detail, Add a person | One row per Property, revocable individually. Shows the role and its grant date. At least one grant is required to create a user. |
| Permission toggle | Role editor | Grant state plus, where relevant, a dependency or escalation reason beneath the label. A blocked toggle is visible and disabled with its reason, never hidden. |
| Column mapper | Roster import | Source column, arrow, destination field. Refused destinations are stated as refused rather than omitted. |
| Setup checklist | Property setup | Steps grouped by whether they block go-live. Each row carries its own action; the group heading carries the consequence. |
| Diff table | Duplicate role | Before, after, and a verdict column. Shows only what differs plus a count of what does not. |
| Floor plan tile | Floor plan | Smaller than a grid tile and positioned by layout, not by sort order. Same state vocabulary as the grid — a tile never means something different in one view than the other. |

## State Patterns

| State | Treatment |
|---|---|
| Loading a list | Skeleton rows, header and filters already interactive. Never a full-page spinner. |
| Empty by filter | "No jobs match these filters" plus a one-click clear. Distinct from genuinely empty. |
| Genuinely empty | States the good news plainly: "No open jobs. 14 closed today." |
| SLA breach | ▲ glyph, elapsed overdue time, red row edge; sorts to the top and does not move again. Never flashes. |
| Paused | ‖ glyph, accumulated pause, and who paused it. Paused time is visually separated from active time. |
| Unassigned | Rendered as a state, not a blank cell — the only state where nobody owns the work. |
| Incomplete data | A Department below the adoption threshold is marked incomplete **wherever its figures appear** (PRD FR-74), and the marker cannot be dismissed from within reporting. |
| Jazz Core degraded | The dependent affordance is hidden with a stated reason in Jazz Core health, not left to fail on click (PRD FR-78). |
| Stale panel | Every live panel names its own freshness. A stale number is worse than no number. |
| Permission denied | Explain, never hide: "Only the GM can approve a recovery above USD 150." |
| Configuration saved | States the blast radius: which future jobs are affected, and that running clocks are untouched (PRD FR-5). |

## Interaction Primitives

- **Keyboard first.** `⌘K` command palette · `/` focus filter · `↵` submit the Request in Dispatch · `⌥N` another Request for the same Room · `J`/`K` move row selection · `Space` toggle selection · `Esc` close drawer. Every shortcut is discoverable in the surface that uses it, not only in a help page.
- **Click a row to inspect, never to act.** Actions are explicit controls. Nothing destructive is one stray click away.
- **No drag-and-drop dependency.** Board reassignment is a table and a picker, because a night manager on a laptop trackpad must be able to do it (and because drag-and-drop is hostile to keyboards and screen readers).
- **Filters are URL state.** A view is a link.
- **Hover reveals, never gates.** Tooltips add detail; they never carry the only copy of something.
- **Banned:** modal stacking, auto-refresh that moves rows under the cursor, infinite scroll on operational lists (pagination with counts), toast-only confirmation of irreversible actions.

## Data Display and Charts

Applied from the `dataviz` method; the reasoning matters more than the specific charts.

- **The form follows the job.** Shift state is stat tiles and tables — not charts. Charts appear only where change over time or comparison across categories is the actual question.
- **One series plus a labelled baseline, not two competing lines.** SLA compliance is a single petrol series with the Property's pre-launch baseline as a dashed, directly-labelled reference. Validating petrol and grey as a *categorical pair* fails, correctly — a baseline is context, not a co-equal series.
- **Magnitude across categories is one hue.** Open jobs by department are equal-weight petrol bars; department names are labels, not colours. Colouring six departments six ways is decoration that costs a colour language.
- **Status hues are reserved.** Green, orange, red and indigo mean within-target, approaching, breached and queued. They are never reused as chart series, and they always ship with a glyph and a word.
- **No dual axes, ever.** Two measures of different scale become two charts.
- **Every chart has a table view** and states its own freshness. Medians and percentiles are shown alongside any mean.

## Accessibility Floor

- WCAG 2.1 AA (PRD NFR-6). Reviewed in greyscale like the mobile surface — a dense table is where colour-only state does the most damage.
- Full keyboard operability including the drawer, the command palette, and every bulk action; visible focus everywhere.
- Tables use real table semantics with scoped headers; sortable columns announce their state.
- The drawer traps focus and returns it to the originating row on close.
- Charts carry an accessible summary and a table view; no figure is colour-only.
- Text at 200% zoom and 400% reflow without loss of function.

## Internationalization and Bidirectionality

- The console mirrors wholesale: navigation, table column order, filter row, drawer side, and progress direction. Authored in logical properties, exactly as mobile.
- **Numerals follow the mobile rule** (`EXPERIENCE.md`): Job identifiers, Room numbers and clock times stay Western in every locale so they match the door, the phone call and the printed board. Separators next to a numeral sit inside the isolate.
- Dense tables are the hard case for mirroring — a column that reads right-to-left while its numbers read left-to-right is where alignment breaks. Numeric columns stay end-aligned in both directions.

## Key Flows

- **WF-1. Arif logs a Request in eleven seconds without leaving the call (realizes PRD UJ-2).**
  Jazz Core reports the call; Dispatch already shows Room 0812 with the guest, stay and language resolved. He types `iron`, the catalog matches "Iron and board" and fills Department, SLA and median duration. He presses `↵`. **Climax:** he tells the guest "about ten minutes" — a number he did not have to guess — and the runner's phone buzzes before he hangs up. **Edge case:** no acceptance inside the window escalates, and the row turns red on his own open list.

- **WF-2. Nadia triages the shift in ninety seconds.**
  She opens Dashboard at 11:52. Three breaches, four rooms not ready against fourteen arrivals, one recovery awaiting her approval. She works the Needs-attention list top-down: assigns the breached hot/cold, opens the board blocking 1204, approves the USD 320 recovery. **Climax:** the shift is recoverable because she saw it at 11:52 rather than in tomorrow's report. **Edge case:** F&B's figures are marked incomplete because its mobile adoption is 41%, so she does not act on them — the dashboard tells her the number is not trustworthy instead of letting her believe it.

## Open Questions

1. Does the console need a Lost & Found register surface in R4, or does the mobile capture plus the Stay view cover it?
2. Corporate cross-Property comparison (PRD FR-76) is specified but not designed — it is the one surface that needs the Tenant-level metric definitions settled first.
3. Print: boards and the brand evidence pack are printed in practice. Does v1 ship real print stylesheets or PDF export only?
4. Column chooser — deliberately out of v1. Confirm that a fixed column set survives contact with a chief engineer.
5. Floor layout editor (see `Floor plan`) — needed if Plan view ships beyond a handful of properties; not designed.

*Resolved 2026-09-02:* the tenant self-service **role editor is in v1** (PRD FR-81) and the **roster import mapping step is designed** (PRD FR-82). Both were confirmed by Tanim and are drawn as W29/W30 and W28.

## Assumptions Index

- Foundation — 1280px design width and no phone-width console; tablet lands on the console layout.
- Foundation — property users without SSO use username and password; no PIN on the console.
- Component Patterns — fixed column sets in v1 (Open Question 4).
- Data Display — stat tiles carry no sparklines in v1.
- Whole spine — authored on Fast path from the PRD without operator or manager research, the same consequence of having no design partner as the mobile spine (PRD RO-1).
