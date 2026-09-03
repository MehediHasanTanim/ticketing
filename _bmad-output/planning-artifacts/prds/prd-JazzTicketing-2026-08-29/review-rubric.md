# PRD Quality Review — JazzTicketing

Reviewer: rubric walker (bmad-prd validation checklist), run 2026-08-29 against `prd.md` + `addendum.md`.

## Overall verdict

The PRD is coherent, specific, and downstream-usable: the thesis (Jazzware's integration position converts into deployment speed) is stated, SM-1 measures it, and the FR set is testable enough for story creation. What is at risk is scope honesty — §6.1 admits 76 FRs across nine feature groups into "MVP", which is a v1 platform rather than a minimum viable product, and the PRD nowhere states what would be cut if the timeline halved. That, plus an unknown team and timeline (Open Question 4), means a decision-maker cannot currently judge whether this scope is fundable.

## Decision-readiness — adequate

Decisions are stated as decisions and the honest framing from the brief survives (the wedge is called a distribution advantage, not a moat, in §1). Deferred decisions are named as boundaries rather than smoothed over — NFR-2 in particular is explicitly called the most consequential open decision and handed to architecture with three options in addendum §A.1. Open Questions are genuinely open and carry owners.

### Findings
- **high** Scope is not decidable without team and timeline (§14 OQ4) — the PRD asks for a funding decision while omitting the two variables that determine whether §6.1 is one release or four. *Fix:* resolve OQ4 before the pitch, or state the assumed team shape as an `[ASSUMPTION]` so the reader can price the scope.
- **medium** No de-scoping position is offered (§6) — if the answer is "half that team", the PRD has no prepared fallback. *Fix:* add a release-slicing view (see the Scope honesty finding below).

## Substance over theater — strong

Personas are four operating roles plus a corporate viewer, and each drives specific FRs (FR-4 and FR-61 exist because of Rosa; FR-43 exists because of Daniel). NFRs carry product-specific thresholds rather than adjectives — NFR-1's maintenance window constraint (no global window can satisfy per-Property peak hours) is the kind of detail that changes an architecture. Counter-metrics are load-bearing, especially SM-C1 and SM-C4, which name the two ways this product can be gamed into looking successful.

### Findings
- **low** §1's third paragraph restates the brief's differentiation argument nearly verbatim. Justifiable — the PRD must stand alone — but a reader of both will notice.

## Strategic coherence — thin

The thesis is clear and SM-1 validates it directly. The scope does not follow from it. If deployment speed inside an installed base is the bet, the FR mass sits in the wrong place: integration is nine FRs of seventy-six, onboarding tooling (OR-3) is prose rather than requirements, and the epic order in addendum §D puts reporting — which SM-2, SM-3 and RO-2 all depend on — last.

### Findings
- **high** Thesis and scope disagree (§1 vs §6.1) — the PRD bets on time-to-value, then admits four full operational spines into v1. Either the bet is wrong or the scope is. *Fix:* make the release slicing explicit and let the wedge shape it — the spine that proves the integration claim fastest goes first.
- **medium** Onboarding is a success metric (SM-1) with no FRs behind it (§8 OR-3 is prose) — the thing the product is being sold on has no requirements. *Fix:* promote the onboarding runbook's tooling to FRs, or state that it is manual-with-a-checklist in v1 and accept what that does to SM-1.
- **medium** Reporting sequenced last (addendum §D) while three of the seven success metrics depend on it. *Fix:* FR-71 and FR-74 must ship with the first Property, not after it.

## Done-ness clarity — adequate

Most FRs carry testable consequences with real numbers (FR-7's 300ms, FR-20's ten seconds for 400 rooms, FR-54's two seconds). A handful hide behind adjectives and will not survive contact with a story writer.

### Findings
- **medium** FR-63 — "usable one-handed", "legible at a glance" are UX assertions, not testable consequences. *Fix:* restate as a bounded criterion (task completion without a second hand in usability testing; SLA state distinguishable at a stated distance and contrast ratio) or hand it to UX with an explicit acceptance test.
- **medium** FR-27 — "visibly flagged" for attendants running behind. *Fix:* define the threshold (percentage over Property median for that Room type) — the threshold is the requirement, the visual treatment is UX's.
- **low** FR-57 — "clear, non-blocking indication" is directionally right but untestable as written.
- **low** FR-15 — the guest follow-up channel is undefined, and §5 forbids a guest surface. Presumably a phone call by front office; say so.

## Scope honesty — thin

Non-Goals does real work and the deferrals carry reasons and two `[NOTE FOR PM]` callouts at genuine tension points. Fourteen assumptions are indexed and traceable. The problem is volume, not candour: 76 FRs, 10 Open Questions, 14 assumptions, three of which (OQ1, OQ4, OQ9) block downstream phases.

### Findings
- **critical** §6.1 is a v1 scope labelled MVP — four spines, a multi-tenant foundation, an integration layer, an offline mobile client, and a reporting suite. Nothing in the document says what a smaller first release would contain. *Fix:* add a release slicing to §6 — a first release that proves the thesis end to end at one Property, with the remainder as explicitly sequenced follow-ons. This is a product decision for Tanim, not an editorial fix.
- **high** OQ1 (PMS estate) blocks the architecture phase and OQ9 (residency) blocks a decision that is expensive to reverse. Both should be resolved before Winston starts, and the PRD should say so more loudly than a numbered list does.
- **low** Competitor positioning inherited from the brief is unvalidated (assumption 14) and this PRD is a pitch input.

## Downstream usability — strong

FR IDs 1–76 are contiguous and unique; every referenced FR is defined; UJ-1 through UJ-6 are defined, referenced, and each carries a named protagonist with context inline. The Glossary fixes 29 domain nouns, and the Job / Room Assignment boundary is called out explicitly in addendum §B, which is exactly the ambiguity that would otherwise be discovered during story writing. Sections survive extraction alone.

### Findings
- **low** §1 uses "ticket" and "housekeeper" in narrative before the Glossary establishes Job and Room Attendant. Deliberate storytelling, but a source-extracting subagent may pick up the synonyms.

## Shape fit — strong

Multi-stakeholder B2B with meaningful UX on two surfaces: UJs are load-bearing and correctly weighted toward the two screens the product lives on. Enterprise adapt-ins (operational requirements, data governance, integration dependencies, rollout, stakeholders) are pulled in because the product genuinely carries those concerns — the DG-5 works-council point and NFR-1's per-Property maintenance window are both real constraints that a generic PRD would have missed.

## Mechanical notes

- ID continuity: FR-1..FR-76 contiguous and unique; no unresolved FR, UJ, SM, NFR, OR, DG or RO cross-references.
- Assumptions Index: 14 entries, each traceable to an inline tag; no orphans in either direction.
- UJ protagonists: all six named, all carrying persona context inline; no standalone persona section, as intended.
- Glossary drift: none inside §4 onward; two narrative synonyms in §1 (above).
- Required sections for enterprise chain-top stakes: present.

---

## Revision note — 2026-08-29, after Tanim's answer round

Ten open questions answered. Disposition of the findings above:

| Finding | Status |
|---|---|
| **critical** — §6.1 is a v1 scope labelled MVP | **Resolved in draft.** §6.3 now proposes a four-release slicing (R1 spine + Jazz Core + mobile + minimum reporting; R2 housekeeping; R3 engineering; R4 incidents + full reporting). Awaiting Tanim's confirmation — the PRD says so rather than presenting it as settled. |
| **high** — scope not decidable without team and timeline | **Partly resolved.** Team confirmed as the existing team; timeline still unstated, so release dates remain unset. |
| **high** — thesis and scope disagree | **Resolved.** R1 is now exactly the thesis: Jazz Core integration plus the one spine that demonstrates it. |
| **medium** — onboarding carries SM-1 but has no FRs | **Still open.** OR-3 now names the consequence explicitly; either the runbook's tooling becomes requirements or SM-1's target is defended manually. Tanim's call. |
| **medium** — reporting sequenced last | **Resolved.** FR-69, FR-71 and FR-74 are inside R1. |
| **high** — OQ1 (PMS estate) and OQ9 (residency) block architecture | **Superseded.** OQ9 answered (multi-region, now a confirmed requirement in DG-4). The PMS-estate question is dissolved by the Jazz Core answer — and replaced by a sharper one: whether Jazz Core exposes the required surface today (new OQ1). The dependency did not disappear; it moved inside the company. |
| **low** — competitor positioning unvalidated | Unchanged. |

### New findings raised by the answers

- **critical** Jazz Core capability is now the load-bearing assumption of the entire PRD (§4.6, assumption 7). Every FR in §4.6, the whole of R1, and SM-1 depend on a surface no one in this document has confirmed exists. *Fix:* answer new OQ1 with the Jazz Core owner before architecture starts, and scope any Jazz Core work package explicitly in the pitch rather than absorbing it into JazzTicketing's estimate.
- **high** No design partner removes the only external check on the highest-risk assumption in the product (§12 RO-1, SM-3). Line-staff adoption cannot be predicted internally, and the plan now discovers it after the build. *Fix:* RO-1's two mitigations — early usability testing of the mobile prototype with real housekeeping and engineering staff, and structured feedback capture at every demo — are cheap and should be treated as commitments, not suggestions.
- **high** Multi-region at launch plus eight locales with two RTL scripts, on an existing team, are the two largest cost drivers introduced by this round, and both are foundation-level (DG-4, FR-61, NFR-10). Neither can be retrofitted cheaply, and both are easy to under-price in a pitch. *Fix:* make them visible line items in the funding conversation.
- **medium** SM-7's year-one property count was withdrawn as unfounded. The pitch now has no volume target at all, which management will notice. *Fix:* set a demo-and-pilot target (SM-8) rather than a live-property count.

---

## Addendum — 2026-08-29, palette reference

A Jazzware Intelligence visual reference was supplied and the mobile palette now derives from it (petrol, cyan, and the semantic hue set).

An earlier version of this addendum raised three findings on the assumption that the reference showed a shipping product with its own ticketing surface: a product-overlap question, a ticket-vs-Job vocabulary conflict, and a U1–U5 urgency-model conflict. **Tanim confirms the reference is a concept image, not a deployed product. All three findings are withdrawn.** JazzTicketing is the real ticketing product; the PRD Glossary and the SLA-based urgency model stand as authored, with no external vocabulary to reconcile against.
