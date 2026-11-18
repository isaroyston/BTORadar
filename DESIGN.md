---
name: BTO Radar
description: A housing-money planner for Singapore BTO buyers. White, exact and quiet, like a top financial dashboard; one typeface, one raspberry accent, and a four-colour money split wherever a price is broken down.
colors:
  accent: "oklch(55% 0.205 14)"
  accent-hover: "oklch(49.5% 0.195 14)"
  accent-soft: "oklch(97.2% 0.014 14)"
  canvas: "oklch(100% 0 0)"
  card: "oklch(100% 0 0)"
  panel: "oklch(98.6% 0.002 248)"
  canvas-deep: "oklch(97.7% 0.0035 248)"
  hairline: "oklch(93% 0.006 255)"
  hairline-strong: "oklch(87.5% 0.009 255)"
  ink: "oklch(23% 0.025 264)"
  ink-2: "oklch(39% 0.022 260)"
  mute: "oklch(52.5% 0.02 255)"
  faint: "oklch(66% 0.015 255)"
  positive: "oklch(47% 0.12 155)"
  positive-pale: "oklch(96.5% 0.035 155)"
  caution: "oklch(50% 0.11 60)"
  caution-pale: "oklch(96.8% 0.04 80)"
  gold-ink: "oklch(48% 0.1 70)"
  gold-pale: "oklch(96.8% 0.04 85)"
  info-ink: "oklch(45% 0.13 260)"
  info-pale: "oklch(96.5% 0.025 255)"
  split-loan: "oklch(56% 0.16 268)"
  split-grant: "oklch(66% 0.14 162)"
  split-cpf: "oklch(79% 0.13 80)"
  split-cash: "oklch(60% 0.2 14)"
  on-accent: "oklch(100% 0 0)"
typography:
  figure:
    fontFamily: "Geist Variable, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 5vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.045em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Geist Variable, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 2vw, 1.875rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  section:
    fontFamily: "Geist Variable, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist Variable, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist Variable, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist Variable, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: "Geist Variable, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  badge: "6px"
  control: "8px"
  button: "8px"
  card: "12px"
  round: "50%"
spacing:
  stack: "20px"
  column-gap: "24px"
  card-pad-sm: "20px"
  card-pad: "24px"
  answer-pad: "28px 32px"
  rail: "248px"
  screen-max: "1180px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0.55rem 1rem"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-quiet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "0.55rem 1rem"
    height: "40px"
  button-quiet-hover:
    backgroundColor: "{colors.canvas-deep}"
  button-small:
    rounded: "{rounded.button}"
    padding: "0.35rem 0.75rem"
    height: "34px"
  edit-chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "0.3rem 0.7rem"
    height: "32px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 0.85rem"
    height: "40px"
  segmented:
    backgroundColor: "{colors.canvas-deep}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.button}"
    padding: "0.2rem"
  segmented-thumb:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.badge}"
  pill-positive:
    backgroundColor: "{colors.positive-pale}"
    textColor: "{colors.positive}"
    rounded: "{rounded.badge}"
    padding: "0.2rem 0.55rem"
  pill-caution:
    backgroundColor: "{colors.caution-pale}"
    textColor: "{colors.caution}"
    rounded: "{rounded.badge}"
    padding: "0.2rem 0.55rem"
  pill-live:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.badge}"
  nav-item:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "0.35rem 0.6rem"
    height: "36px"
  nav-item-current:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
  side-rail:
    backgroundColor: "{colors.panel}"
    width: "{spacing.rail}"
---

# Design System: BTO Radar

## Overview

**Creative North Star: "The Ledger in Daylight"**

BTO Radar is a money tool for people with a real decision in front of them: can we afford a flat, which launch, and when the money is due. It reads like a top-tier financial dashboard (the owner's bar is Stripe Dashboard): a white page, white cards edged by cool-grey hairlines, near-black ink, and every figure traceable to its inputs. The system is light only. The owner asked for a "white sleek clean theme instead of the dark", so there is no dark mode and no theme switch.

Density is that of a working dashboard, not a landing page. A fixed pale-grey rail on the left, a page title with one factual line, then two-column rows of panels. Emphasis comes from the size and weight of the numbers, not from colour or ornament. Raspberry is the one accent and is rare on purpose. The signature is the four-colour money split bar, which appears wherever a price is broken into loan, grant, CPF by keys and cash.

The system rejects the consumer-app look: tinted canvases, dark hero cards, icon tiles on rows, pill buttons, drawn illustrations on working screens, decorative gradients and glassmorphism.

**Key Characteristics:**
- White page and cards; depth from 1px hairlines, not floating shadows.
- One typeface, Geist, at 400/500/600 with tabular figures.
- Large semibold numbers carry the hierarchy.
- Raspberry only on primary actions, focus, the current nav icon, live marks and selection rings.
- Four fixed money-split colours that mean the same thing everywhere.
- Quiet, exact motion: numbers count, bars grow once, nothing bounces.

## Colors

A white, cool-grey neutral system with a single raspberry accent, two status hues, and four fixed data colours for money sources.

### Primary
- **Raspberry** (`accent`): primary buttons, focus outlines and input focus rings, the current nav icon, the live launch badges ("Open", the current launch month), selection rings on chosen cards, tabs and chips, the text caret. Darkens to **Pressed Raspberry** (`accent-hover`) on hover. **Raspberry Mist** (`accent-soft`) is the fill behind a selected chip or choice, always paired with a raspberry ring.

### Status
- **Ledger Green** (`positive`, on `positive-pale`): within budget, done, the grant, gains, and the completed-step check in the rail.
- **Ochre** (`caution`, on `caution-pale`): over budget, above an income ceiling, a shortfall.
- **Gold** (`gold-ink` on `gold-pale`) and **Info Blue** (`info-ink` on `info-pale`): quiet category badges only (Prime and Plus flat types, cash tags, fair odds). Never status verdicts.

### Money split
- **Loan Indigo** (`split-loan`), **Grant Green** (`split-grant`), **CPF Amber** (`split-cpf`), **Cash Raspberry** (`split-cash`): the four sources of a price, in that order, in every split bar and legend dot.

### Neutral
- **Paper White** (`canvas`, `card`): the page and every resting surface.
- **Rail Grey** (`panel`): the left navigation rail.
- **Quiet Fill** (`canvas-deep`): segmented-control tracks, the setup running-total panel, quiet-button hover, small type badges, skeletons.
- **Hairline** (`hairline`) and **Strong Hairline** (`hairline-strong`): card edges and dividers; button, input and chip outlines.
- **Ink** (`ink`): headings, figures and primary text. **Slate** (`ink-2`): body copy and nav labels. **Mute** (`mute`): sublines, labels, legends. **Faint** (`faint`): resting nav icons.

### Named Rules
**The Raspberry Is Not for Reading Rule.** Raspberry marks what you can act on or what is live: primary actions, focus, the current nav icon, live marks and selection rings. It is never the colour of body text, labels or decorative icons.

**The No Red Verdict Rule.** Over budget is ochre, never red. Green means within budget, gains or grant. Status is always carried by an icon or word as well as colour.

**The Fixed Split Rule.** Loan, grant, CPF by keys and cash always use their four split colours, in that order, and those colours mean nothing else.

## Typography

**Display Font:** Geist (self-hosted variable, with ui-sans-serif, system-ui fallback)
**Body Font:** Geist
**Label/Mono Font:** Geist with tabular numerals

**Character:** One neutral, engineered face doing every job. Hierarchy comes from size, weight (400/500/600 only) and tight negative tracking on large numbers, never from a second family.

### Hierarchy
- **Figure** (600, clamp(2.6rem, 5vw, 3.5rem), 1.0, -0.045em, tabular): the answer figure on Home. The Plan headline figure sits a step down (up to 3.2rem); the setup result goes up to 4.2rem; the running total is 2.1rem.
- **Headline** (600, clamp(1.6rem, 2vw, 1.875rem), 1.15, -0.03em): page titles ("Home", "Projects", "Plan"); setup questions run slightly larger (up to 2rem).
- **Section** (600, 1.05rem, -0.015em): card headings such as Home's next step, plain sentence case.
- **Title** (600, 1rem, -0.015em): card titles.
- **Body** (400, 15px, 1.55): copy and descriptions, capped near 52 to 60ch.
- **Label** (500, 0.85 to 0.9rem): buttons, nav items, field labels, footnote rows.
- **Caption** (500, 0.8rem): legends, hints, credits; badges run 0.65 to 0.78rem.

### Named Rules
**The One Face Rule.** Geist is the only typeface. No second family, no system display face, no weights above 600.

**The Tabular Figures Rule.** Every number that can sit beside another (prices, dates, amounts, legends) uses tabular numerals.

**The Sentence Case Rule.** Headings are sentence case at their size. No uppercase tracked labels, eyebrows or kickers above headings.

## Layout

On desktop (1024px and up) a fixed 248px pale-grey rail sits on the left with a hairline right edge; the main column is padded 2.5rem top and clamp(1.75rem, 3.5vw, 3.5rem) at the sides, and screens cap at 1180px. Below 1024px the rail becomes a top bar and a five-item bottom tab bar (near-opaque white with a hairline top).

Screens are a single vertical stack with a 1.25rem gap. Home is a 12-column grid from 900px (1.25rem gap): the answer panel spans 8 and the launch panel 4; the next-step card spans 12. Other screens split into two equal columns from 1100px (1.5rem gap); Plan uses 1.05fr / 0.95fr with the right column sticky. Each screen opens with a page head: title and one factual subline on the left, secondary buttons right-aligned to the bottom edge. Cards pad 1.25rem, 1.5rem from 640px; answer panels pad 1.75rem 2rem. 

## Elevation & Depth

Flat and edged. Resting surfaces are white on white, separated by a 1px hairline drawn as a box-shadow ring plus a barely visible 1px drop. Only overlays (the setup dialog, the detail sheet, the compare dock) and a hovered project card lift with a real shadow. Grouped and secondary areas use the Quiet Fill instead of elevation.

### Shadow Vocabulary
- **Card edge** (`0 0 0 1px hairline, 0 1px 2px ink/4%`): every resting card and panel.
- **Float** (`0 0 0 1px ink/6%, 0 24px 48px -16px ink/24%, 0 8px 16px -8px ink/10%`): dialogs, sheets, the dock, and project cards on hover.
- **Button edge** (`0 1px 1px ink/8%, 0 0 0 1px hairline-strong`): quiet buttons and edit chips.
- **Selection ring** (`inset 0 0 0 2px accent` over the card edge): a selected project card or launch tab.

### Named Rules
**The Edged, Not Floated Rule.** A resting card never floats. If it needs separation, it gets a hairline; only things above the page, or a card under the pointer, get a shadow.

## Shapes

Small, consistent radii: 6px badges and pills, 8px for every control (buttons, inputs, chips, nav items, the split bar), 12px for every card and panel. Circles are reserved for status marks, legend dots and timeline dots. No pill-shaped buttons. The split bar's segments are 3px-rounded with 3px gaps.

## Components

### Buttons
Compact and exact.
- **Shape:** 8px corners, 40px tall (34px small).
- **Primary:** raspberry fill, white label, a darker raspberry 1px ring and faint top highlight. One primary per panel. A trailing arrow nudges 3px right on hover.
- **Quiet:** white with the button edge, ink label; hover fills Quiet Fill. Used for every secondary action and the page-head actions (Share, Add to calendar, Print, Edit answers).
- **Press:** sinks 0.5px. Disabled at 40% opacity.
- **Text link:** ink, semibold, underlined with a faint raspberry underline that strengthens on hover.

### Chips and Badges
- **Choice chips:** white with a strong hairline ring, 8px corners; selected gets Raspberry Mist and a raspberry ring, ink text.
- **Status pills:** 6px corners, pale status fill with the status hue as text (green or ochre), always with an icon or word.
- **Live mark:** a small solid raspberry badge with white text on the current launch.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Paper White.
- **Shadow Strategy:** card edge only (see Elevation).
- **Internal Padding:** 20px, 24px from 640px; answer panels 28px 32px.
- **Footnote row:** a limiting factor or source sits at the card's foot above a hairline, with a muted info glyph and slate text.

### Inputs / Fields
- **Style:** white, 8px corners, strong-hairline inset ring, 40px tall, 0.95rem medium text; units sit inside the field.
- **Hover:** ring darkens toward ink.
- **Focus:** raspberry 1px ring plus a 3px soft raspberry glow; caret is raspberry.
- **Segmented control:** Quiet Fill track with a hairline, a white sliding thumb (320ms) under the selected option, which turns semibold ink.

### Navigation
- **Rail:** Rail Grey, 0.9rem medium items in Slate with Faint icons. Hover tints 5% ink. The current item is a white raised row with ink text and a raspberry icon. A small green check marks a completed step. Sources sits in a quieter group below a hairline; an "Estimates, not advice" note sits at the foot.
- **Mobile:** a three-item bottom tab bar (Home, Projects, Plan); the current icon is raspberry, its label ink.
- **Three screens, one job each.** Home answers "what can we afford", Projects "which flat", Plan "what do we pay when". Sources is a quiet link, not a destination.
- **Progressive disclosure.** Only what every buyer needs is shown; the HFE letter and the method sit behind disclosures, and eligibility appears only when it blocks or changes a purchase.

### Money Split (signature)
A 0.7rem bar of up to four segments (loan, grant, CPF by keys, cash) in the fixed split colours with 3px gaps, over a legend: coloured dot, muted label, semibold tabular figure. Segments grow from the left once (700ms). It appears wherever a price is broken down: the Home answer, Plan and the setup result.

### Answer Panel
Home's lead panel: a muted plain label ("You can afford a flat up to"), the Figure, one line on the monthly repayment and how much of it is cash, the split bar, any blocking eligibility warning, one primary button, then a footer: the inputs it came from with a Change link, what limits the ceiling, and two disclosures ("Got your HFE letter?", "How we work this out"). It is a white card, not a dark or tinted hero. Beside it, the launch panel lists the flats that fit; below, one next-step card (pick a flat, or the next payment).

### Guided Setup
A white dialog of five questions (who is buying, income, savings with optional cash, first-timer status, flat size) that rises 16px on open: a progress strip, one question per step (sliding in 14px with a fade), large choice cards with a radio ring that fills when chosen, and a Quiet Fill running-total panel beside the questions. It ends on a result whose figure counts up from zero over 900ms, with the split and three plain facts.

### Motion
All motion uses `cubic-bezier(0.16, 1, 0.3, 1)`. Numbers count to new values over about 500ms; split bars grow once; screens cross-fade through the View Transitions API (120ms out, 220ms in) while the rail stays put. Nothing bounces, pulses or spins, and under `prefers-reduced-motion` everything settles instantly.

## Do's and Don'ts

### Do:
- **Do** lead each screen with its title and one factual line, then the answer, then the inputs that change it.
- **Do** edge resting cards with the hairline ring and keep them white.
- **Do** use the four-colour split bar wherever a price is broken down, with figures in the legend.
- **Do** set every comparable number in tabular Geist, and let size and weight carry emphasis.
- **Do** keep raspberry to one primary action per panel plus focus, the current nav icon, live marks and selection rings.
- **Do** pair every status colour with an icon or word.

### Don't:
- **Don't** add a dark mode, a theme switch, a tinted canvas or a dark hero card.
- **Don't** add a second typeface, a second accent or weights above 600.
- **Don't** set reading text, labels or decorative icons in raspberry.
- **Don't** show over budget in red; use ochre.
- **Don't** put icon tiles on rows or illustrations on working screens.
- **Don't** use pill-shaped buttons, decorative gradients, glassmorphism or floating shadows on resting cards.
- **Don't** put uppercase eyebrow or kicker labels above headings.
- **Don't** animate with bounce, pulse or spin, or ignore reduced motion.
