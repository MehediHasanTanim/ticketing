---
title: "Addendum — JazzTicketing PRD"
status: draft
created: 2026-08-29
updated: 2026-08-29
---

# Addendum

Technical-how, mechanism decisions, and downstream handoff material deliberately kept out of the PRD. Nothing here is decided.

## A. Decisions handed to architecture (Winston)

1. **Property-side survivability (NFR-2) — the consequential one.** Options: (a) cloud-only with rich client-side offline queueing; (b) a lightweight Property-side agent that terminates Adapter traffic and serves a local cache during WAN loss; (c) hybrid — agent for Adapter traffic only, clients cloud-direct. Trade space: hotel WAN reliability, support burden of on-property software (which Jazzware already carries for adapters), data consistency on reconnection, and whether an offline Property must be able to dispatch between staff with no cloud reachable. Decide before any story is written; it changes the client, the sync model, and the deployment story.
2. **Tenancy isolation.** Shared schema with Tenant discriminator, schema-per-Tenant, or database-per-Tenant. Drivers: 200-Property Tenants (NFR-4), per-Tenant retention and erasure (DG-2, DG-3), residency (DG-4), and the blast radius a hotel customer will ask about.
3. **Jazz Core integration topology.** Transport and interaction style against the Jazz Core API (event stream, webhooks, polling, or a mix), per-Property credential issuance and rotation, contract versioning and pinning (FR-77), capability negotiation (FR-78), and how FR-49 health telemetry distinguishes JazzTicketing-side from Jazz Core-side failure. Constrained by whatever Jazz Core actually offers — Open Question 1 must be answered before this can be designed rather than guessed.
   **8. Multi-region topology (new, confirmed requirement).** DG-4 commits the platform to multi-region at launch. Open: region-per-Tenant or region-per-Property placement, how a Tenant spanning regions serves FR-76's cross-Property views without relocating guest-identifying data, where the control plane lives, and — the seam that matters — what happens when Jazz Core's own regionality does not match (Open Question 3). Multi-region interacts with every other decision here, especially tenancy isolation (2) and survivability (1); it should be decided early rather than layered on.
   **9. Bidirectional layout (new).** Two RTL locales (FR-61) make bidirectionality a foundation-level concern for both surfaces: layout system, component library, iconography with direction, and the mixed-direction case (LTR Room numbers inside RTL sentences). Cheap if chosen at the start, a layout-layer rebuild if deferred.
4. **Real-time delivery.** Mechanism for FR-18/FR-27/FR-69 live views and FR-60 push under NFR-3, including behavior on restrictive hotel Wi-Fi egress.
5. **Offline conflict model (FR-59).** Per-action resolution semantics, clock-skew handling for FR-58's action timestamps, and the durable local store.
6. **Stack.** Web console, mobile (shared vs. native), backend, datastore. Left fully open per the brief; the mobile decision is constrained mainly by NFR-5's device class and the offline requirement.
7. **Regionality.** Single-region vs. multi-region at launch, following DG-4.

## B. Data model notes for architecture and UX

- **Job as a supertype.** Request and Work Order share lifecycle, SLA, assignment, escalation, and attachments. Room Assignment is deliberately *not* a Job — a board is workload allocation, not dispatch — but a dispatched individual room clean is. Getting this boundary wrong produces either a housekeeping module that cannot be dispatched into or a Job table that means three different things.
- **Location hierarchy** must carry Rooms, floors, public areas, outlets, and back-of-house, since FR-39 and FR-72 report across them.
- **Asset identity survives Location change** (FR-31) — history follows the unit, not the room.
- **Stay is a projection of Jazz Core truth**, never authored in JazzTicketing. Everything guest-linked hangs off it, which is what makes DG-3 erasure tractable.
- **SLA measurement is an event-sourced property of a Job**, not a stored countdown: pauses, reassignment, and offline sync all rewrite elapsed time, and NFR-9 requires it be recomputable from timestamps alone.

## C. UX handoff notes (Sally)

- Two design systems will be tempting; resist. One system, two densities: console (dense, multi-pane, keyboard-driven — FR-7's fifteen seconds is a keyboard target, not a mouse one) and mobile (single-hand, glove-tolerant, high-contrast for dim corridors).
- The attendant's board (UJ-1) and the operator's request panel (UJ-2) are the two screens the product lives or dies on. Prototype both before anything else.
- SLA state must survive colour-blindness and dim light (NFR-6) — shape, position, and text, not just red/amber/green.
- Shared Device sign-in (FR-4) is a UX problem before it is a security one: a five-second sign-in that staff perform twenty times a shift is a minute a day of pure friction.
- Language switching (FR-61) applies at sign-in, so the sign-in screen itself must be language-neutral or multi-lingual.

## D. Epic-shaping notes (for bmad-create-epics-and-stories)

Superseded by the release slicing now written into PRD §6.3, which this section should be read against rather than alongside. Within R1 the dependency order is: (1) tenancy, identity, configuration, audit; (2) Job core — lifecycle, SLA engine, assignment, escalation, notification; (3) the Jazz Core integration layer, started in parallel with (2) and exercised against a Jazz Core test environment from the first week, because it now carries the plan's largest unknown; (4) mobile foundation, with i18n and RTL machinery included rather than deferred; (5) guest request dispatch as R1's spine; (6) FR-69, FR-71 and FR-74 reporting, inside R1 rather than after it.

Two sequencing risks, both now sharper than in the first draft:
- Reporting and adoption instrumentation are the classic v1 casualties, and SM-2, SM-3, SM-9 and RO-2 all become unclaimable without them. R1 must carry them.
- The Jazz Core work package (Open Question 1) may not be JazzTicketing's to schedule. If Jazz Core capability lands late, R1 has no demonstrable spine — the entire thesis is undemonstrable. Sequence Jazz Core capability verification *before* committing R1's date, not during it.

## E'. Dependency risk register (new — Jazz Core)

| Risk | Mechanism | Mitigation to decide now |
|---|---|---|
| Jazz Core lacks a required capability | §4.6 FRs unbuildable; thesis undemonstrable | Answer Open Question 1 before architecture; scope the Jazz Core work package explicitly in the pitch rather than absorbing it |
| Jazz Core roadmap does not prioritize this | JazzTicketing blocked by another team's backlog | Secure the Jazz Core owner as a named stakeholder (PRD §10) before funding, not after |
| No agreed SLO | Two-team incident triage with no owner; FR-50 target unfounded | Agree availability, latency, and escalation model (Open Question 2) as a condition of proceeding |
| Jazz Core regionality mismatches DG-4 | Residency guarantee breaks at the seam | Answer Open Question 3 before topology is designed |
| No Jazz Core test environment | FR-77 contract tests impossible; R1 not demonstrable (SM-9) | Treat as a joint prerequisite deliverable with a named owner |

## E. Deferred with intent

- Financial posting of Recoveries (v2) — depends on FR-42 data proving accurate in practice.
- AI triage and prediction (v2/v3) — the FR set is deliberately shaped so the training data exists: Catalog Entry, duration, Location, Asset, root cause, and outcome are all captured from day one.
- Locales beyond R1's English plus one RTL locale — the machinery ships in R1, the translations arrive across R2–R4 (PRD §6.3).
- Cross-Tenant benchmarking — commercially attractive, governance-expensive; not v1.
