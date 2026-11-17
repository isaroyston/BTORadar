# Roadmap

Goal: one place a Singapore buyer can settle everything about a BTO, from "can we afford it" to keys and beyond. Every number should be correct, traceable to a rule, and useful to act on.

Updated 2026-11-17. Policy figures live in `frontend/src/policies/policyConfig.ts` and `frontend/src/utils/journey.ts`; reference data in `frontend/public/data/`.

## Built

**2026-11-17, first pass**
- Guided setup dialog with a running ceiling, and a result.
- Home dashboard: the ceiling and what limits it, the open launch, eligibility, levers, and the road to keys.
- A sleeker neutral-and-ink look.

**2026-11-17, second pass: the rest of the roadmap**
- **Income ceilings updated** to the National Day Rally 2026 change for HFE applications from 24 Aug 2026: S$16,000 for families and HDB loans, and S$8,000 for singles and 2-room Flexi. The grant ceilings are unchanged. This comes from consistent secondary reports; it still needs checking against HDB's own page.
- **HFE letter mode.** Enter the letter's loan and grant, and the ceiling, payments and checks all use them. It shows our estimate alongside and warns as the 9 months run out.
- **Singles and older buyers.** The setup asks who's buying and their ages. The age is income-weighted for couples, as HDB does it. Singles get one CPF wage ceiling, the singles grant table (up to S$4,500 of income), the 35-and-over rule and the 2-room Flexi limit. The loan tenure ends at 65.
- **Ballot chances.**
  - Chances follow HDB's rules: 2, or 3 for FT(PMC). After two unsuccessful Standard applications, each Standard application adds one, up to 4 (5). Plus and Prime get none extra. Singles and second-timers get 1.
  - Rough odds per project come from the November 2026 application rates: HDB's figures at 12.10pm on 10 Nov 2026, during the window, via 99.co.
- **BTO vs resale.** Median resale prices from data.gov.sg (Dec 2025 to Nov 2026, 24,852 sales) by town and flat size, using flats under 15 years old where there are enough sales. Shown on Home for the latest launch and in every project's detail sheet.
- **Commute check.** One or two workplaces, found with OneMap's keyless search. Each project shows its straight-line distance, with a link to public transport directions.
- **Monthly cost of owning:**
  - the repayment and how much CPF covers
  - S&CC ranges from three town councils
  - IRAS's 2025 owner-occupier property tax rule
  - HDB fire insurance
  - the Home Protection Scheme, linked to CPF
- **After keys.** When the minimum occupation period ends (5 years for Standard, 10 for Plus and Prime), the loan left then, total interest and the payoff date.
- **Share with your partner.** A link that carries the plan in its hash, so no server is involved. Whoever opens it chooses whether to load it.
- **Calendar file** (.ics) covering the HFE expiry, the next launch, each step for the chosen project and the end of the minimum occupation period.
- **Print** layout for a one-document summary.
- **Dark mode**, following the system or set from a switch.

## Not built, and why

| Idea | Why not | What would unlock it |
| --- | --- | --- |
| **Singpass Myinfo** | Only organisations with a UEN, approved by GovTech, can use it. It needs a backend for signed and encrypted OIDC tokens, plus PDPA obligations. | A registered entity and an approved use case. |
| **CPF or HDB account data** | There's no public API for members' balances or HFE results. | Nothing for now; HFE mode covers the trust gap. |
| **Accounts and partner sync** | Needs a backend and a database, which this static Vercel site doesn't have. The share link covers the main need. | A small backend (e.g. Supabase) and a decision on storing personal finances. |
| **Ask BTO Radar** (Q&A on HDB and CPF documents) | Needs a server-side model API key and a budget. | A Vercel function, an API key and rate limits. |
| **Door-to-door travel times** | OneMap routing needs an account token. Google's needs a paid key. | A OneMap account; times computed at build time for the current launch. |

## Data to keep fresh

- `npm run data:recordbto`, then `npm run data:merge-bto`, after each launch.
- `frontend/public/data/hdb/application-rates.json` by hand after each launch, from HDB's application status page. Final figures are better than mid-window ones.
- `npm run data:resale` monthly.
- `frontend/public/data/hdb/scc-rates.json` when town councils revise rates.
- Check the 24 Aug 2026 income ceilings against HDB's eligibility page.

## Principles

- No number without a rule behind it. Estimates say so, and the HFE letter overrides them.
- Everything works without an account. Data stays in the browser unless the user chooses otherwise.
- No unbudgeted paid APIs. Data that changes slowly gets built into static files.
