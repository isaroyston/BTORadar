---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: ["frontend/src/index.css"]
---

# BTO Radar app

Scope: the whole app shell and its screens (Home, guided setup, Budget, Projects, Plan, Sources). Mode: Operate.

Audience and job: Singapore couples and singles deciding whether they can afford a BTO flat, which launch, and when money is due. They come back to check numbers and steps.

Constraints: light only (owner, 2026-11-17: "white sleek clean theme instead of the dark"); polish bar is Stripe Dashboard (owner's pick); Geist, self-hosted; raspberry kept as the one accent. No decorative gradients, no illustration on working screens.

## Direction contract

THESIS: A money tool that reads like a top-tier financial dashboard: white, exact, quiet, every figure traceable. Refuses the consumer-app look of tinted canvases, icon tiles on every row, dark hero cards and pill buttons.

OWN-WORLD: Pure white page and cards, cool-grey 1px hairlines (no floating shadows on resting cards), a pale grey (#f6f8fa family) for the side rail, grouped panels and quiet fills. Ink near-black text, slate secondary. Geist 400/500/600, tabular figures, large semibold numbers. 8px controls, 12px cards, small 6px badges. Raspberry only on primary actions, focus and live marks; green and amber for status; four fixed split colours for money sources.

STORY: The visitor sees their ceiling and how it is made, sees what they qualify for, picks a project, follows each payment to keys.

FIRST VIEWPORT: Left rail (pale grey, hairline, Geist 14px items; the current item is a white raised row with a raspberry icon). Page title 28px semibold with factual subline and right-aligned secondary buttons. Two-column row: ceiling panel (label, 48px figure, monthly line, four-colour split bar with legend, primary and secondary buttons, limiting factor as a footnote row) and launch panel; then section headings in 16px semibold.

FORM: Stripe Dashboard canon (owner-pinned standing exit; no roll). Signature move: the four-colour money split bar that recurs wherever a price is broken down.

seed: none (owner-pinned canon: Stripe Dashboard named by the owner; no roll was run)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
