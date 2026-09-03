---
name: JazzTicketing Mobile
description: Line-staff mobile app for hotel service operations. Back-of-house instrument — high contrast, large targets, legible in a dim corridor with one gloved hand.
status: final
updated: 2026-09-02
sources:
  - "{planning_artifacts}/prds/prd-JazzTicketing-2026-08-29/prd.md"
colors:
  brand-petrol: '#27565D'
  brand-petrol-deep: '#14343B'
  brand-steel: '#5186B9'
  surface-base: '#F1F5F6'
  surface-raised: '#FFFFFF'
  surface-sunken: '#E2EAEC'
  ink-primary: '#14343B'
  ink-secondary: '#4E686E'
  ink-disabled: '#93AAAE'
  ink-on-accent: '#FFFFFF'
  accent: '#27565D'
  accent-pressed: '#1C4147'
  accent-ink: '#27565D'
  highlight: '#08FCFF'
  state-ok: '#0B7A52'
  state-due: '#A8490B'
  state-breach: '#C11B1B'
  state-paused: '#4E686E'
  state-offline: '#4A45D6'
  border-hairline: '#D3DFE1'
  border-strong: '#14343B'
  focus-ring: '#0F5F66'
  surface-base-dark: '#0B1F24'
  surface-raised-dark: '#132E35'
  surface-sunken-dark: '#071519'
  ink-primary-dark: '#EAF3F4'
  ink-secondary-dark: '#A3BDC1'
  ink-disabled-dark: '#5F7B80'
  ink-on-accent-dark: '#FFFFFF'
  accent-dark: '#2F6A73'
  accent-pressed-dark: '#3C818B'
  accent-ink-dark: '#7FD3DC'
  highlight-dark: '#08FCFF'
  state-ok-dark: '#3ED89A'
  state-due-dark: '#FF9A4D'
  state-breach-dark: '#FF6B6B'
  state-paused-dark: '#9DB4B8'
  state-offline-dark: '#9B98FF'
  border-hairline-dark: '#20444C'
  border-strong-dark: '#EAF3F4'
  focus-ring-dark: '#5BF6FA'
typography:
  display:
    note: 'Timer numerals only — tabular figures, iOS Title 1 / Android Headline Small, minimum 28sp'
  title:
    note: 'Screen and card titles — iOS Title 3 / Android Title Large, minimum 20sp, semibold'
  body:
    note: 'Primary content — iOS Body / Android Body Large, minimum 17sp. Never below 16sp anywhere in the app.'
  label:
    note: 'Buttons and chips — iOS Headline / Android Label Large, semibold, minimum 17sp'
  meta:
    note: 'Timestamps, room numbers, secondary detail — iOS Subheadline / Android Body Medium, minimum 15sp'
rounded:
  sm: 8px
  md: 14px
  lg: 20px
  pill: 999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  '7': 40px
  '8': 56px
components:
  touch-target-min: 48px
  touch-target-primary: 64px
  thumb-zone-height: 176px
  card-min-height: 96px
  hairline: 1px
  border-emphasis: 2px
---

## Brand & Style

JazzTicketing's mobile app is a back-of-house instrument, not a consumer product. Its users are room attendants, engineers, and runners who hold it in one hand — often gloved, often mid-task, often in a service corridor lit worse than any design review room. They open it dozens of times a shift for a few seconds each time. Every one of those openings is a question with one answer: *what do I do next, and how long do I have?*

So the aesthetic is deliberate plainness. Large type, generous targets, hard contrast, no decoration that does not carry information. It should feel closer to a well-designed piece of equipment than to an app — a tool that reads instantly at arm's length and does not punish an imprecise tap. Where a consumer product would spend its budget on delight, this one spends it on legibility.

Two things follow from that, and they are the identity of the product more than any colour is. **Nothing that matters is conveyed by colour alone** — a colour-blind attendant in a dim corridor must read the same urgency a designer sees on a calibrated monitor. And **the interface is authored in logical direction**, never left and right, because Hebrew and Arabic are in the shipping locale set and a mirrored layout must be the same layout, not a second one.

**The palette is Jazzware's**, taken from the Jazzware Intelligence visual reference rather than invented: petrol `#27565D` as the structural colour, cyan `#08FCFF` as the action accent, and a semantic set of green `#11B076`, orange `#F86816`, red `#D72222`, indigo `#585BEF`.

Those four semantic hues are kept because they match what hotel operations already means by them — green fine, orange needs attention, red out of service — not because any deployed system has taught staff the mapping. `[ASSUMPTION]` The values are sampled from a design reference image, not from a design-system file; confirm them against the real tokens if a system exists. Hues are darkened for ink and borders where the reference values fall below text contrast on white — `#F86816` is a legible fill but not legible 15sp type — while the fills and the dark-mode ramp stay recognisably Jazzware's.

## Colors

The palette does one job: separate *content* from *state* so that neither is mistaken for the other. It inherits from the Jazzware visual identity so the floor app reads as part of the family.

**Brand and surfaces.** `brand-petrol` `#27565D` is the structural colour — the sign-in ground, the active tab, the wordmark. Neutrals are biased toward it rather than pure grey: `surface-base` `#F1F5F6` and `surface-sunken` `#E2EAEC` sit in the same family, and `ink-disabled` `#93AAAE` is the reference's own muted tone. `ink-primary` `#14343B` is petrol taken almost to black; on `surface-raised` it clears 14:1, because body content is read at speed in poor light.

**Accent is petrol; cyan is a highlight.** `accent` is `#27565D` carrying white `ink-on-accent` — the treatment Jazzware uses on its own floating action button, and 6.5:1 on white. Primary buttons, the active tab, and focus rings all take it. Cyan `highlight` `#08FCFF` is kept for exactly two jobs: the second word of the wordmark, and the selected state of a chip on a petrol ground. It is never a button fill and never text on white, where it measures 1.3:1 and disappears. The earlier draft made cyan the button colour; petrol reads better at arm's length in a corridor and stops the interface shouting.

**State colours are redundant reinforcement, never the signal:**

- `state-ok` `#0B7A52` — inside SLA target *(brand green)*
- `state-due` `#A8490B` — approaching breach *(brand orange — the attention hue)*
- `state-breach` `#C11B1B` — past SLA target *(brand red — out of service)*
- `state-paused` `#4E686E` — SLA Clock suspended *(petrol slate, deliberately inert)*
- `state-offline` `#4A45D6` — action queued on device *(brand indigo, reserved for this one meaning)*

Each always appears with a glyph and a word or number. Strip the colour out and the screen still reads correctly; that is the acceptance test, it is run by rendering every state screen in greyscale, and it has been run on these screens.

**Dark mode is a peer, not an afterthought.** Turndown, night audit, and overnight engineering shifts are real working conditions. The dark ground is petrol taken deep (`#0B1F24`) rather than neutral black, so the family resemblance survives; state hues lighten and desaturate so a breach reads as urgent without glaring in a dark corridor. Cyan needs no adjustment — it was always a dark-ground colour.

Avoid: colour-coded departments, gradients anywhere but the sign-in ground, translucency over content, and any use of red that is not a genuine SLA breach or a destructive confirmation.

## Typography

Platform native throughout — San Francisco on iOS, Roboto on Android — with three non-negotiable rules.

**A hard floor of 16sp.** Nothing in this app is set smaller, including timestamps and helper text. The floor exists because the reading conditions are bad and the readers are moving.

**Tabular figures everywhere a number changes.** SLA timers, room numbers, credit counts, and queue counts use tabular numerals so digits do not jitter as they count down. `display` is reserved for the one number that matters most on a screen — usually the remaining time on the Job in hand.

**Dynamic type is honoured to the largest accessibility setting.** At maximum, cards reflow to stacked rather than truncating: a truncated room number is a wrong room.

Titles are sentence case. No all-caps labels — they are harder to read at a glance and they break badly in Arabic and Chinese.

## Layout & Spacing

Scale: 4 / 8 / 12 / 16 / 24 / 32 / 40 / 56. Screen margin is `spacing/4`; the gap between cards is `spacing/3`; the gap between sections is `spacing/5`.

**Single column, always.** No side-by-side content on the phone. Grids are for the web console.

**The thumb zone is reserved.** The bottom `thumb-zone-height` (176px) of every action-bearing screen belongs to the primary action for that screen and nothing else. Destructive or irreversible controls never live there — they live in an overflow menu behind a confirm sheet, because the thumb zone is where accidental taps happen.

**Targets.** `touch-target-min` 48px for every interactive element without exception; `touch-target-primary` 64px for the one action a screen exists to perform. Adjacent targets are separated by at least `spacing/2` so a gloved thumb cannot hit two.

**Logical properties only.** `padding-inline-start`, `margin-inline-end`, `text-align: start`. The word "left" does not appear in the stylesheet.

## Elevation & Depth

Elevation is used sparingly and only to signal *layer*, not importance. Cards sit on `surface-raised` with a hairline border and no shadow; hierarchy comes from type and spacing. Shadow is reserved for genuinely floating layers: the bottom action bar (a soft upward shadow so content visibly passes beneath it) and bottom sheets.

No shadow is ever the only thing distinguishing two surfaces — a hairline or a tone change carries it too, because shadows disappear on cheap screens at low brightness.

## Shapes

`rounded/sm` (8px) for chips, inputs, and small controls. `rounded/md` (14px) for cards and list rows. `rounded/lg` (20px) for bottom sheets and modal surfaces. `pill` only for the SLA chip and the queue counter — the two elements that must read as status rather than as tappable objects.

Photographs and thumbnails follow their container's radius exactly. Icons are stroked, not filled, at a minimum 2px stroke so they survive low brightness; directional icons (arrows, chevrons, back) mirror under RTL, while non-directional ones (camera, clock, warning) never do.

## Components

Visual specification only — behaviour lives in `EXPERIENCE.md.Component Patterns`.

- **Job card** — `surface-raised`, `rounded/md`, hairline border, `card-min-height` 96px. Three zones in reading order: SLA chip (start-aligned, top), Location and Catalog Entry in `title`, then meta line (Department · elapsed · origin). A guest-impacting fast-path Job carries `border-emphasis` in `state-breach` on its start edge plus the word "Priority" — never colour alone.
- **SLA chip** — `pill`, state colour as *background at 12% with a full-strength border and ink*, containing a glyph, the remaining time in `display` or `label` tabular figures, and a state word. Four glyphs, all distinguishable in greyscale and by shape: ● running, ▲ breached, ‖ paused, ○ not started.
- **Room card** (Board) — `surface-raised`, `rounded/md`. Room number in `title` with tabular figures, status word in `label`, credit value and clean type in `meta`. Status is written, not implied: "Departure · Not started", "Occupied · DND".
- **Primary action bar** — fixed to the bottom, `surface-raised` with upward shadow, holding one `touch-target-primary` button in `accent` petrol with white ink. Single action per screen. Its label is a verb: Accept, Start, Complete.
- **Queue counter** — `pill` in `state-offline`, persistent in the header when queued actions exist. Shows a count and the word "queued", never a bare badge dot.
- **Sync banner** — full-width, `surface-sunken`, one line, dismissible only when resolved. Text-first; the icon is secondary.
- **Sign-in ground** — the one gradient in the product: `brand-petrol` → `brand-steel`, carrying the wordmark in white with the second word in `highlight` cyan. It exists so the first screen of the shift places the app in the Jazzware family.
- **PIN pad** — 3×4 grid on `surface-base`, each key `touch-target-primary`, large tabular numerals, no letters. Language selector sits above it on the petrol ground as a row of language names *in their own scripts*.
- **Photo tile** — square, `rounded/sm`, with an explicit upload-state label beneath ("Queued", "Uploaded") rather than an overlay spinner.
- **Bottom sheet** — `rounded/lg` on the top corners only, dragged or dismissed, one level deep, never stacked. Confirmations for irreversible actions live here with the destructive verb spelled out.
- **Empty state** — a sentence in `body` and, where an action exists, one button. No illustrations: they cost bytes on a 3 GB device and translate badly.

→ Rendered against these tokens: `mockups/mobile-key-screens.html` (light screens 1–5, dark screen 6). The spines win on conflict with any mock.

## Web console

One token set, two densities. The console inherits every colour, radius and type role above; what changes is scale, rhythm and a handful of components that only exist on a large screen.

**Density.** Base type 13.5px with a 12px uppercase label role — below the mobile floor of 16px, and deliberately so: a seated user at 60cm reading forty rows is not a gloved hand in a corridor. Table rows are 38px, cells `12px` horizontal padding, and the vertical rhythm halves to 4/8/12/16/24. Where mobile spends space on target size, the console spends it on alignment.

**Grid and shell.** 1280px design width. Persistent 212px left navigation on `brand-petrol`, grouped Operations / Insight / Setup, active item marked by a `highlight` cyan inset rail — the second of cyan's two jobs in the product. A 52px top bar carries the surface title, the Property switcher, `⌘K` search and the user. Content is a 16/18px padded column of panels.

**Panels fill.** A panel stretches to the bottom of the viewport rather than floating above dead space; leftover room inside it reads as a list with capacity, which is what it is.

**Tables.** Sticky header on `surface-base`, hairline row separators, `tabular-nums` on every numeric column, numeric columns end-aligned in both text directions. A row carrying state gets a 3px inset edge in that state's colour — and that edge outranks the selection outline, because selection is transient and a breach is not.

**Drawer.** 520px, `surface-raised`, hairline start-edge, a soft shadow toward the list it covers. One level deep, never stacked.

**Charts.** Petrol is the data colour; the pre-launch baseline is a dashed `ink-disabled` reference with a direct label. Magnitude across categories is one hue at equal weight. Status hues stay reserved for state and are never reused as series. 2px lines, 4px rounded bar ends, recessive `hairline-soft` gridlines, `ink-disabled` axis labels — the mark is the only saturated thing on the panel.

**What the console does not inherit.** The 64px primary action and the reserved thumb zone are mobile-only; console buttons are 34px and live beside the thing they act on. The console has no offline queue — it is a seated, connected surface, and a lost connection is an error state there rather than a normal mode.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use petrol with white ink for every primary action | Fill a button with cyan — it shouts and it is 1.3:1 on white |
| Keep cyan for the wordmark and chip-on-petrol selection | Set cyan as text or an outline on white |
| Keep the operational meanings (orange attention, red out of service, green fine) | Invent a second colour language for the same concepts |
| Encode state with glyph + word + number, colour as reinforcement | Rely on red/amber/green, or on a coloured dot alone |
| Author in logical direction (start/end) | Write left/right anywhere in layout or copy |
| Keep one primary action per screen, in the thumb zone | Put destructive actions in the thumb zone |
| Set a 16sp floor and tabular figures for changing numbers | Shrink meta text to fit more on screen |
| Show queued and offline as ordinary states | Show offline as an error, or block an action on it |
| Hand-tune the dark palette | Invert the light palette and ship it |
| Write status in words ("Departure · Not started") | Imply status through colour bars or icon-only badges |
| Use platform navigation and gestures as they are | Invent custom gestures for core actions |
