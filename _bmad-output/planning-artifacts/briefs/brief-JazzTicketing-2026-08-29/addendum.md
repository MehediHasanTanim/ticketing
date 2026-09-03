---
title: "Addendum — JazzTicketing Product Brief"
status: draft
created: 2026-08-29
updated: 2026-08-29
---

# Addendum

Depth that belongs downstream (PRD, UX, architecture) rather than in the brief. Nothing here is decided; it is carried forward so it is not re-derived.

## 1. Module decomposition (input to the PRD's epic breakdown)

**Guest request dispatch**
Intake from front desk, telephone operator, staff-reported, and PBX guest call. Request catalog with department, default SLA, and default duration. Routing by department + skill + current load. Lifecycle: logged → dispatched → accepted → in progress → completed → verified/closed. SLA clock with pause conditions (DND, guest not in room). Escalation chain on breach (supervisor → duty manager → GM). Guest follow-up prompt and satisfaction capture. Repeat-request detection on the same room/stay.

**Housekeeping operations**
Room status model and PMS sync (vacant/occupied × dirty/clean/inspected, out of order, out of service). Board generation and credit-based assignment. Attendant mobile flow: room list, start, DND, refuse service, complete, request inspection. Supervisor inspection with scored checklist. Turndown as a second pass. Linen and amenity requests as dispatchable jobs. Departure-priority queue driven by arrivals.

**Engineering / work orders**
Reactive work orders from any source. Preventive maintenance schedules by asset class, with generation rules (calendar, runtime, occupancy). Asset registry keyed to location, with full fault history and recurring-fault flagging. Rooms out of order / out of service, with PMS write-back. Parts on hand and consumption per work order. Hot/cold and other guest-impacting fault fast-paths.

**Incidents, lost & found, glitch tracking**
Glitch log with category, severity, department at fault, and guest impact. Guest-recovery workflow with compensation logging and approval threshold. Root-cause coding and periodic review report. Lost & found register: found → stored → matched → returned/disposed, with chain of custody, photo, and storage location. Complaint-to-glitch linkage from the request record.

**Cross-cutting**
Tenancy (brand → management company → property → department → team → user), role and permission model, per-property configuration of SLAs and escalation, notification routing (push, in-app, email, optional SMS), audit trail on every state change, multi-language UI, and reporting/exports.

## 2. Integration surface (input to architecture)

- **PMS:** room status two-way, guest profile and stay context, arrivals/departures/room moves, out-of-order write-back, folio posting where compensation is involved. Oracle OPERA (OHIP/OXI-class interfaces), Infor, Agilysys and others as the account base requires. [ASSUMPTION] — confirm which PMSs the Jazzware base actually runs.
- **PBX / telephony:** guest-room call to ticket, wake-up calls, minibar and room-status posting via phone codes, staff callback. This is the Jazzware-native surface and the differentiator; it deserves its own architecture section.
- **Messaging:** outbound guest follow-up over whatever channel the property already runs; no new guest app in v1.
- **Identity:** SSO for corporate users; simple device-friendly auth (PIN or badge) for line staff who share devices.
- **Deferred:** BMS/IoT sensors, door locks, energy management, POS, CRM/CDP, BI export.

## 3. Non-functional constraints to pin down in architecture

Availability expectations during a full house; behavior when the property loses WAN connectivity (this decides the on-property agent question); offline-first data model and conflict resolution on mobile; data residency for guest data across regions and GDPR handling; retention of guest-linked records; per-property performance at peak (checkout window, evening turndown); shared-device session model; brand-audit evidence export.

## 4. Risks and how they would kill this

| Risk | Why it bites | Early signal to watch |
|---|---|---|
| Line-staff adoption | If room attendants do not open the app, the data is fiction and every metric collapses | Mobile DAU in the first two design-partner properties |
| Scope gravity toward parity | Chasing a decade of incumbent features drains the schedule and delivers nothing distinctive | Epic count growth between PRD and sprint 1 |
| Integration is a project after all | If the adapter advantage does not translate to days-not-months, the wedge is gone | Time-to-first-ticket at design partner #1 |
| Incumbent bundling | An incumbent bundled into a PMS or brand-mandated stack can foreclose the account regardless of merit | Brand-standard mandates surfacing in early sales conversations |
| Multi-tenancy retrofitted late | Tenancy isolation bolted on after v1 is a rewrite | Whether the tenancy model is settled before the first story ships |
| Support model | 24/7 operational software carries a support burden a project team does not | Whether an on-call model is costed in the pitch |

## 5. Open questions for Tanim

1. Which PMS and PBX platforms does the Jazzware base actually run, and how many properties are addressable on day one?
2. Is there a named design-partner property, or does the pitch have to create one?
3. Does Jazzware have an existing relationship with Knowcross/HotSOS that this would disturb? (Prior Knowcross API integration work suggests a live commercial relationship worth naming explicitly in an internal pitch.)
4. Team and timeline assumed for the pitch — is this the existing team, a carve-out, or new headcount?
5. Commercial model: per room, per property, per user, or bundled into an existing Jazzware contract?
6. Brand-standard or certification requirements (major-brand vendor approval) that gate entry at the target properties?

## 6. Competitor notes — UNVALIDATED

Web research was unavailable in this session (search proxy returned 403; page fetch approval timed out). The following are working assumptions from general industry knowledge and must be validated before this brief is shown to management:

- **HotSOS** — Amadeus's hospitality service-optimization product; strong in upper-upscale and luxury, deep PMS ties, generally sold and deployed as an enterprise project.
- **Knowcross / HubOS** — service, housekeeping, glitch and lost-and-found modules; HubOS as the more recent platform generation. Ownership and current positioning need confirming.
- **Quore** — mid-scale and select-service strength in North America, mobile-forward, brand-approved at major flags.
- **Adjacent:** Alice, Optii (housekeeping optimization), Flexkeeping, Hotelkit, Xenia, and PMS-native task modules that erode the low end.

Validate: current ownership, module scope, mobile capability, published pricing or pricing model, integration approach, and named brand mandates. `bmad-deep-recon` (market type) is the right tool once network access is available.
