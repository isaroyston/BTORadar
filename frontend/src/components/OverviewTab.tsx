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
  savedCount: number;
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
  savedCount,
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

  const steps = [
    {
      done: budgetKnown,
      title: "Know your budget",
      state: budgetKnown ? `You could buy up to ${currency(ceiling)}.` : "Four answers give you a price ceiling.",
      action: budgetKnown ? "Change" : "Set budget",
      tab: "budget" as TabKey,
    },
    {
      done: Boolean(selectedProject),
      title: "Choose a project",
      state: selectedProject
        ? `${selectedProject.name}, ${selectedProject.location}. Target ${currency(flatPrice)}${fit ? `, ${fit}` : ""}.`
        : savedCount > 0
          ? `${savedCount} saved. Pick one to plan around.`
          : "Compare launches and pick the flat to plan around.",
      action: selectedProject ? "Change" : "Browse projects",
      tab: "bto" as TabKey,
    },
    {
      done: allDone,
      title: "Follow your payments",
      state: allDone
        ? "Every step is ticked off."
        : `${doneCount} of ${timeline.length} done${nextStep ? `. Next is ${nextStep.label.toLowerCase()}, ${nextStep.date}` : ""}.`,
      action: "Open plan",
      tab: "plan" as TabKey,
    },
  ];
  const firstOpen = steps.findIndex((step) => !step.done);

  return (
    <section className="screen">
      <PageHeader title="Overview" subtitle="What's done, and what comes next." />

      {selectedProject && nextStep ? (
        <div className="answer overview-next">
          <p className="answer-lead">Next: {nextStep.label.toLowerCase()}</p>
          <p className="answer-figure answer-figure-md">
            {nextStep.payment ? currency(nextStep.payment.total) : "Nothing to pay"}
          </p>
          <p className="answer-body">
            {nextStep.payment ? `${nextStep.payment.label}, expected ${nextStep.date}. ` : `Expected ${nextStep.date}. `}
            {nextStep.note}
          </p>
          <div className="answer-actions">
            <button type="button" className="btn btn-primary" onClick={() => onSelectTab("plan")}>
              Open your plan
              <Icon name="arrow" />
            </button>
          </div>
        </div>
      ) : null}

      <ol className="card journey">
        {steps.map((step, index) => (
          <li key={step.title} className={index === firstOpen ? "journey-step is-next" : "journey-step"}>
            <span className={step.done ? "journey-mark is-done" : "journey-mark"} aria-hidden="true">
              {step.done ? <Icon name="check" /> : index + 1}
            </span>
            <div className="journey-text">
              <h2>
                {step.title}
                {step.done && <span className="sr-only"> (done)</span>}
              </h2>
              <p>{step.state}</p>
            </div>
            <button
              type="button"
              className={index === firstOpen ? "btn btn-primary btn-small" : "text-link"}
              onClick={() => onSelectTab(step.tab)}
            >
              {step.action}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
