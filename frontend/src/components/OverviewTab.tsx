import type { ReactNode } from "react";
import type { BtoProject } from "../policies/policyConfig";
import type { TabKey, TimelineItem } from "../types";
import { currency } from "../utils/format";
import { Icon, PageHeader } from "./DashboardUi";

type OverviewTabProps = {
  budgetKnown: boolean;
  budgetCeiling: number;
  selectedProject: BtoProject | null;
  flatPrice: number;
  fundingGap: number | null;
  timeline: TimelineItem[];
  completedMilestones: string[];
  onSelectTab: (tab: TabKey) => void;
};

export function OverviewTab({
  budgetKnown,
  budgetCeiling,
  selectedProject,
  flatPrice,
  fundingGap,
  timeline,
  completedMilestones,
  onSelectTab,
}: OverviewTabProps) {
  const ceiling = Math.floor(budgetCeiling / 1000) * 1000;
  const doneCount = timeline.filter((item) => completedMilestones.includes(item.label)).length;
  const nextStep = timeline.find((item) => !completedMilestones.includes(item.label)) ?? null;
  const allDone = timeline.length > 0 && doneCount === timeline.length;
  const fit =
    !budgetKnown || fundingGap === null
      ? null
      : fundingGap > 0
        ? `${currency(Math.round(fundingGap))} short of this price`
        : "within your budget";

  return (
    <section className="dashboard-page">
      <PageHeader title="Overview" subtitle="Where you are, and what comes next." />

      {selectedProject && nextStep && (
        <div className="overview-next">
          <p className="budget-lead">Next: {nextStep.label.toLowerCase()}</p>
          <p className="overview-next-figure">
            {nextStep.payment ? currency(nextStep.payment.total) : "Nothing to pay"}
          </p>
          <p className="overview-next-detail">
            {nextStep.payment ? `${nextStep.payment.label}, expected ${nextStep.date}.` : `Expected ${nextStep.date}.`}{" "}
            {nextStep.note}
          </p>
          <button type="button" className="budget-cta" onClick={() => onSelectTab("plan")}>
            Open your plan
          </button>
        </div>
      )}

      <ol className="overview-path">
        <PathStep
          index={1}
          done={budgetKnown}
          title="Set your budget"
          state={budgetKnown ? `You could buy up to ${currency(ceiling)}.` : "Four answers give you a price ceiling."}
          action={budgetKnown ? "Change" : "Set budget"}
          onAction={() => onSelectTab("budget")}
        />
        <PathStep
          index={2}
          done={Boolean(selectedProject)}
          title="Choose a project"
          state={
            selectedProject
              ? `${selectedProject.name}, ${selectedProject.location}. Target ${currency(flatPrice)}${fit ? `, ${fit}` : ""}.`
              : "Compare launches and pick the flat to plan around."
          }
          action={selectedProject ? "Choose another" : "Browse projects"}
          onAction={() => onSelectTab("bto")}
        />
        <PathStep
          index={3}
          done={allDone}
          title="Follow your payments"
          state={
            allDone
              ? "Every step is ticked off."
              : `${doneCount} of ${timeline.length} steps done${nextStep ? `. Next is ${nextStep.label.toLowerCase()}, ${nextStep.date}` : ""}.`
          }
          action="Open plan"
          onAction={() => onSelectTab("plan")}
        />
      </ol>
    </section>
  );
}

function PathStep({
  index,
  done,
  title,
  state,
  action,
  onAction,
}: {
  index: number;
  done: boolean;
  title: string;
  state: ReactNode;
  action: string;
  onAction: () => void;
}) {
  return (
    <li className="overview-step">
      <span className={done ? "overview-step-mark overview-step-done" : "overview-step-mark"} aria-hidden="true">
        {done ? <Icon name="check" /> : index}
      </span>
      <div className="overview-step-text">
        <h2>
          {title}
          {done && <span className="sr-only"> (done)</span>}
        </h2>
        <p>{state}</p>
      </div>
      <button type="button" className="budget-link" onClick={onAction}>
        {action}
      </button>
    </li>
  );
}
