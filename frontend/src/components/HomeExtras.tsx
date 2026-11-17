import { useState, type FormEvent, type ReactNode } from "react";
import { useStaticJson } from "../hooks/useStaticJson";
import { POLICY_CONFIG, type BtoProject } from "../policies/policyConfig";
import type { FlatType } from "../types";
import type { BudgetInputs } from "../utils/budgetStorage";
import { distanceKm, findPlace, projectPoint, transitLink, type Place } from "../utils/commute";
import { addMonths, formatMonthYear, parseMonth } from "../utils/date";
import { currency } from "../utils/format";
import { ballotChances, FLAT_LABELS, roughOdds, type LaunchSnapshot } from "../utils/journey";
import { sccRange, type AfterKeys, type SccData } from "../utils/ownership";
import { Icon, type IconName } from "./DashboardUi";

export type RatesData = {
  launch: string;
  retrievedAt: string;
  note: string;
  source: string;
  sourceUrl: string;
  rows: { projects: string[]; flatType: FlatType; units: number; firstTimer: number; secondTimer: number; singles?: number }[];
};

export type ResaleData = {
  from: string;
  to: string;
  youngYears: number;
  sourceUrl: string;
  towns: Record<string, Partial<Record<FlatType, { median: number | null; sales: number; youngMedian: number | null; youngSales: number }>>>;
};

function CardHead({ icon, title, aside }: { icon: IconName; title: string; aside?: ReactNode }) {
  return (
    <div className="card-head">
      <h2>
        <span className="head-icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
        {title}
      </h2>
      {aside}
    </div>
  );
}

function MoneyInput({ id, label, value, onChange }: { id: string; label: string; value: number | null; onChange: (value: number | null) => void }) {
  const [text, setText] = useState(value === null ? "" : value.toLocaleString("en-SG"));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input input-money">
        <span aria-hidden="true">S$</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={text}
          placeholder="0"
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
            setText(digits ? Number(digits).toLocaleString("en-SG") : "");
            onChange(digits ? Number(digits) : null);
          }}
        />
      </div>
    </div>
  );
}

/* ---------- HFE letter ---------- */

export function HfeCard({
  budget,
  estimatedLoan,
  estimatedGrant,
  onBudgetChange,
}: {
  budget: BudgetInputs;
  estimatedLoan: number;
  estimatedGrant: number;
  onBudgetChange: (patch: Partial<BudgetInputs>) => void;
}) {
  const using = budget.hfeLoan !== null;
  const [editing, setEditing] = useState(false);
  const [loan, setLoan] = useState<number | null>(budget.hfeLoan);
  const [grant, setGrant] = useState<number | null>(budget.hfeGrant);
  const [issued, setIssued] = useState(budget.hfeIssued ?? "");

  const expires = budget.hfeIssued ? addMonths(parseMonth(budget.hfeIssued), 9) : null;
  const monthsLeft = expires ? (expires.getFullYear() - new Date().getFullYear()) * 12 + expires.getMonth() - new Date().getMonth() : null;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (loan === null) return;
    onBudgetChange({ hfeLoan: loan, hfeGrant: grant ?? 0, hfeIssued: /^\d{4}-\d{2}$/.test(issued) ? issued : null });
    setEditing(false);
  };

  return (
    <section className="card home-span-6">
      <CardHead
        icon="document"
        title="Your HFE letter"
        aside={using && !editing ? <span className="pill pill-positive">In use</span> : undefined}
      />
      {using && !editing ? (
        <>
          <dl className="facts">
            <div>
              <dt>HDB loan</dt>
              <dd>{currency(budget.hfeLoan ?? 0)}</dd>
            </div>
            <div>
              <dt>Housing grant</dt>
              <dd>{currency(budget.hfeGrant ?? 0)}</dd>
            </div>
            {expires && (
              <div>
                <dt>Valid until</dt>
                <dd className={monthsLeft !== null && monthsLeft <= 2 ? "is-caution" : ""}>{formatMonthYear(expires)}</dd>
              </div>
            )}
          </dl>
          <p className="card-foot">
            Every figure now uses your letter. We had estimated {currency(estimatedLoan)} and {currency(estimatedGrant)}.
            {monthsLeft !== null && monthsLeft <= 2
              ? monthsLeft < 0
                ? " The letter has run out; apply for a new one before your next application."
                : " It runs out soon; apply for flats before then, or renew it."
              : ""}
          </p>
          <div className="row-actions">
            <button type="button" className="btn btn-quiet btn-small" onClick={() => setEditing(true)}>
              Change
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                onBudgetChange({ hfeLoan: null, hfeGrant: null, hfeIssued: null });
                setLoan(null);
                setGrant(null);
                setIssued("");
              }}
            >
              Go back to estimates
            </button>
          </div>
        </>
      ) : editing || using ? (
        <form className="hfe-form" onSubmit={save}>
          <div className="field-row">
            <MoneyInput id="hfe-loan" label="Maximum HDB loan" value={loan} onChange={setLoan} />
            <MoneyInput id="hfe-grant" label="Enhanced CPF Housing Grant" value={grant} onChange={setGrant} />
          </div>
          <div className="field">
            <label htmlFor="hfe-issued">Month issued (optional)</label>
            <input id="hfe-issued" className="input" type="month" value={issued} onChange={(event) => setIssued(event.target.value)} />
          </div>
          <div className="row-actions">
            <button type="submit" className="btn btn-primary btn-small" disabled={loan === null}>
              Use these figures
            </button>
            <button type="button" className="text-link" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="card-text">
            The HFE letter is HDB's answer on whether you can buy, how much it will lend and your grant. Enter its figures
            and every number here uses them instead of our estimates.
          </p>
          <p className="card-foot">
            Apply on HDB's Flat Portal with Singpass. It takes about a month and lasts 9 months. Our estimate today: a
            loan of {currency(estimatedLoan)} and a grant of {currency(estimatedGrant)}.
          </p>
          <div className="row-actions">
            <button type="button" className="btn btn-quiet btn-small" onClick={() => setEditing(true)}>
              Enter my letter
            </button>
            <a className="text-link" href="https://homes.hdb.gov.sg/home/finding-a-flat" target="_blank" rel="noreferrer">
              HDB Flat Portal
              <Icon name="external" />
            </a>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- Ballot chances ---------- */

export function BallotCard({
  budget,
  flatType,
  launch,
  rates,
  onBudgetChange,
}: {
  budget: BudgetInputs;
  flatType: FlatType;
  launch: LaunchSnapshot | null;
  rates: RatesData | null;
  onBudgetChange: (patch: Partial<BudgetInputs>) => void;
}) {
  const single = budget.household === "single";
  const firstTimerCouple = !single && budget.firstTimers === "both";
  const profile = { pmc: budget.pmc, unsuccessfulStandard: budget.unsuccessfulStandard };
  const standard = ballotChances({ household: budget.household, firstTimers: budget.firstTimers, profile, standard: true });
  const plus = ballotChances({ household: budget.household, firstTimers: budget.firstTimers, profile, standard: false });
  const group = single ? "first-timer singles" : firstTimerCouple ? "first-timer families" : "second-timer families";
  const typical = firstTimerCouple ? 2 : 1;
  const ratesHere = rates && launch && rates.launch === launch.label ? rates : null;
  const rows = ratesHere
    ? launch!.projects
        .map((project) => {
          const row = ratesHere.rows.find((item) => item.flatType === flatType && item.projects.includes(project.id));
          if (!row) return null;
          const rate = single ? row.singles ?? null : firstTimerCouple ? row.firstTimer : row.secondTimer;
          if (rate === null) return null;
          const chances = (project.btoType ?? "").toLowerCase() === "standard" ? standard.chances : plus.chances;
          return { project, rate, odds: roughOdds(rate, chances, typical), shared: row.projects.length > 1 };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .sort((a, b) => b.odds - a.odds)
    : [];

  return (
    <section className="card home-span-6">
      <CardHead icon="target" title="Your ballot chances" />
      <div className="ballot-big">
        <strong>{standard.chances}</strong>
        <span>
          {standard.chances === 1 ? "ballot chance" : "ballot chances"}
          {firstTimerCouple && plus.chances !== standard.chances ? ` for Standard flats, ${plus.chances} for Plus and Prime` : " per application"}
        </span>
      </div>
      {firstTimerCouple && (
        <div className="ballot-inputs">
          <label className="check-row">
            <input type="checkbox" checked={budget.pmc} onChange={(event) => onBudgetChange({ pmc: event.target.checked })} />
            <span>Married and both 40 or under, or a parent of a child 18 or under</span>
          </label>
          <div className="stepper-row">
            <span>Unsuccessful Standard applications since Oct 2024</span>
            <div className="stepper">
              <button
                type="button"
                aria-label="One fewer"
                onClick={() => onBudgetChange({ unsuccessfulStandard: Math.max(budget.unsuccessfulStandard - 1, 0) })}
              >
                −
              </button>
              <output aria-live="polite">{budget.unsuccessfulStandard}</output>
              <button
                type="button"
                aria-label="One more"
                onClick={() => onBudgetChange({ unsuccessfulStandard: Math.min(budget.unsuccessfulStandard + 1, 20) })}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="card-foot">
        {firstTimerCouple
          ? "First-timer families get 2, or 3 if married and 40 or under or with a young child. After two unsuccessful Standard applications, each Standard application adds one, up to 4 (5). Plus and Prime add none."
          : single
            ? "Singles get one chance per application, and compete for a share of 2-room Flexi flats."
            : "Second-timer families get one chance, and fewer flats are set aside for them."}
      </p>
      {rows.length > 0 && (
        <>
          <h3 className="sub-head">
            {launch!.label}, {FLAT_LABELS[flatType]}, for {group}
          </h3>
          <ul className="odds">
            {rows.map((row) => (
              <li key={row.project.id}>
                <span>
                  <strong>{row.project.name}</strong>
                  <span>
                    {row.rate.toLocaleString("en-SG", { maximumFractionDigits: 1 })} applicants per flat
                    {row.shared ? " (with its twin)" : ""}
                  </span>
                </span>
                <span className={row.odds >= 0.9 ? "odds-pill is-good" : row.odds >= 0.4 ? "odds-pill is-fair" : "odds-pill"}>
                  {row.odds >= 0.9 ? "Good" : `About 1 in ${Math.max(Math.round(1 / row.odds), 2)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="card-foot">
            A rough guide: one in (applicants per flat), adjusted for your chances. HDB's figures at {ratesHere!.retrievedAt},
            during the window.{" "}
            <a className="text-link-inline" href={ratesHere!.sourceUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          </p>
        </>
      )}
    </section>
  );
}

/* ---------- Commute ---------- */

export function CommuteCard({
  places,
  projects,
  flatType,
  onPlacesChange,
}: {
  places: Place[];
  projects: BtoProject[];
  flatType: FlatType;
  onPlacesChange: (places: Place[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = places.length === 0 ? "Your work" : "Partner's work";

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const found = await findPlace(query);
      if (!found) setError("Couldn't find that. Try a postal code or a building name.");
      else {
        onPlacesChange([...places, { label, ...found }].slice(0, 2));
        setQuery("");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  };

  const ranked = projects
    .filter((project) => projectPoint(project) && project.flatVariants.some((variant) => variant.type === flatType))
    .map((project) => ({
      project,
      distances: places.map((place) => distanceKm(projectPoint(project)!, place)),
    }))
    .sort((a, b) => a.distances.reduce((s, d) => s + d, 0) - b.distances.reduce((s, d) => s + d, 0));

  return (
    <section className="card home-span-6">
      <CardHead icon="map" title="How far from work" />
      {places.length > 0 && (
        <ul className="places">
          {places.map((place, index) => (
            <li key={`${place.label}-${index}`}>
              <span>
                <strong>{place.label}</strong>
                <span>{place.address}</span>
              </span>
              <button
                type="button"
                className="round-btn round-btn-small"
                aria-label={`Remove ${place.label}`}
                onClick={() => onPlacesChange(places.filter((_, other) => other !== index))}
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {places.length < 2 && (
        <form className="place-form" onSubmit={add}>
          <label htmlFor="place-query" className="sr-only">
            {label}: postal code or building
          </label>
          <input
            id="place-query"
            className="input"
            placeholder={places.length === 0 ? "Your workplace: postal code or building" : "Partner's workplace (optional)"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="btn btn-quiet btn-small" disabled={busy || !query.trim()}>
            {busy ? "Finding…" : "Add"}
          </button>
        </form>
      )}
      {error && <p className="form-error">{error}</p>}
      {places.length > 0 && ranked.length > 0 && (
        <ul className="odds">
          {ranked.map(({ project, distances }) => (
            <li key={project.id}>
              <span>
                <strong>{project.name}</strong>
                <span>{project.location}</span>
              </span>
              <span className="commute-cells">
                {distances.map((distance, index) => {
                  const link = transitLink(project, places[index]);
                  return link ? (
                    <a key={index} href={link} target="_blank" rel="noreferrer" title={`Public transport to ${places[index].label}`}>
                      {distance.toFixed(1)} km
                    </a>
                  ) : (
                    <span key={index}>{distance.toFixed(1)} km</span>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="card-foot">
        {places.length === 0
          ? "Projects in the latest launch, ranked by straight-line distance. Addresses are found with OneMap and stay in this browser."
          : "Straight-line distance; tap a distance for public transport directions."}
      </p>
    </section>
  );
}

/* ---------- New vs resale ---------- */

export function ResaleCard({
  projects,
  flatType,
  resale,
  launchLabel,
}: {
  projects: BtoProject[];
  flatType: FlatType;
  resale: ResaleData | null;
  launchLabel: string;
}) {
  if (!resale) return null;
  const rows = projects
    .map((project) => {
      const price = project.flatVariants.find((variant) => variant.type === flatType)?.basePrice ?? 0;
      if (!price) return null;
      const town = resale.towns[(project.location ?? "").toUpperCase()]?.[flatType];
      const compare = town?.youngMedian ?? town?.median ?? null;
      return { project, price, compare, young: Boolean(town?.youngMedian), sales: town?.youngMedian ? town.youngSales : town?.sales ?? 0 };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => (b.compare ? b.compare - b.price : -Infinity) - (a.compare ? a.compare - a.price : -Infinity));
  if (rows.length === 0) return null;

  return (
    <section className="card home-span-6">
      <CardHead icon="chart" title="New flat vs resale" />
      <p className="card-text">
        A {FLAT_LABELS[flatType]} in the {launchLabel} launch against resale flats in the same town, sold{" "}
        {monthLabel(resale.from)} to {monthLabel(resale.to)}.
      </p>
      <ul className="odds">
        {rows.map((row) => (
          <li key={row.project.id}>
            <span>
              <strong>{row.project.name}</strong>
              <span>
                {currency(row.price)}
                {row.compare
                  ? ` vs ${currency(row.compare)} resale${row.young ? `, under ${resale.youngYears} years old` : ""} (${row.sales} sales)`
                  : ` · no resale ${resaleLabel(flatType)} in ${row.project.location} yet`}
              </span>
            </span>
            {row.compare && (
              <span className={row.compare > row.price ? "lever-delta is-up" : "lever-delta"}>
                {row.compare > row.price ? `${currency(row.compare - row.price)} less` : `${currency(row.price - row.compare)} more`}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="card-foot">
        Median resale prices from{" "}
        <a className="text-link-inline" href={resale.sourceUrl} target="_blank" rel="noreferrer">
          data.gov.sg
        </a>
        . Plus and Prime flats repay part of this gap as a subsidy recovery when sold.
      </p>
    </section>
  );
}

// Resale 2-room flats include older non-Flexi ones, so they are named by size only.
function resaleLabel(flatType: FlatType) {
  return flatType === "executive" ? "executive flats" : `${flatType} flats`;
}

function monthLabel(value: string) {
  return formatMonthYear(parseMonth(value));
}

/* ---------- Monthly cost ---------- */

export function CostCard({
  monthly,
  monthlyCpf,
  flatType,
  scc,
}: {
  monthly: number | null;
  monthlyCpf: number;
  flatType: FlatType;
  scc: SccData | null;
}) {
  const range = sccRange(scc, flatType);
  const repayment = monthly ? Math.round(monthly) : 0;
  const cashForLoan = Math.max(repayment - monthlyCpf, 0);
  const fire = POLICY_CONFIG.fees.fireInsuranceByFlatType[flatType];
  const small = flatType === "2-room";
  return (
    <section className="card home-span-6">
      <CardHead icon="wallet" title="Monthly cost of owning" />
      <ul className="cost-rows">
        <li>
          <span>
            <strong>Loan repayment</strong>
            <span>{cashForLoan > 0 ? `CPF covers ${currency(Math.min(monthlyCpf, repayment))}` : "Covered by CPF"}</span>
          </span>
          <span>{currency(repayment)}</span>
        </li>
        {range && (
          <li>
            <span>
              <strong>Service and conservancy charges</strong>
              <span>Set by your town council, before rebates</span>
            </span>
            <span>
              {currency(Math.round(range.low))} to {currency(Math.round(range.high))}
            </span>
          </li>
        )}
        <li>
          <span>
            <strong>Property tax</strong>
            <span>
              {small
                ? "One- and two-room flats pay none"
                : "Owner-occupied: nothing on the first S$ 12,000 of annual value, then 4% of the next S$ 28,000"}
            </span>
          </span>
          <span>{small ? currency(0) : "Usually small"}</span>
        </li>
        <li>
          <span>
            <strong>Fire insurance</strong>
            <span>HDB's compulsory policy, paid at keys</span>
          </span>
          <span>S$ {fire.toFixed(2)}</span>
        </li>
        <li>
          <span>
            <strong>Home Protection Scheme</strong>
            <span>
              Needed when CPF pays the loan; the premium depends on age and cover.{" "}
              <a className="text-link-inline" href={POLICY_CONFIG.sources.hps.url} target="_blank" rel="noreferrer">
                CPF
              </a>
            </span>
          </span>
          <span>From CPF</span>
        </li>
      </ul>
      <p className="cost-total">
        Cash each month: about <strong>{currency(cashForLoan + Math.round(range?.high ?? 0))}</strong>
        <span>{cashForLoan > 0 ? "the loan beyond CPF, plus S&CC" : "just the S&CC"}</span>
      </p>
      {scc && (
        <p className="card-foot">
          S&CC from {scc.sources.map((source) => source.townCouncil).join(", ")} town councils, checked {scc.checked}.
        </p>
      )}
    </section>
  );
}

/* ---------- After keys ---------- */

export function AfterKeysCard({ after, projectName }: { after: AfterKeys; projectName: string | null }) {
  const rows: { label: string; value: string; note: string }[] = [
    { label: "Keys", value: after.keys, note: projectName ? `Expected for ${projectName}` : "Applying now, with the usual wait" },
    {
      label: "Minimum occupation ends",
      value: after.mopEnds,
      note:
        after.mopYears === 10
          ? "10 years for Plus and Prime. Then you can sell, but part of the subsidy is repaid."
          : "5 years for Standard flats. Then you can sell or rent out the whole flat.",
    },
    { label: "Loan left then", value: currency(Math.round(after.balanceAtMop)), note: `At ${currency(Math.round(after.monthly))} a month` },
    { label: "Interest over the loan", value: currency(Math.round(after.totalInterest)), note: `Paid off ${after.loanEnds}` },
  ];
  return (
    <section className="card home-span-6">
      <CardHead icon="home" title="After keys" />
      <ul className="cost-rows">
        {rows.map((row) => (
          <li key={row.label}>
            <span>
              <strong>{row.label}</strong>
              <span>{row.note}</span>
            </span>
            <span>{row.value}</span>
          </li>
        ))}
      </ul>
      <p className="card-foot">At HDB's 2.6% rate. Paying extra from CPF or cash shortens the loan and cuts the interest.</p>
    </section>
  );
}

/** One line for a project's detail sheet: the town's resale median for the chosen size. */
export function ResaleNote({ project, flatType }: { project: BtoProject; flatType: FlatType }) {
  const resale = useStaticJson<ResaleData>("/data/resale/medians.json");
  if (!resale) return null;
  const price = project.flatVariants.find((variant) => variant.type === flatType)?.basePrice ?? 0;
  const town = resale.towns[(project.location ?? "").toUpperCase()]?.[flatType];
  const compare = town?.youngMedian ?? town?.median ?? null;
  if (!price) return null;
  return (
    <p className="muted resale-note">
      {compare ? (
        <>
          Resale {resaleLabel(flatType)} in {project.location}
          {town?.youngMedian ? `, under ${resale.youngYears} years old,` : ""} sold for a median{" "}
          <strong>{currency(compare)}</strong> from {monthLabel(resale.from)} to {monthLabel(resale.to)}:{" "}
          {compare > price ? `${currency(compare - price)} more than this flat.` : `${currency(price - compare)} less than this flat.`}
        </>
      ) : (
        <>No resale {resaleLabel(flatType)} sold in {project.location} in the past year.</>
      )}
    </p>
  );
}
