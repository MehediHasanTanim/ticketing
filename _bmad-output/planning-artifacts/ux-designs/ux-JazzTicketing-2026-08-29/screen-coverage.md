---
name: screen-coverage
description: PRD functional-requirement coverage against the designed mobile and console screens
type: audit
updated: 2026-09-02
---

# Screen coverage — PRD vs designed screens

Audited 2026-09-02 by extracting every `FR-n` from `prd.md` and every screen→FR citation from the two generators. **83 functional requirements · 80 with a designed surface · 3 deliberately deferred · 0 platform behaviour with no screen of its own · 0 open gaps.**

Re-run the audit after any change to the PRD or either generator — the citations in the evidence tables are what make it computable, so a new screen must cite the FRs it realises.

| FR | Requirement | Mobile | Console | State |
|---|---|---|---|---|
| FR-1 | Tenant and Property hierarchy | — | W22, W25, W31, W34, W35 | designed |
| FR-2 | Role-based access | — | W14, W22, W23, W24, W27, W29, W30 | designed |
| FR-3 | Corporate SSO | — | W14, W22, W27, W34 | designed |
| FR-4 | Shared Device sign-in | — | W14, W22, W27 | designed |
| FR-5 | Property configuration | S8 | W5, W12, W15, W17, W20, W26, W33, W35 | designed |
| FR-6 | Audit trail | S8 | W3, W12, W26, W28 | designed |
| FR-7 | Create a Request | — | W1, W17 | designed |
| FR-8 | Guest and Stay context on a Request | — | W1 | designed |
| FR-9 | Routing and assignment | S7, S11 | W2, W16, W18, W23 | designed |
| FR-10 | Request lifecycle | — | W3 | designed |
| FR-11 | Acceptance window | S6, S11 | W3, W16 | designed |
| FR-12 | SLA Clock | S11 | W12, W16, W18 | designed |
| FR-13 | Pause Conditions | H6 | W3, W17, W18 | designed |
| FR-14 | Breach and Escalation | S6, S7 | W3, W19 | designed |
| FR-15 | Guest follow-up | — | W36 | designed |
| FR-16 | Repeat-request detection | — | W1, W9, W36 | designed |
| FR-17 | Staff-raised Requests | H2, H4, H7 | — | designed |
| FR-18 | Open Request views | S10 | W1, W2 | designed |
| FR-19 | Room Status model | H10, S1 | W4 | designed |
| FR-20 | Room Assignment (board) | — | W5 | designed |
| FR-21 | Attendant room flow | H3, H5, H6, H10 | — | designed |
| FR-22 | Raise a Fault from a Room | H4 | — | designed |
| FR-23 | Board reassignment | S3 | W5 | designed |
| FR-24 | Inspection | S4, S5 | W20 | designed |
| FR-25 | Turndown | — | W5 | designed |
| FR-26 | Linen, amenity, and supply requests | H7 | — | designed |
| FR-27 | Housekeeping floor view | S1, S2 | W4, W15 | designed |
| FR-28 | Departure priority | — | W4 | designed |
| FR-29 | Shift handover | H9 | — | designed |
| FR-30 | Reactive Work Orders | — | W6 | designed |
| FR-31 | Asset registry | — | W7 | designed |
| FR-32 | PM Schedules | — | W6 | designed |
| FR-33 | Recurring-fault detection | — | W6, W7 | designed |
| FR-34 | Out of Order and Out of Service | S1, S8 | W4 | designed |
| FR-35 | Parts and consumption | — | W7 | designed |
| FR-36 | Guest-impacting fast path | — | W2, W18, W37 | designed |
| FR-37 | Work Order closure quality | — | W17 | designed |
| FR-38 | Engineering queue and workload | S10 | W6 | designed |
| FR-39 | Public-area and back-of-house work | — | W6 | designed |
| FR-40 | Log a Glitch | — | W8, W36 | designed |
| FR-41 | Link a Glitch to its causes | — | W8, W38 | designed |
| FR-42 | Record a Recovery | — | W8 | designed |
| FR-43 | Recovery approval thresholds | S6 | W8 | designed |
| FR-44 | Root cause and review | — | W8, W38 | designed |
| FR-45 | Guest history awareness | — | W9, W24, W33, W34 | designed |
| FR-46 | Record a Lost & Found Item | — | — | deferred |
| FR-47 | Chain of custody | — | — | deferred |
| FR-48 | Match an enquiry to an item | — | — | deferred |
| FR-49 | Jazz Core connection and health | — | W13, W25 | designed |
| FR-50 | Room Status synchronization through Jazz Core | — | W4, W13 | designed |
| FR-51 | Conflict resolution | H10, H11 | W13, W26 | designed |
| FR-52 | OOO/OOS write-back through Jazz Core | S8 | W4 | designed |
| FR-53 | Stay context and master data from Jazz Core | — | W9 | designed |
| FR-54 | Guest-call-to-Request | — | W1 | designed |
| FR-55 | Wake-up call visibility | — | W37 | designed |
| FR-56 | Phone-posted status and minibar events | — | W13 | designed |
| FR-57 | Degraded-mode operation | — | W13, W36 | designed |
| FR-58 | Offline action queueing | H9, H-AR, H11 | — | designed |
| FR-59 | Sync conflict handling | H8 | — | designed |
| FR-60 | Push notification | H8 | — | designed |
| FR-61 | Multi-language interface | H9, H-AR | — | designed |
| FR-62 | Photo capture and attachment | H3, H4, H5 | — | designed |
| FR-63 | Mobile Job queue | H2, S1 | — | designed |
| FR-64 | Device and session hygiene | H9 | W23 | designed |
| FR-65 | Notification routing rules | — | W21 | designed |
| FR-66 | Escalation chain configuration | — | W12, W19 | designed |
| FR-67 | Notification suppression | H8 | W21 | designed |
| FR-68 | Quiet hours and duty routing | — | W19, W21 | designed |
| FR-69 | Department operations dashboard | S9 | — | designed |
| FR-70 | Property operations dashboard | — | W10 | designed |
| FR-71 | SLA and response reporting | S9 | W10, W11 | designed |
| FR-72 | Recurring-fault and Asset reporting | — | W7, W38 | designed |
| FR-73 | Glitch and Recovery reporting | — | W38 | designed |
| FR-74 | Adoption and data-quality reporting | S9 | W10 | designed |
| FR-75 | Export and evidence pack | — | W11 | designed |
| FR-76 | Corporate cross-Property view | — | W24 | designed |
| FR-77 | Jazz Core API contract and version tolerance | — | W13 | designed |
| FR-78 | Per-Property capability negotiation | — | W13, W31, W37 | designed |
| FR-79 | Room Status discrepancy reporting | H11 | W13, W26 | designed |
| FR-80 | Floor layout definition and plan view | — | W15, W32 | designed |
| FR-81 | Custom role definition | — | W29, W30 | designed |
| FR-82 | Roster import with explicit mapping | — | W28 | designed |
| FR-83 | Tenant settings and default inheritance | — | W34 | designed |

## Deliberate deferrals

- **FR-46, FR-47, FR-48 — Lost & Found.** Confirmed R4 with Tanim on 2026-08-29. The mobile Raise sheet is designed to accept the capture without rework, and the console catalog already carries the enquiry entry tagged R4. Not a gap.

## Platform behaviour with no screen of its own

- **FR-2 — Role-based access.** Enforcement is server-side; its surfaces are W23 and W24.
- **FR-6 — Audit trail.** The audit trail is a platform guarantee; its surface is W26.
- **FR-12 — SLA Clock.** The SLA clock is platform behaviour shown on every job surface rather than a screen of its own.
- **FR-59 — Sync conflict handling.** Sync resolution is behaviour, not a screen; its user-visible half is the conflict notice on H8 and the reassignment notice in KF-3.
- **FR-77 — Jazz Core API contract and version tolerance.** Contract versioning is platform behaviour; its only user-visible consequence (a capability disabled with a reason) is on W13.

## What the first run of this audit actually found

The audit initially reported 22 uncovered requirements. Eighteen of those were **citation gaps, not coverage gaps** — screens existed but their evidence rows described the behaviour in prose without naming the FR (the whole mobile foundation set, FR-58 to FR-63, is the clearest example). Those citations are now fixed, which is what makes this table trustworthy on the next run.
Four were real, and three screens were added to close them: **W36** guest follow-up (FR-15), **W37** wake-up visibility (FR-55), **W38** glitch and recovery reporting (FR-73), plus the repeat-request flag surfaced at creation on **W1** (FR-16).

The lesson worth keeping: a coverage claim is only as good as the citations underneath it, and prose in a caption is not a citation.
