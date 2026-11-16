---
name: BTO Radar
description: A housing-money planner for Singapore BTO buyers. Soft pink product UI on one typeface, white cards with soft shadows, one pink headline card per screen with a drawn HDB scene, icon tiles for every figure, one raspberry accent, and calm motion that shows numbers changing.
reference: The owner's reference screens (soft pink Budget, Projects and Plan screens with illustrated headline cards, icon tiles, a match banner, compact project cards and a light sidebar). Earlier references (Wise, Airbnb, NerdWallet) still shape behaviour; the look follows the owner's reference.
colors:
  canvas: "oklch(97.6% 0.008 15)"       # pale pink page ground
  canvas-deep: "oklch(95.4% 0.012 15)"  # notes, tracks
  card: "oklch(100% 0 0)"               # white cards
  hero: "oklch(93.8% 0.038 12)"         # flat pink headline card and sidebar footer
  ink: "oklch(23% 0.015 20)"
  ink-2: "oklch(40% 0.015 20)"
  mute: "oklch(53% 0.012 20)"
  accent: "oklch(57% 0.21 15)"          # raspberry: primary button, active nav, icons, badges only
  accent-soft: "oklch(95.5% 0.03 12)"   # icon tiles, edit chips, selected segment
  positive: "oklch(48% 0.13 152)"       # within budget, done, grant tile
  caution: "oklch(50% 0.11 62)"         # over budget, not covered
  gold: "oklch(78% 0.15 80)"            # tip and match icons only
typography:
  face: "Inter only, 400-800. Tabular numerals wherever digits line up."
  scale: "page title clamp(1.75rem, 2.4vw, 2.1rem)/800; headline figure clamp(2.3rem, 4.4vw, 3.1rem)/800 in ink; card title 1.1rem/700; body 15.5px; caption 0.8rem"
rounded:
  card: 22px
  hero: 24px
  control: 14px
  pill: 999px
---

# BTO Radar design system

## What it is

A planner people open with a real decision in front of them: can we afford a flat, which launch, and when the money is due. It should feel friendly and calm: soft colour, pictures where they help, plain words, and one big answer per screen.

## The look

- **Pale pink canvas, white cards.** Cards have no borders; a soft pink-tinted shadow lifts them.
- **One pink headline card per screen**, full width at the top: a flat pink panel (not a gradient) with the screen's answer on the left and a drawn HDB scene on the right. On phones the scene sits under the text.
- **The scene** (`components/HeroArt.tsx`) is hand-drawn SVG: three HDB blocks with a raspberry roof band, clouds, a sun, trees, and a white badge holding the screen's icon (piggy bank on Budget, calendar on Plan, target on Overview). It uses the palette only, so it stays sharp and costs nothing to load. The sidebar footer carries a quiet version under "Plan smarter. Own sooner."
- **Every figure has an icon.** Stat tiles (loan, grant, CPF, cash) pair a pale icon tile with label and amount. The monthly repayment is a white chip with a calendar icon. Card titles carry a small raspberry icon square. Answer rows lead with an icon.
- **Edit is a chip.** Pale pink pill with a pencil, top-right of the thing it edits.
- **Banners for context.** The tip card (Budget) and match banner (Projects) are white cards with a pale gold icon tile and one action.
- **Pink is the headline card only.** Panels, banners and selected states are white or ink; pink appears as the headline card, pale icon tiles and raspberry glyphs.
- **Inputs stay in reach.** Budget's headline card ends with "Based on" chips for each answer and an "Edit details" button; any chip opens and focuses its field.

## Copy rules

- Screens are titled with their name ("Budget", "Projects", "Plan") plus one factual line. No questions, slogans or accented words.
- The headline card leads with a plain label ("Target price", "You could buy a flat priced up to") and one figure.

## Colour rules

- **Raspberry is for things that should pop, never for reading.** The primary button, the active nav icon, icon glyphs, the "Open" and "In your plan" badges, a saved heart, the selected project's outline, link underlines and focus rings. Figures, headings, links, chips, selected options and edit chips are ink.
- **Status has its own colours.** Green for within budget, done and the grant; ochre for over budget. Over budget is never red.
- Gold appears only inside the tip and match icons.

## Components

- **Headline card.** `HeroCard` with `art="budget" | "plan" | "overview"`.
- **Stat tiles.** `StatTiles`; two per row on phones, icon above the figure.
- **Project card.** A grey OneMap street map of the site on top, carrying the rank ("Top match", "#2") and the type badge. Then name, town, save heart, price with a size chip and fit pill, and up to three facts (price rank, walk to the MRT, place, keys date, project size) ordered by what the buyer ranked highest; the first fact is in ink with a raspberry icon. Footer: Compare and a round arrow to details.
- **What matters most.** A white panel above the cards with four always-visible choices (Best all-round, Lowest price, Near the MRT, Soonest keys); the selected one is filled ink. "Fine-tune" opens sliders with plain labels. A line under the choices says what each card leads with.
- **Detail sheet.** Slides from the right on desktop, up on phones; "Plan this flat" is the one primary action.
- **Segmented control.** White track with a pale pink thumb that slides.
- **Launch tabs.** White; the selected launch has a 2px ink outline.
- **Payments.** Compact numbered rows: what, when (editable), the amount (editable) and CPF or cash tags.

## Motion

- **Numbers count** to new values over 500ms.
- **Screens cross-fade** through the View Transitions API.
- **Nothing slides in on screen change.** Only the ranking and compare panels rise into place when opened.
- **Nothing bounces, pulses or spins.** Everything uses `cubic-bezier(0.16, 1, 0.3, 1)`. Under `prefers-reduced-motion`, nothing moves.

## Do and don't

- **Do** lead every screen with its answer, then the inputs that change it.
- **Do** save automatically.
- **Do** give every figure an icon and a label.
- **Don't** use gradients on the headline card; it is a flat pink panel with a picture.
- **Don't** add a second typeface or a second accent.
- **Don't** show a verdict ("fits", "over") before the person has given their numbers.
