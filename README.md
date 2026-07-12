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

- Estimates a planning loan cap from LTV, MSR/TDSR, age, tenure, rate, debt,
  CPF, and cash inputs. HFE or bank IPA remains authoritative.
- Supports HFE-confirmed EHG, an explicitly conditional first-timer-family
  estimate, no grant, or an unassessed state.
- Models downpayment, option fee, BSD, survey, registration, and applicable HDB
  fire-insurance and Deed-of-Assignment duty scenarios, and identifies
  unallocated buyer payments.
- Builds an average payment timeline from application through key collection.
- Compares flat-size-specific BTO projects from the generated RecordBTO backfill.
- Saves the current scenario in the browser for a later visit.

## Product Surfaces

- **Overview**: selected BTO, target flat price, policy basis, and milestone state.
- **Plan**: assumptions, loan/downpayment math, money snapshot, and saved plan flow.
- **BTO Radar**: launch filters, project cards, price record counts, and send-to-plan action.

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
npm.cmd run test:affordability
npm.cmd run test:ehg
npm.cmd run test:fees
npm.cmd run test:plan-storage
npm.cmd run test:dates
npm.cmd run test:payment-timeline
npm.cmd run test:payment-allocation
npm.cmd run test:scoring
npm.cmd run data:check-bto
```

## Saved Scenarios

The Purchase Plan page saves one scenario in browser `localStorage`. No account
or server storage is required.

## Refresh BTO Data

```bash
npm.cmd run data:recordbto
```

This replaces `frontend/public/data/recordbto/projects.json` with the current
RecordBTO project scrape. The scraper is dependency-free and uses the project
count reported by `https://recordbto.com/bto`.

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
