# Roadmap

Goal: one place a Singapore couple can settle everything about buying a BTO, from "can we afford it" to keys and beyond. Every number should be correct, traceable to a rule, and useful to act on.

Written 2026-11-17. Policy figures are checked against HDB and CPF sources in `frontend/src/policies/policyConfig.ts` and `frontend/src/utils/journey.ts`.

## What changed on 2026-11-17

- **Guided setup.** A five-question dialog (each person's income and CPF, first-timer status, optional cash, flat size). The price ceiling builds up beside the questions, and the setup ends on a result: the ceiling, where its money comes from, how many projects in the newest launch fit, the grant, and whether CPF covers the repayment.
- **Home dashboard.** Replaces the old Overview. It shows the ceiling and what limits it, the launch that's open now and the next expected one, what you qualify for (income ceilings, HDB loan, grant, ballot priority), what would raise the ceiling (more income, more savings, later keys), and the road from HFE letter to keys with each payment's grant, CPF and cash.
- **Sleeker look.** Cool neutral canvas, hairline-edged white cards, a deep-ink answer card, the HDB scene at dusk, and colour-coded money splits. See `DESIGN.md`.

## Can we connect Singpass, CPF or HDB?

| Source | What it would give | Can we use it? |
| --- | --- | --- |
| **Singpass Myinfo** | Verified income (NOA), CPF contribution history, HDB ownership | **Not now.** Only registered organisations (with a UEN) approved by GovTech can use it. That means a backend for OIDC with signed and encrypted tokens, PDPA obligations, and a case made for each data item. It's realistic only if BTO Radar becomes a registered business. |
| **CPF Board** | Live OA balances | **No.** There's no public API for members' accounts. The setup tells people where to find the figure in the CPF app. |
| **HDB Flat Portal / HFE** | Eligibility, loan amount, grant | **No API.** The practical option is letting people type in their HFE letter's figures (see Next). |
| **data.gov.sg** | HDB resale prices by town, flat type and month, free and public | **Yes, now.** A backend script can turn it into static JSON, the same way the RecordBTO data is built. |
| **OneMap** | Addresses, maps (already used), travel times | **Yes.** Static maps are keyless. Routing needs a free account token, so it would run in a build script or a small server function. |
| **HDB application rates** | How oversubscribed each project was | **By hand or by scraping.** HDB publishes rates during and after each launch, but there's no dataset. Ballot odds need these. |

## Next: low-hanging fruit (days each)

1. **HFE letter mode.** Enter the loan and grants from your HFE letter, and every screen uses them in place of estimates, marked "from your HFE letter". The grant engine already has a `confirmed` mode. This is the biggest trust gain for the least work.
2. **BTO vs resale.** For each project's town and flat size, show the median resale price over the last 12 months from data.gov.sg, so the subsidy is visible as a figure.
3. **Share with your partner.** A link that carries the plan in the URL hash (no server), plus a printable one-page summary.
4. **Launch reminders.** A calendar (.ics) file for the next expected launch and for each step on the road to keys.
5. **Singles and older buyers.** Ask age and household type in the setup. Cover singles 35 and up (2-room Flexi, the singles grant and its ceiling) and loan tenure limits past 40.
6. **Dark mode.** The tokens are ready; about 30 literal colours in `index.css` still need tokens.

## Bigger bets (weeks)

- **Ballot odds.** Use past application rates per town, classification and flat size, plus first-timer priority and the extra ballot chance after unsuccessful tries, to estimate "about 1 in N" per project. This needs a curated dataset and careful wording.
- **Commute check.** Each partner adds a workplace, and every project shows door-to-door public transport time (OneMap routing, computed at build time for the current launch).
- **Monthly cost of owning.** Repayment, service and conservancy charges, property tax, fire insurance and the Home Protection Scheme. Only add a figure once its source is pinned.
- **Accounts and partner sync.** Optional sign-in so both partners see one plan on their phones. Everything should still work signed out.

## Moonshots

- **Myinfo sign-in**, once there's a registered entity: income and CPF filled in and verified in one tap.
- **Ask BTO Radar.** A Q&A grounded only on HDB and CPF documents and on the user's own plan, citing its sources.
- **After keys.** MOP countdown, loan balance and CPF interest, and the flat's value against resale prices in the block.

## Principles

- No number without a rule behind it. Estimates say so, and the HFE letter overrides them.
- Everything works without an account. Data stays in the browser unless the user chooses otherwise.
- No unbudgeted paid APIs. Data that changes slowly gets built into static files.
