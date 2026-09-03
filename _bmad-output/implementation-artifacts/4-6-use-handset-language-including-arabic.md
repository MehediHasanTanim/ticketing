# Story 4.6: Use the handset in my own language, including Arabic

Status: ready-for-dev

<!-- Created by bmad-create-story 2026-09-02. Story statement and acceptance criteria are transcribed verbatim from planning-artifacts/epics.md (status: final) - do not reword them here; a story needing a different criterion is a change to raise in epics.md. Epic 4: The handset — line staff work the floor. -->

## Story

As a **room attendant who reads Arabic**,
I want the whole interface in my language and laid out right-to-left,
So that the product is usable rather than translated.

## Acceptance Criteria

**Given** my Staff Member language attribute
**When** I sign in on a Shared Device
**Then** the interface applies that language for my session and reverts for the next person (FR-61, FR-4).

**Given** Arabic
**When** any screen renders
**Then** layout mirrors correctly — Job queues, SLA indicators, navigation — using logical direction only, with no left/right in layout (FR-61, AD-12, UX-DR-2).

**Given** mixed-direction content such as a Room number or a clock time inside a translated sentence
**When** it renders
**Then** identifiers and times use Western digits inside a bidi isolate with any adjacent separator **inside** the isolate, so a duration can never be misread as a different number (AD-12, UX-DR-2).

**Given** free-text content another Staff Member entered
**When** it is displayed
**Then** it is shown as entered with its language tag and never machine-translated (FR-61, AD-12).

**Given** the R1 locale set
**When** the release ships
**Then** English and Arabic are complete, and the remaining six locales are additive configuration rather than a layout change (FR-61).

## Tasks / Subtasks

- [ ] **T1. Language is a session, not an install** (AC: 1)
  - [ ] The Staff Member's language attribute applies at sign-in on a Shared Device and **reverts for the next person** (1.3, 4.1).
- [ ] **T2. Arabic mirrors properly** (AC: 2)
  - [ ] Every screen mirrors — Job queues, SLA indicators, navigation — using **logical direction only**: `EdgeInsetsDirectional`, `AlignmentDirectional`, a `Directionality` ancestor. Never `EdgeInsets.only(left:)`. The 1.0 lint enforces this; keep it green.
- [ ] **T3. The numeral and isolation rule** (AC: 3)
  - [ ] Room numbers, Job identifiers and clock times render in **Western digits in every locale**, inside a bidi isolate, **with any adjacent separator inside the isolate**.
- [ ] **T4. Free text is shown as entered** (AC: 4)
  - [ ] Displayed with its language tag, never machine-translated.
- [ ] **T5. R1 ships English and Arabic** (AC: 5)
  - [ ] Both complete; the remaining six locales are additive configuration, not a layout change.

## Dev Notes

**Prerequisites:** 4.1, 1.0 (localisation scaffold, ARB, the direction lint).

**Scope guards.** The mobile locale and direction contract. The console's equivalent is its own concern under the same AD-12. Not translation content management, not locale-variant resolution (Open Question 6 — es-ES vs es-MX, pt-BR vs pt-PT, Simplified vs Traditional — which must be resolved **before translation begins**, owner Tanim).

**Why this is architecture, not a translation task.** The PRD says it outright: both surfaces must be RTL-capable from the first screen, because retrofitting bidirectional layout after the app exists is a rebuild of the layout layer. R1 ships Arabic specifically to prove the RTL path is real rather than planned.

**The bug that made the numeral rule absolute.** During design, `إعادة تنظيف · ١٩ د` rendered as `١٩٠ د` — the middot resolved against Eastern digits and read as a zero, turning 19 minutes into 190. On a handset that decides which room to clean next. Hence: Western digits for identifiers and times, bidi isolation, and the separator **inside** the isolate — or no separator at all.

**Implementation notes.**
- Eight target locales, two RTL (Hebrew and Arabic). The `[NOTE FOR PM]` warns this is substantial and frequently underestimated across design, layout, testing and ongoing maintenance — do not scope it as string extraction.
- Only free-flowing quantities follow locale numeral convention; identifiers and clock times do not. That asymmetry is deliberate: the room number must match the door and the guest's phone call.
- Pseudo-localisation in CI (long strings, RTL forcing) catches layout breaks before Arabic content exists.

**Testing.** Full-screen RTL render pass on every mobile surface, greyscale too. Mixed-direction fixture set including the duration-plus-separator case. Language reverts between two sign-ins. Lint green. Pseudo-locale render check.

### Project Structure Notes

`clients/mobile/l10n` (ARB), `clients/mobile/lib/format` (the one numeral/isolation formatter — no screen formats an identifier itself). Locale keys originate in `contracts/`.

### References

- [Source: planning-artifacts/epics.md#Story 4.6]
- [Source: prd.md#FR-61] with its feature NFRs and `[NOTE FOR PM]`, [#§7 NFR-10], [#§14 Open Question 6]
- [Source: EXPERIENCE.md] numeral-form rule and bidi isolation
- [Source: ARCHITECTURE-SPINE.md#AD-12], [#Revision log]

## Standing constraints (identical in every story — the dev agent has only this file)

**Vocabulary is binding and verbatim in code.** `Job` (umbrella), `Request` (guest-originated), `WorkOrder` (maintenance), `RoomAssignment`, `Credits`, `Stay`, `Glitch`, `Recovery`, `Asset`, `Discrepancy`, `Tenant`, `Property`, `Shared Device`, `Catalog Entry`, `SLA Target`, `Pause Condition`, `Escalation chain`. **Never `ticket` or `task` in any identifier**, including tests and table names. A `RoomAssignment` is deliberately *not* a `Job` — it has no SLA Clock. A `Stay` is a projection of Jazz Core truth, never authored here.

**Architecture invariants (read-only, original ids).** AD-1 event-sourced Job core, SLA derived never stored · AD-2 `occurred_at` (domain clock) vs `recorded_at` (system clock) · AD-3 every row and event carries `tenant_id` and `property_id` · AD-4 regional cells, a Property never leaves its region, control plane holds no guest data · AD-5 one Jazz Core port with one owner · AD-6 cleanliness ours, occupancy Jazz Core's · AD-7 offline is a first-class write path, server-enforced idempotency on `(tenant_id, property_id, staff_member_id, client_key)` for 30 days · AD-8 notification intents in the domain, delivery in adapters, suppression evaluated once · AD-9 configuration versioned and effective-dated, a Job keeps its bound version for life · AD-10 guest data minimised **at ingestion** · AD-11 permission is a server decision; the interface only hides what the server would refuse · AD-12 one localisation and direction contract · AD-13 one writing owner per aggregate · AD-14 one SLA fold (TypeScript) plus exactly one Dart port, both fixture-gated.

**Layering.** `core/` pure domain, no I/O and no clock of its own · `core/ports/` interfaces · `adapters/` one per external reality · `app/` handlers, projections, sagas · `edge/` HTTP, sync, auth, tenancy · `clients/mobile` (Flutter/Dart) and `clients/console` (React/TS). Dependencies point **inward only**; a client never reaches an adapter or the datastore directly. Story 1.0's lint enforces this — keep it green.

**Conventions.** Events past tense, domain-first, one per real-world fact · ULIDs for what we create; Room numbers and Jazz Core ids are external strings, never re-keyed · UTC RFC 3339, Property timezone is presentation only · money as minor-unit integers plus ISO-4217, **no conversion in v1** · one error envelope (`code`, localisable `message` key, `retryable`) · commands are POSTs returning the accepted event, reads are projections, sync is one endpoint taking a batch of intents · configuration is versioned records, **never environment-variable feature behaviour** · secrets from the platform secret store, never on a device · structured logs carry tenant, property, actor, correlation id and the Jazz Core exchange id — **guest identifiers are never logged**.

**Release gates that apply to this story but are not its acceptance criteria.** Cross-tenant isolation (AD-3/DG-1) · the two-language SLA fixture suite (AD-14) · contract-codegen drift, since `contracts/` is the schema of record and no wire type is hand-written on either side · the per-intent offline conflict-rule suite (AD-7). All four were stood up in **Story 1.0**; extend them, never bypass them.

**If this story touches a client surface**, these are acceptance criteria, not polish: state distinctions survive **greyscale** and are legible at arm's length in low light (NFR-6) · **logical direction only** — no left/right in layout; Arabic ships in R1 (AD-12) · identifiers and clock times render in **Western digits inside a bidi isolate, with any adjacent separator inside the isolate** · core actions are tap-only (gloves) and reachable one-handed in the thumb zone on the baseline device (Android 10 / iOS 15 / 3 GB) · one primary action per screen, destructive actions never in the thumb zone · colour, spacing and type come from `DESIGN.md` tokens — accent petrol `#27565D` on white ink, cyan `#08FCFF` is a highlight and never a button ground · a surface showing Jazz Core-sourced context names the last successful exchange when stale · **render it and check it in greyscale before calling it done** — that habit caught a missing glyph, a wrapping label, dead space on eight surfaces, a selection style masking priority state, and an Arabic bidi bug that turned 19 minutes into 190.

**Testing baseline.** Domain unit-tested with a **fake clock and fake ports** — a domain test that needs a database means the dependency arrow is wrong. Use fake clocks for anything time-dependent; never real sleeps. Add every new aggregate and public interface to the cross-tenant isolation suite.

**Unverified stack.** Every version in the architecture spine's Stack table is `[ASSUMPTION]` — produced from training knowledge with web access blocked. Story 1.0 owns confirming them. Do not treat a version as settled, and report any divergence rather than adopting it silently.

**This story file is derived from `status: final` documents.** Its acceptance criteria are transcribed verbatim from `planning-artifacts/epics.md`. A story that needs a different criterion is a **change to raise there**, not to reinterpret in code. Tasks may be added under an existing AC; ACs may not.

## Dev Agent Record

### Agent Model Used

_(to be filled by the dev agent)_

### Debug Log References

### Completion Notes List

### File List
