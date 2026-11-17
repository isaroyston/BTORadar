---
name: BTO Radar
description: A housing-money planner for Singapore BTO buyers. Sleek, calm product UI on one typeface; a cool neutral canvas, white cards with a hairline edge, one deep-ink answer card per screen, a raspberry accent for actions, colour-coded money splits, and motion that shows numbers changing.
reference: 2026-11-17 direction from the owner, "sleek modern". It replaces the soft pink look of 2026-11-16 but keeps its structure (one answer per screen, icon tiles, the drawn HDB scene, now at dusk). Behaviour still follows Wise, Airbnb and NerdWallet.
colors:
  canvas: "oklch(97.9% 0.003 265)"      # cool off-white page ground
  canvas-deep: "oklch(95.6% 0.005 265)" # notes, tracks, quiet chips
  card: "oklch(100% 0 0)"               # white cards, edged by a 1px hairline in the shadow
  hero: "oklch(21% 0.028 268)"          # deep-ink answer card, setup running total
  ink: "oklch(19% 0.02 268)"
  ink-2: "oklch(38% 0.018 268)"
  mute: "oklch(52% 0.014 268)"
  accent: "oklch(58% 0.21 14)"          # raspberry: primary button, active nav, icon glyphs, live badges
  accent-soft: "oklch(95.6% 0.006 268)" # icon tiles, active nav row: neutral, not pink
  positive: "oklch(48% 0.13 152)"       # within budget, done, grant, gains
  caution: "oklch(50% 0.11 62)"         # over budget, above a ceiling
  split-loan: "oklch(62% 0.11 255)"
  split-grant: "oklch(70% 0.14 160)"
  split-cpf: "oklch(80% 0.12 85)"
  split-cash: "oklch(66% 0.19 14)"
typography:
  face: "Inter only, 400-800. Tabular numerals wherever digits line up."
  scale: "page title clamp(1.75rem, 2.4vw, 2.1rem)/800; answer figure clamp(2.6rem, 6vw, 3.9rem)/800; setup question clamp(1.5rem, 3vw, 2rem)/800; card title 1.1rem/700; body 15.5px; caption 0.8rem"
rounded:
  card: 18px
  answer: 22px
  setup: 26px
  control: 12px
  pill: 999px
---

# BTO Radar design system

## What it is

A planner people open with a real decision in front of them: can we afford a flat, which launch, and when the money is due. It should feel precise and calm: neutral surfaces, one dark answer that stands out, plain words, and numbers you can trace back to their inputs.

## The look

- **Cool neutral canvas, white cards.** Cards have a 1px hairline edge (part of `--shadow-card`) and a soft neutral shadow. No pink tints.
- **One deep-ink answer card per screen.** Home's `.answer` and the `.hero` on Budget and Plan share the `--hero` ink. Inside them the colour tokens are redefined light (`.hero, .answer` in `index.css`), so anything placed inside follows without extra rules. Text on a coloured fill uses `--on-accent`, which never changes.
- **The scene** (`components/HeroArt.tsx`) is the drawn HDB blocks at dusk: dark blocks, warm lit windows, a pale moon, raspberry roof band. Palette only, no images.
- **Where the money comes from is one bar.** `MoneySplit` draws loan, grant, CPF by keys and cash in fixed colours, with a legend carrying the figures. The same four colours mean the same thing everywhere.
- **Every figure has an icon.** Icon tiles are neutral with raspberry glyphs.
- **Edit is a chip.** White pill with a pencil, top-right of what it edits. Home's header carries Share, Add to calendar and Print as the same chips.
- **Dark mode** redefines the same tokens (`prefers-color-scheme`, or `data-theme` from the switch). Text on an ink fill uses `--on-ink`, which flips; text on raspberry or green uses `--on-accent`, which doesn't. Pale status fills (`--gold-pale`, `--info-pale`, `--positive-pale`, `--caution-pale`) have dark-mode versions, so no literal colours are needed outside the drawn scene.

## Flow

- **New visitors land on Home** with one start card ("Find your price ceiling in five questions") and the current launch, so the page is useful before any input.
- **The guided setup** (`SetupFlow`) is a modal dialog: one question per step (each person's income, each person's CPF, first-timer status, optional cash, flat size), a progress bar, Back and Continue, Enter to advance. A deep-ink panel beside the questions shows the price ceiling building up as each answer lands. It ends on a result card that counts up to the ceiling, then three plain facts (projects that fit, the grant, whether CPF covers the repayment).
- **Closing the setup early puts every answer back.** Only "Open my dashboard" or "See the projects" keeps the changes.
- **Home is the dashboard** once the budget is known: the answer card and the launch card, then three labelled sections (Before you apply; Choosing a project; Once you own it), then the road to keys. Section labels are small uppercase captions, not headings with slogans.
- **Budget stays the one place to edit fields directly**; it also offers the step-by-step setup when empty.

## Copy rules

- Screens are titled with their name ("Home", "Budget", "Projects", "Plan") plus one factual line. No slogans.
- Answers lead with a plain label ("You could buy a flat priced up to") and one figure.
- Policy statements name the rule and the number ("HDB allows up to S$ 14,000 a month"). Anything estimated says so.

## Colour rules

- **Raspberry is for actions and live states, never for reading.** Primary buttons, the active nav icon, icon glyphs, the "Applying now" badge, the last step on the road, focus rings.
- **Status has its own colours.** Green for within budget, done, the grant and gains; ochre for over budget and above a ceiling. Over budget is never red.
- **No decorative gradients** (see PRODUCT.md). Depth comes from the ink card and the hairline shadows.

## Components

- **Answer card.** `.answer` (Home) and `HeroCard` (Budget, Plan, with `art`).
- **Money split.** `MoneySplit`, `.split-on-dark` inside answer cards.
- **Checks.** Round status mark (check, alert, info) plus a title and one line of why.
- **Levers.** A change and a green delta pill; "No change" in grey.
- **Name-and-figure rows** (`.odds`, `.places`, `.cost-rows`): name and a muted second line on the left, a figure or pill on the right. Odds pills are green (good), gold (fair) or ochre.
- **Shared plan banner.** A white card with a raspberry ring above the screen; loading is always the visitor's choice.
- **Road to keys.** Five numbered steps, horizontal from 900px, vertical below; with a chosen project each step shows its date and what is paid from grant, CPF and cash.
- **Setup choices.** Large radio cards with a ring that fills ink when chosen; arrow keys move the choice.
- **Stat tiles, project cards, detail sheet, segmented control, launch tabs, payments** as before.

## Motion

- **Numbers count** to new values over 500ms; the setup result counts up from zero over 900ms.
- **Split bars grow** from the left once, 700ms.
- **Setup steps** slide in 14px and fade, 420ms; the dialog rises 16px on open.
- **Screens cross-fade** through the View Transitions API.
- **Nothing bounces, pulses or spins.** Everything uses `cubic-bezier(0.16, 1, 0.3, 1)`. Under `prefers-reduced-motion`, nothing moves.

## Do and don't

- **Do** lead every screen with its answer, then the inputs that change it.
- **Do** save automatically, and undo on cancel.
- **Do** show what a number is made of.
- **Don't** add a second typeface or a second accent.
- **Don't** show a verdict ("fits", "over") before the person has given their numbers.
