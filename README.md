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

- Works out a price ceiling from income, age and CPF (cash is optional), using HDB's
  loan-to-value and income limits. Each payment is checked on its own date: the grant
  is credited before signing, and CPF keeps building up until keys at CPF's 2026
  allocation rates. Each project is checked with its own launch and keys dates.
  HFE remains authoritative.
- Looks up Enhanced CPF Housing Grant bands for first-timer families.
- Models downpayment, option fee, survey fee, and fire insurance scenarios.
- Builds an average payment timeline from application through key collection.
- Compares flat-size-specific BTO projects from the generated RecordBTO backfill.
- Saves scenarios in the browser with JSON import/export for tester handoff.

## Product Surfaces

- **Overview**: the front door. New visitors pick where they are (budget first, a project in mind, or already booked); returning visitors see the next payment and where each step stands.
- **Budget**: income, age and CPF (plus optional CPF-per-month and cash), one price ceiling, and what sets it.
- **Projects**: launches, project cards checked against the ceiling, a detail sheet, saved projects, and side-by-side compare.
- **Plan**: target price, loan and downpayment choices, whether it fits (asking income, age and CPF in place if they're missing), whether CPF covers the monthly repayment, and a payment timeline showing grant, CPF and cash per payment. Saves automatically.

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

`npm test` runs the scoring, affordability, grant, fee, payment-allocation and CPF-projection checks.

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
