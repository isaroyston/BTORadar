import type { BtoProject } from "../policies/policyConfig";
import type { FinancingType, FlatType, TabKey } from "../types";
import type { CeilingResult } from "../utils/cpfProjection";
import { currency } from "../utils/format";
import {
  FLAT_LABELS,
  type CeilingSplit,
  type EligibilityCheck,
  type JourneyStage,
  type LaunchSnapshot,
  type Lever,
} from "../utils/journey";
import { useCountUp } from "../utils/motion";
import { EditChip } from "./Cards";
import { Icon, PageHeader, type IconName } from "./DashboardUi";
import { MoneySplit } from "./MoneySplit";

type HomeTabProps = {
  split: CeilingSplit | null;
  limitedBy: CeilingResult["limitedBy"] | null;
  financing: FinancingType;
  monthlyCpf: number;
  flatType: FlatType;
  checks: EligibilityCheck[];
  levers: Lever[];
  launch: LaunchSnapshot | null;
  ceilingFor: (project: BtoProject) => number;
  journey: JourneyStage[];
  selectedProject: BtoProject | null;
  flatPrice: number;
  onStartSetup: () => void;
  onSelectTab: (tab: TabKey) => void;
};

// What sets the ceiling, in one line under it.
const LIMITS: Record<CeilingResult["limitedBy"], string> = {
  loan: "Your income sets this. Repayments are capped at 30% of it, so more savings would raise it dollar for dollar.",
  keys: "Your savings by keys set this. A loan covers at most 75% of the price; the grant, CPF and cash cover the rest.",
  signing: "The payment at signing sets this. It falls due before much CPF has built up, so cash would raise it.",
};

// Without a chosen project, the steps say how long each usually takes rather than a date.
const TYPICAL_WHEN: Record<string, string> = {
  book: "About 3 months after applying",
  sign: "About 4 months after booking",
  keys: "Usually 3 to 5 years after booking",
};

export function HomeTab({
  split,
  limitedBy,
  financing,
  monthlyCpf,
  flatType,
  checks,
  levers,
  launch,
  ceilingFor,
  journey,
  selectedProject,
  flatPrice,
  onStartSetup,
  onSelectTab,
}: HomeTabProps) {
  const known = split !== null;

  return (
    <section className="screen">
      <PageHeader
        title="Home"
        subtitle={
          known
            ? "Your plan at a glance. Everything saves in this browser."
            : "Plan a BTO from budget to keys. Everything stays in this browser."
        }
        action={known ? <EditChip label="Edit answers" onClick={onStartSetup} /> : undefined}
      />

      <div className="home-grid">
        {known ? (
          <CeilingCard split={split} limitedBy={limitedBy} financing={financing} monthlyCpf={monthlyCpf} onSelectTab={onSelectTab} />
        ) : (
          <StartCard onStartSetup={onStartSetup} onBrowse={() => onSelectTab("bto")} />
        )}

        <LaunchCard launch={launch} flatType={flatType} known={known} ceilingFor={ceilingFor} onBrowse={() => onSelectTab("bto")} />

        {known && (
          <section className="card home-span-6">
            <div className="card-head">
              <h2>
                <span className="head-icon" aria-hidden="true">
                  <Icon name="check" />
                </span>
                What you qualify for
              </h2>
            </div>
            <ul className="checks">
              {checks.map((check) => (
                <li key={check.key} className={`check is-${check.status}`}>
                  <span className="check-mark" aria-hidden="true">
                    <Icon name={check.status === "ok" ? "check" : check.status === "caution" ? "alert" : "info"} />
                  </span>
                  <div>
                    <strong>{check.title}</strong>
                    <p>{check.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {known && levers.length > 0 && (
          <section className="card home-span-6">
            <div className="card-head">
              <h2>
                <span className="head-icon" aria-hidden="true">
                  <Icon name="chart" />
                </span>
                What would raise your ceiling
              </h2>
            </div>
            <ul className="levers">
              {levers.map((lever) => (
                <li key={lever.key}>
                  <div>
                    <strong>{lever.label}</strong>
                    {lever.note && <p>{lever.note}</p>}
                  </div>
                  <span className={lever.delta > 0 ? "lever-delta is-up" : "lever-delta"}>
                    {lever.delta > 0 ? `+${currency(lever.delta)}` : "No change"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="card-foot">Each is worked out with the same rules as your ceiling, one change at a time.</p>
          </section>
        )}

        <section className="card home-span-12">
          <div className="card-head">
            <h2>
              <span className="head-icon" aria-hidden="true">
                <Icon name="clipboard" />
              </span>
              Road to keys
            </h2>
            {selectedProject ? (
              <button type="button" className="text-link" onClick={() => onSelectTab("plan")}>
                {selectedProject.name}, {currency(flatPrice)}
              </button>
            ) : (
              <button type="button" className="text-link" onClick={() => onSelectTab("bto")}>
                Pick a project to see each payment
              </button>
            )}
          </div>
          <ol className="road">
            {journey.map((stage, index) => {
              const when = selectedProject
                ? stage.when
                : stage.key === "apply" && launch
                  ? launch.openNow
                    ? `${launch.label}, open now`
                    : `Next launch, ${launch.nextExpected}`
                  : (TYPICAL_WHEN[stage.key] ?? stage.when);
              return (
                <li key={stage.key} className="road-step">
                  <span className="road-dot" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="road-text">
                    <p className="road-when">{when}</p>
                    <h3>{stage.title}</h3>
                    <p>{stage.body}</p>
                    {selectedProject && stage.due && stage.due.total > 0 && <Due due={stage.due} />}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </section>
  );
}

function StartCard({ onStartSetup, onBrowse }: { onStartSetup: () => void; onBrowse: () => void }) {
  const steps: { icon: IconName; label: string }[] = [
    { icon: "wallet", label: "Income" },
    { icon: "piggy", label: "CPF" },
    { icon: "sparkle", label: "Grant" },
    { icon: "cash", label: "Cash" },
    { icon: "building", label: "Flat size" },
  ];
  return (
    <section className="answer home-span-8">
      <p className="answer-label">Start here</p>
      <h2 className="answer-title">Find your price ceiling in five questions</h2>
      <p className="answer-text">
        About a minute. You'll see what you can afford, your grant, the projects that fit, and what each step costs until
        keys.
      </p>
      <ol className="answer-steps" aria-label="The five questions">
        {steps.map((step) => (
          <li key={step.label}>
            <Icon name={step.icon} />
            {step.label}
          </li>
        ))}
      </ol>
      <div className="answer-actions">
        <button type="button" className="btn btn-primary" onClick={onStartSetup}>
          Start
          <Icon name="arrow" />
        </button>
        <button type="button" className="btn btn-on-dark" onClick={onBrowse}>
          Browse projects first
        </button>
      </div>
    </section>
  );
}

function CeilingCard({
  split,
  limitedBy,
  financing,
  monthlyCpf,
  onSelectTab,
}: {
  split: CeilingSplit;
  limitedBy: CeilingResult["limitedBy"] | null;
  financing: FinancingType;
  monthlyCpf: number;
  onSelectTab: (tab: TabKey) => void;
}) {
  const shown = useCountUp(split.price);
  const monthly = split.monthly ? Math.round(split.monthly) : null;
  const cpfCovers = monthly !== null && monthlyCpf >= monthly;
  return (
    <section className="answer home-span-8">
      <p className="answer-label">You could buy a flat priced up to</p>
      <p className="answer-figure">{currency(Math.round(shown / 1000) * 1000)}</p>
      {monthly !== null && split.tenure && (
        <p className="answer-text">
          {currency(monthly)} a month over {split.tenure} years.{" "}
          {cpfCovers
            ? "Your CPF covers it, so no cash each month."
            : `CPF covers about ${currency(monthlyCpf)} of it; the rest is cash.`}
        </p>
      )}
      <MoneySplit split={split} loanLabel={financing === "bank" ? "Bank loan" : "HDB loan"} className="split-on-dark" />
      <div className="answer-actions">
        <button type="button" className="btn btn-primary" onClick={() => onSelectTab("bto")}>
          See flats that fit
          <Icon name="arrow" />
        </button>
        <button type="button" className="btn btn-on-dark" onClick={() => onSelectTab("budget")}>
          How this is worked out
        </button>
      </div>
      {limitedBy && (
        <p className="answer-limit">
          <Icon name="info" />
          {LIMITS[limitedBy]}
        </p>
      )}
    </section>
  );
}

function LaunchCard({
  launch,
  flatType,
  known,
  ceilingFor,
  onBrowse,
}: {
  launch: LaunchSnapshot | null;
  flatType: FlatType;
  known: boolean;
  ceilingFor: (project: BtoProject) => number;
  onBrowse: () => void;
}) {
  const flat = FLAT_LABELS[flatType];
  if (!launch) {
    return (
      <section className="card home-span-4">
        <p className="muted">Loading launches…</p>
      </section>
    );
  }
  return (
    <section className="card home-span-4 launch-card">
      <div className="card-head">
        <h2>
          <span className="head-icon" aria-hidden="true">
            <Icon name="calendar" />
          </span>
          {launch.openNow ? "Applying now" : "Latest launch"}
        </h2>
        <span className={launch.openNow ? "pill pill-live" : "pill"}>{launch.label}</span>
      </div>
      <p className="launch-stat">
        <strong>{launch.projects.length}</strong> projects
        <span aria-hidden="true"> · </span>
        <strong>{launch.totalUnits.toLocaleString("en-SG")}</strong> flats
      </p>
      {known ? (
        launch.priced > 0 ? (
          <>
            <p className="launch-fit">
              <strong>
                {launch.fitting.length} of {launch.priced}
              </strong>{" "}
              have a {flat} within your ceiling.
            </p>
            {launch.fitting.length > 0 && (
              <ul className="launch-list">
                {launch.fitting.slice(0, 3).map((project) => {
                  const price = project.flatVariants.find((variant) => variant.type === flatType)?.basePrice ?? 0;
                  const room = ceilingFor(project) - price;
                  return (
                    <li key={project.id}>
                      <span>
                        <strong>{project.name}</strong>
                        <span>{project.location}</span>
                      </span>
                      <span className="launch-price">
                        {currency(price)}
                        <span>{currency(room)} to spare</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <p className="launch-fit">No {flat} in this launch.</p>
        )
      ) : (
        launch.lowestPrice !== null && (
          <p className="launch-fit">
            A {flat} from <strong>{currency(launch.lowestPrice)}</strong>.
          </p>
        )
      )}
      <p className="card-foot">Next launch expected {launch.nextExpected}.</p>
      <button type="button" className="btn btn-quiet btn-small" onClick={onBrowse}>
        Browse projects
        <Icon name="arrow" />
      </button>
    </section>
  );
}

function Due({ due }: { due: NonNullable<JourneyStage["due"]> }) {
  const parts = [
    { label: "grant", amount: due.grant },
    { label: "CPF", amount: due.cpf },
    { label: "cash", amount: due.cash },
  ].filter((part) => part.amount > 0);
  return (
    <p className="road-due">
      <strong>{currency(Math.round(due.total))}</strong>
      {parts.length > 0 && (
        <span>{parts.map((part) => `${currency(Math.round(part.amount))} ${part.label}`).join(" · ")}</span>
      )}
      {due.shortfall > 0 && <span className="road-short">{currency(Math.round(due.shortfall))} more cash needed</span>}
    </p>
  );
}
