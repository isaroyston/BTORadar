---
name: BTO Radar
description: A housing-money planner for Singapore BTO buyers. Restrained product UI on one typeface, a warm off-white canvas, white working cards, one dark summary card per screen, one accent for actions, and calm motion that shows numbers changing.
references:
  - Wise (base system): one accent, 24px radius, surface contrast as depth, a live calculator card as the signature.
  - Airbnb (browsing): listing cards with a save heart, one hover-float shadow tier, a sticky summary rail beside detail.
  - NerdWallet (comparison): ruled comparison rows, label-over-value spec cells, no vertical dividers.
colors:
  canvas: "oklch(97.4% 0.005 80)"      # warm off-white page ground
  canvas-deep: "oklch(94.6% 0.007 80)" # inputs, segmented tracks, active nav
  card: "oklch(100% 0 0)"              # white working cards
  ink: "oklch(22% 0.012 60)"           # warm near-black: text, and the summary-card ground
  ink-2: "oklch(38% 0.012 60)"         # secondary text on light
  mute: "oklch(52% 0.01 60)"           # tertiary text, captions
  hairline: "oklch(22% 0.012 60 / 0.09)"
  accent: "oklch(55% 0.2 15)"          # raspberry: every primary action and the active nav item
  accent-bright: "oklch(68% 0.19 15)"  # accent on the dark summary card
  accent-pale: "oklch(95% 0.03 15)"
  cream: "oklch(95% 0.02 80)"          # text on the dark summary card
  positive: "oklch(48% 0.13 152)"      # within budget, done
  positive-pale: "oklch(94.5% 0.05 152)"
  caution: "oklch(52% 0.12 65)"        # over budget, not covered
  caution-pale: "oklch(95% 0.05 85)"
typography:
  face: "Inter only, 400-700. Tabular numerals wherever digits line up."
  scale: "page title clamp(1.75rem, 2.4vw, 2.125rem)/700; summary figure clamp(2.5rem, 4.6vw, 3.6rem)/700; section 1.2-1.4rem/600; body 1rem; caption 0.85rem"
rounded:
  card: 24px
  control: 16px
  pill: 999px
---

# BTO Radar design system

## What it is

A planner people open with a real decision in front of them: can we afford a flat, which launch, and when the money is due. The interface should feel like a confident friend who is good with money. Plain words, big answers, nothing hidden behind jargon.

## The references, and what each contributes

- **Wise is the base.** One accent colour for actions and nothing else. Cards and buttons at a generous 24px radius. Depth comes mostly from surface contrast (white cards on an oat canvas), not shadows. Its signature is a live calculator card; ours is the Budget card, where the price ceiling updates as you type.
- **Airbnb shapes browsing.** Project cards are scannable listings with a save heart in the corner. One soft shadow tier exists, used only for things that float: a hovered card, the detail sheet, the bottom bar. Detail opens beside the list with a sticky summary.
- **NerdWallet shapes comparison.** The compare view is ruled rows with no vertical dividers, label above value, and the best value in each row marked with the positive colour.
- **Ours, not theirs.** The palette (warm near-black, off-white, raspberry) belongs to BTO Radar. No reference's brand colours, typefaces or illustrations are copied.

## Restraint is the polish

An earlier pass used marketing-style question headlines with one accented word, a heavy display face, radar rings, a glow and a pulsing dot. It read as generated, so it was removed. The rules that came out of it:

- Screens are titled with their name ("Budget", "Projects", "Plan"), plus one factual line. No questions, slogans or accented words.
- One typeface. The only large type on a screen is its main money figure.
- No decoration: no rings, glows, gradients, pulsing dots or bounce effects.
- One dark surface per screen at most. The sidebar, tab bar and banners stay light.

## Colour rules

- **Raspberry means "do this".** Primary buttons, the active nav item, focus rings, links. Never a status.
- **Status has its own colours.** Green for within budget and done; ochre for over budget and not covered. Over budget is a caution, not an error, so it is never red.
- **One dark summary card per screen.** The price ceiling, the plan verdict and the next payment sit on the dark ground with cream text. Everything you work on (forms, lists, tables, the launch summary) sits on white.
- Text on the dark card uses cream at full or 75% strength, never grey.

## Type rules

- Page titles are the screen's name in Inter 700, with one plain sentence under it.
- The summary figure is Inter 700 with slightly tight tracking. Supporting figures use Inter 600 with tabular numerals.
- No uppercase eyebrows or labels above headings.

## Depth

| Level | Treatment | Used for |
|---|---|---|
| 0 | Oat canvas | Page ground |
| 1 | White card, no border | Forms, lists, cards |
| 2 | Dark summary card | The screen's main answer |
| 3 | Float shadow `0 1px 2px ink/6%, 0 12px 32px -12px ink/28%` | Hovered card, detail sheet, bottom bar, sticky rail |

## Components

- **Summary card.** Dark ground, 28px radius, no decoration. Holds one figure, one sentence, a funding bar, and one primary action.
- **Funding bar.** Segments for loan (raspberry-bright), grant (green), CPF (cream), cash (sand), not covered (hatched ochre). Segments grow from zero when shown.
- **Project card.** White, 24px radius. Name and town, save heart top-right, price large, a fit pill (green "Fits your budget" or ochre "S$X over"), four facts as label-over-value cells, two actions.
- **Detail sheet.** Slides in from the right on desktop, up from the bottom on phones. Price per flat size, fit, monthly payment at that price, facts, strengths, and a full-width "Plan this flat".
- **Segmented control.** Oat track, white thumb that slides to the selected option.
- **Timeline.** Plan's payments are a vertical timeline: a dot per step, the date, what is paid, how (CPF or cash), and a tick to mark it done.

## Motion

None of the references document motion, so these rules are ours.

- **Numbers move.** When a money figure changes it counts to the new value over 500ms (ease-out). That is the signature: you change your savings and watch the ceiling move.
- **Screens cross-fade** on navigation, through the View Transitions API where the browser has it.
- **Lists fade in** 6px at 45ms per item, once per screen visit.
- **Floating things gain a shadow.** Cards take the float shadow on hover without moving. The sheet slides 32px with a fade.
- **Nothing bounces, pulses or spins.**
- **Everything uses** `cubic-bezier(0.16, 1, 0.3, 1)`, 200–500ms. Under `prefers-reduced-motion`, figures jump, screens swap instantly, and nothing moves.

## Do and don't

- **Do** lead every screen with its answer, then the inputs that change it.
- **Do** save automatically. People should never lose a plan because they forgot a button.
- **Don't** add a second accent colour, gradients, glass, decorative illustrations, or a second typeface.
- **Don't** write headlines; name the screen.
- **Don't** put borders on cards; surface contrast separates them.
- **Don't** show a verdict ("fits", "over") before the person has given their own numbers; say what is missing instead.
