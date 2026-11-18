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

Three screens, one job each. Everything an ordinary buyer doesn't need was removed on 2026-11-18 (see ROADMAP.md).

- **Home**: what you can afford. New visitors get one question, "What can we afford?", and the launch that's open now. After the setup: the price ceiling, the monthly repayment and how much of it is cash, where the money comes from (the split bar), a warning only if something blocks the purchase, the inputs it came from with a Change link, and what limits it. Two disclosures hold the rest: "Got your HFE letter?" (enter its loan and grant to replace the estimates) and "How we work this out". Beside it, the flats in the current launch you can afford; below, one next step (pick a flat, or the next payment). Share copies a link carrying the plan in its hash, so nothing is sent to a server.
- **Guided setup**: five questions (who's buying, each person's income, savings in CPF with optional cash, first-timer status, flat size), with the ceiling building up beside them and a result at the end. Closing early puts the previous answers back.
- **Look**: a white, Stripe-Dashboard-level light theme in Geist (self-hosted), with raspberry as the one accent. See [`DESIGN.md`](DESIGN.md).
- **Projects**: launches; resale prices in the same town in each project's detail sheet; a "What matters most" choice that is always visible (best all-round, lowest price, near the MRT, soonest keys, or a fine-tuned mix); cards with a OneMap street map of the site, a rank, the price checked against the ceiling, and facts led by what the buyer ranked highest; a detail sheet with highlights, keys date, blocks and nearby schools and parks; saved projects; and side-by-side compare.
- **Plan**: target price, loan and downpayment choices (folded away; most buyers keep an HDB loan), whether it fits (asking income and CPF in place if they're missing), whether CPF covers the monthly repayment, and a payment timeline showing grant, CPF and cash per payment. Saves automatically.

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

`npm test` runs the scoring, affordability, grant, fee, payment-allocation, CPF-projection, eligibility/journey and extras (singles, HFE letter, share links) checks.

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
