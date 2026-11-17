<p align="center">
  <img src=".github/assets/logo.svg" alt="BTO Radar" width="820">
</p>

<p align="center">
  <strong>Flat math for BTO humans.</strong><br>
  A React + TypeScript planner for Singapore HDB new-flat decisions, grants,
  payment timing, and BTO comparisons.
</p>

<p align="center">
  <a href="https://react-app-ashy-chi.vercel.app/" target="_blank"><strong>Live App →</strong></a>
</p>

## What It Does

- Works out a price ceiling from income and CPF (cash is optional), for couples or single buyers, using HDB's
  loan-to-value and income limits and the buyers' income-weighted average age for the loan tenure. Each payment is checked on its own date: the grant
  is credited before signing, and CPF keeps building up until keys at CPF's 2026
  allocation rates. Each project is checked with its own launch and keys dates.
  HFE remains authoritative.
- Looks up Enhanced CPF Housing Grant bands for first-timer families, mixed couples and singles, or uses the
  loan and grant from the buyer's HFE letter when they enter it.
- Models downpayment, option fee, survey fee, and fire insurance scenarios.
- Builds an average payment timeline from application through key collection.
- Compares flat-size-specific BTO projects from the generated RecordBTO backfill.
- Saves scenarios in the browser with JSON import/export for tester handoff.

## Product Surfaces

- **Home**: the front door and dashboard.
  - New visitors get a six-question start, the launch that's open now and the steps from HFE letter to keys.
  - The answer card: the price ceiling, where its money comes from, what sets it, and a tag when it comes from an HFE letter.
  - **Before you apply**: what you qualify for (the income ceilings as raised for HFE applications from 24 Aug 2026: S$ 16,000 for families and HDB loans, S$ 8,000 for singles and 2-room Flexi; singles from 35; the grant; first-timer priority); your HFE letter (enter its loan and grant and every figure uses them; it warns before the 9 months run out); your ballot chances (2, 3 for FT(PMC), more after unsuccessful Standard tries, none extra for Plus and Prime) with rough odds per project from the current launch's application rates; and what would raise the ceiling.
  - **Choosing a project**: straight-line distance from one or two workplaces (found with OneMap) with public transport directions, and each project's price against resale flats in the same town (data.gov.sg, last 12 months, flats under 15 years old where there are enough sales).
  - **Once you own it**: the monthly cost (repayment and how much CPF covers, S&CC range, property tax rule, fire insurance, Home Protection Scheme) and after keys (minimum occupation period end, loan left then, total interest).
  - The road to keys with each payment's date and its grant, CPF and cash.
  - **Share** copies a link that carries the plan in its hash (nothing is sent to a server; the person opening it chooses whether to load it). **Add to calendar** saves an .ics file of the dates. **Print** gives a clean one-document summary.
- **Guided setup**: a step-by-step dialog (who's buying and ages, each person's income and CPF, first-timer status, optional cash, flat size) with the ceiling building up beside the questions and a result at the end. Closing it early puts the previous answers back. Opened from Home ("Start", "Edit answers") and from an empty Budget.
- **Look**: a white, Stripe-Dashboard-level light theme in Geist (self-hosted), with raspberry as the one accent. See [`DESIGN.md`](DESIGN.md).
- **Budget**: one price ceiling; your answers (income, CPF savings, optional cash, first-timer status) directly under it as the one place to edit; what sets the ceiling; then the breakdown. Age comes from the guided setup (assumed under 35 if left blank), and monthly CPF is worked out from income and age.
- **Projects**: launches; resale prices in the same town in each project's detail sheet; a "What matters most" choice that is always visible (best all-round, lowest price, near the MRT, soonest keys, or a fine-tuned mix); cards with a OneMap street map of the site, a rank, the price checked against the ceiling, and facts led by what the buyer ranked highest; a detail sheet with highlights, keys date, blocks and nearby schools and parks; saved projects; and side-by-side compare.
- **Plan**: target price, loan and downpayment choices, whether it fits (asking income and CPF in place if they're missing), whether CPF covers the monthly repayment, and a payment timeline showing grant, CPF and cash per payment. Saves automatically.

The visual system is described in [`DESIGN.md`](DESIGN.md).

## Structure

- [`frontend`](frontend): Vite React app.
- [`backend`](backend): data refresh scripts and local policy source documents.

## Run Locally

```bash
npm install --prefix frontend
npm.cmd run dev
```

## Check The App

```bash
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

`npm test` runs the scoring, affordability, grant, fee, payment-allocation, CPF-projection, eligibility/journey and extras (singles, HFE, ballot, ownership, calendar, share links) checks.

## Saved Scenarios

The Purchase Plan page lets users save a scenario in browser `localStorage`,
download it as JSON, and load a previously exported JSON file. No account or
server storage is required.

## Refresh BTO Data

```bash
npm.cmd run data:recordbto
```

This replaces `frontend/public/data/recordbto/projects.json` with the current
RecordBTO project scrape. The scraper is dependency-free and uses the project
count reported by `https://recordbto.com/bto`.

It then runs `data:recordbto:details`, which reads each recent or undated project's
page for HDB's announced waiting time, block count, tallest block, highlights and
nearby places, and writes `frontend/public/data/recordbto/details.json`. The merge
folds these in and adds `estimatedKeys` (launch month + 3 months to booking + the
waiting time) for projects without a published completion date. The app shows those
as "About Apr 2030" and uses them for payment dates and the "soonest keys" ranking.

Site coordinates come from BTOHQ's map links. For projects BTOHQ doesn't place,
`npm run data:onemap` searches OneMap for the project name, then each road in its
address, and writes `frontend/public/data/onemap/coordinates.json`; the merge uses a
point only if it is within 3 km of the MRT station the listing names.

Project maps are not stored: each card loads a static street map from OneMap
(Singapore Land Authority, keyless, at most 512 px a side) using the project's
coordinates.

## Other reference data

- `npm run data:resale` rebuilds `frontend/public/data/resale/medians.json`: median
  resale prices by town and flat type over the latest 12 months from data.gov.sg (no
  key), overall and for flats under 15 years old.
- `frontend/public/data/hdb/application-rates.json` holds applicants per flat for the
  current launch, by project and flat size, for first-timer families, second-timer
  families and singles. Update it by hand after each launch from HDB's application
  status page; the Home ballot card only shows rates whose `launch` matches the
  newest launch in the data.
- `frontend/public/data/hdb/scc-rates.json` holds normal S&CC rates from three town
  councils; refresh when they change.

## Deploy

The root [`vercel.json`](vercel.json) is configured for a repository where the
Vite app is inside `frontend`.

### Vercel Dashboard

1. Push this repository to GitHub.
2. In Vercel, choose **Add New... > Project** and import the GitHub repository.
3. Keep the project root as the repository root so Vercel reads
   [`vercel.json`](vercel.json).
4. Confirm these build settings:

```text
Framework Preset: Vite
Install Command: npm install --prefix frontend
Build Command: npm run build --prefix frontend
Output Directory: frontend/dist
```

5. Deploy. After the first production deployment, share the production URL with
   testers.

If a deployment URL returns `401 Unauthorized`, Vercel Deployment Protection is
enabled for the project or team. In Vercel, open the project settings and set
Deployment Protection to **None** for deployments you want public testers to
open.

### Before Sharing

Run the production build locally:

```bash
npm.cmd run build
```

If BTO data needs to be refreshed before deployment, regenerate it instead of
editing the generated JSON:

```bash
npm.cmd run data:recordbto
```

## Policy Maintenance

Policy constants are centralized in
[`frontend/src/policies/policyConfig.ts`](frontend/src/policies/policyConfig.ts).

When updating policy values:

1. Review the listed official source pages and local PDFs.
2. Update the relevant constants.
3. Set `lastVerified` to the review date.
4. Run `npm.cmd run lint` and `npm.cmd run build`.
