import { useState } from "react";
import type { BtoProject } from "../policies/policyConfig";
import type { FinancingType, FlatType, TabKey, TimelineItem } from "../types";
import type { BudgetInputs } from "../utils/budgetStorage";
import type { CeilingResult } from "../utils/cpfProjection";
import { currency } from "../utils/format";
import { FLAT_LABELS, type CeilingSplit, type EligibilityCheck, type LaunchSnapshot } from "../utils/journey";
import { useCountUp } from "../utils/motion";
import { EditChip } from "./Cards";
import { Icon, PageHeader } from "./DashboardUi";
import { HfeForm } from "./HomeExtras";
import { MoneySplit } from "./MoneySplit";

type HomeTabProps = {
  split: CeilingSplit | null;
  limitedBy: CeilingResult["limitedBy"] | null;
  financing: FinancingType;
  monthlyCpf: number;
  flatType: FlatType;
  combinedIncome: number;
  /** Only the checks that stop or change a purchase; everything fine stays unsaid. */
  warnings: EligibilityCheck[];
  launch: LaunchSnapshot | null;
  ceilingFor: (project: BtoProject) => number;
  selectedProject: BtoProject | null;
  timeline: TimelineItem[];
  completedMilestones: string[];
  budget: BudgetInputs;
  estimatedLoan: number;
  estimatedGrant: number;
  onBudgetChange: (patch: Partial<BudgetInputs>) => void;
  onStartSetup: () => void;
  onSelectTab: (tab: TabKey) => void;
  onShare: () => Promise<boolean>;
};

const LIMITS: Record<CeilingResult["limitedBy"], string> = {
  loan: "Your income sets this: HDB caps repayments at 30% of it.",
  keys: "Your savings set this: a loan covers at most 75% of the price.",
  signing: "The first downpayment sets this: it's due before much CPF builds up.",
};

const FIRST_TIMERS: Record<BudgetInputs["firstTimers"], string> = {
  both: "first-timers",
  one: "one first-timer",
  none: "second-timers",
};

export function HomeTab(props: HomeTabProps) {
  const { split, launch, flatType, ceilingFor, onSelectTab, onStartSetup } = props;
  const known = split !== null;
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  const share = async () => {
    setCopied((await props.onShare()) ? "done" : "failed");
    setTimeout(() => setCopied("idle"), 2400);
  };

  return (
    <section className="screen">
      <PageHeader
        title="Home"
        subtitle={known ? "What you can afford, and what to do next." : "Find out what you can afford in about a minute."}
        action={
          known ? (
            <div className="head-actions">
              <button type="button" className="edit-chip" onClick={share}>
                <Icon name={copied === "done" ? "check" : "external"} />
                {copied === "done" ? "Link copied" : copied === "failed" ? "Couldn't copy" : "Share with partner"}
              </button>
              <EditChip label="Edit answers" onClick={onStartSetup} />
            </div>
          ) : undefined
        }
      />

      <div className="home-grid">
        {known ? <Answer {...props} split={split} /> : <Start onStart={onStartSetup} />}
        <Launch launch={launch} flatType={flatType} known={known} ceilingFor={ceilingFor} onBrowse={() => onSelectTab("bto")} />
        {known && <NextStep {...props} />}
      </div>

      <p className="home-foot">
        Estimates from HDB and CPF rules. Your HFE letter is the final word.{" "}
        <button type="button" className="text-link-inline" onClick={() => onSelectTab("sources")}>
          Sources
        </button>
      </p>
    </section>
  );
}

function Start({ onStart }: { onStart: () => void }) {
  return (
    <section className="answer home-span-8">
      <h2 className="answer-title">What can we afford?</h2>
      <p className="answer-text">
        Five quick questions about your income, CPF and savings. You'll get your price ceiling, your grant and the
        flats that fit.
      </p>
      <div className="answer-actions">
        <button type="button" className="btn btn-primary" onClick={onStart}>
          Get started
          <Icon name="arrow" />
        </button>
      </div>
    </section>
  );
}

function Answer({
  split,
  limitedBy,
  financing,
  monthlyCpf,
  combinedIncome,
  warnings,
  budget,
  estimatedLoan,
  estimatedGrant,
  onBudgetChange,
  onStartSetup,
  onSelectTab,
}: HomeTabProps & { split: CeilingSplit }) {
  const shown = useCountUp(split.price);
  const monthly = split.monthly ? Math.round(split.monthly) : null;
  const hfe = budget.hfeLoan !== null;
  const cash = Math.max(0, (monthly ?? 0) - monthlyCpf);
  const inputs = [
    `${currency(combinedIncome)} a month`,
    budget.cpfOa !== null ? `${currency(budget.cpfOa)} in CPF` : null,
    budget.cash ? `${currency(budget.cash)} cash` : null,
    budget.household === "single" ? "single" : FIRST_TIMERS[budget.firstTimers],
  ].filter(Boolean);

  return (
    <section className="answer home-span-8">
      <p className="answer-label">
        You can afford a flat up to
        {hfe && <span className="answer-tag">From your HFE letter</span>}
      </p>
      <p className="answer-figure">{currency(Math.round(shown / 1000) * 1000)}</p>
      {monthly !== null && split.tenure && (
        <p className="answer-text">
          About <strong>{currency(monthly)}</strong> a month for {split.tenure} years
          {cash > 0 ? `, ${currency(cash)} of it in cash.` : ", all of it from CPF."}
        </p>
      )}
      <MoneySplit split={split} loanLabel={financing === "bank" ? "Bank loan" : "HDB loan"} />

      {warnings.map((warning) => (
        <p key={warning.key} className="answer-warning">
          <Icon name="alert" />
          <span>
            <strong>{warning.title}.</strong> {warning.body}
          </span>
        </p>
      ))}

      <div className="answer-actions">
        <button type="button" className="btn btn-primary" onClick={() => onSelectTab("bto")}>
          See flats that fit
          <Icon name="arrow" />
        </button>
      </div>

      <div className="answer-foot">
        <p>
          Based on {inputs.join(", ")}.{" "}
          <button type="button" className="text-link-inline" onClick={onStartSetup}>
            Change
          </button>
        </p>
        {limitedBy && <p>{hfe && limitedBy === "loan" ? "Your HFE letter's loan sets this." : LIMITS[limitedBy]}</p>}
        <details className="answer-more">
          <summary>{hfe ? "Your HFE letter" : "Got your HFE letter?"}</summary>
          <HfeForm budget={budget} estimatedLoan={estimatedLoan} estimatedGrant={estimatedGrant} onBudgetChange={onBudgetChange} />
        </details>
        <details className="answer-more">
          <summary>How we work this out</summary>
          <ul>
            <li>HDB lends up to 30% of your income in repayments, tested at 3% interest, for up to 25 years. You'd pay 2.6%.</li>
            <li>A loan covers up to 75% of the price. Your grant, CPF and cash cover the rest.</li>
            <li>Your grant goes into CPF before you sign, and CPF keeps building up until each payment is due.</li>
            <li>Stamp duty and fees are set aside first. We assume you're under 35.</li>
          </ul>
        </details>
      </div>
    </section>
  );
}

function Launch({
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
  const list = known ? launch.fitting : [];
  return (
    <section className="card home-span-4 launch-card">
      <div className="card-head">
        <h2>{launch.openNow ? "Applying now" : "Latest launch"}</h2>
        <span className={launch.openNow ? "pill pill-live" : "pill pill-neutral"}>{launch.label}</span>
      </div>
      <p className="launch-fit">
        {known ? (
          launch.priced > 0 ? (
            <>
              <strong>
                {launch.fitting.length} of {launch.priced}
              </strong>{" "}
              projects have a {flat} you can afford.
            </>
          ) : (
            <>No {flat} in this launch.</>
          )
        ) : (
          <>
            {launch.projects.length} projects
            {launch.lowestPrice !== null && (
              <>
                , a {flat} from <strong>{currency(launch.lowestPrice)}</strong>
              </>
            )}
            .
          </>
        )}
      </p>
      {list.length > 0 && (
        <ul className="launch-list">
          {list.slice(0, 3).map((project) => {
            const price = project.flatVariants.find((variant) => variant.type === flatType)?.basePrice ?? 0;
            return (
              <li key={project.id}>
                <span>
                  <strong>{project.name}</strong>
                  <span>{project.location}</span>
                </span>
                <span className="launch-price">
                  {currency(price)}
                  <span>{currency(ceilingFor(project) - price)} to spare</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className="btn btn-quiet btn-small" onClick={onBrowse}>
        {known ? "Compare them" : "Browse projects"}
        <Icon name="arrow" />
      </button>
      {!launch.openNow && <p className="card-foot">Next launch expected {launch.nextExpected}.</p>}
    </section>
  );
}

// One next step: pick a flat, or the next payment for the flat you picked.
function NextStep({ selectedProject, timeline, completedMilestones, launch, onSelectTab }: HomeTabProps) {
  const next = timeline.find((item) => !completedMilestones.includes(item.label)) ?? null;
  if (!selectedProject) {
    return (
      <section className="card home-span-12 next-step">
        <div>
          <h2>Next: pick a flat</h2>
          <p>
            {launch?.openNow
              ? `Applications for the ${launch.label} launch are open. Compare projects by price, MRT and keys date, then plan your payments.`
              : "Compare projects by price, MRT and keys date, then plan your payments."}
          </p>
        </div>
        <button type="button" className="btn btn-quiet" onClick={() => onSelectTab("bto")}>
          Browse projects
          <Icon name="arrow" />
        </button>
      </section>
    );
  }
  return (
    <section className="card home-span-12 next-step">
      <div>
        <h2>
          {next ? `Next: ${next.label.toLowerCase()}` : "Every step is done"}
          {next && <span className="next-when">{next.date}</span>}
        </h2>
        <p>
          {selectedProject.name}.{" "}
          {next?.payment ? `${currency(Math.round(next.payment.total))} due. ${next.note}` : next?.note ?? "Enjoy your new home."}
        </p>
      </div>
      <button type="button" className="btn btn-quiet" onClick={() => onSelectTab("plan")}>
        See every payment
        <Icon name="arrow" />
      </button>
    </section>
  );
}
