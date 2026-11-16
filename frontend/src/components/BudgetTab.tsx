import { useState } from "react";
import { INCOME_MAX, INCOME_MIN } from "../constants";
import type { FinancingType } from "../types";
import type { FinancingEstimate } from "../utils/affordability";
import type { BudgetInputs } from "../utils/budgetStorage";
import type { EhgAssessment } from "../utils/ehg";
import { currency } from "../utils/format";
import { useCountUp } from "../utils/motion";
import { Icon, PageHeader } from "./DashboardUi";
import { FundingBar, type FundingPart } from "./FundingBar";
import { Segmented } from "./Segmented";

type BudgetTabProps = {
  combinedIncome: number;
  budget: BudgetInputs;
  financing: FinancingType;
  loanTenureYears: number;
  estimateAtMax: FinancingEstimate | null;
  maxPrice: number | null;
  ehg: EhgAssessment;
  onIncomeChange: (value: number) => void;
  onBudgetChange: (patch: Partial<BudgetInputs>) => void;
  onSeeProjects: () => void;
  onOpenPlan: () => void;
};

const AGE_MIN = 21;
const AGE_MAX = 70;
const SAVINGS_MAX = 2000000;

const financingLabel: Record<FinancingType, string> = {
  hdb: "an HDB loan",
  bank: "a bank loan",
  none: "no loan",
};

export function BudgetTab({
  combinedIncome,
  budget,
  financing,
  loanTenureYears,
  estimateAtMax,
  maxPrice,
  ehg,
  onIncomeChange,
  onBudgetChange,
  onSeeProjects,
  onOpenPlan,
}: BudgetTabProps) {
  const checklist = [
    { label: "Household income", done: true },
    { label: "Age of the youngest buyer", done: budget.age !== null },
    { label: "CPF savings", done: budget.cpfOa !== null },
    { label: "Cash savings", done: budget.cash !== null },
  ];

  return (
    <section className="screen">
      <PageHeader
        title="Budget"
        subtitle="The most you could spend on a flat, from four answers. Every project is checked against it."
      />

      <div className="budget-layout">
        <form className="card budget-form" onSubmit={(event) => event.preventDefault()}>
          <MoneyField
            id="budget-income"
            label="Household income, per month"
            hint="Before CPF and tax, for everyone buying. HDB uses the average of the last 12 months."
            value={combinedIncome}
            max={INCOME_MAX}
            onCommit={(value) => onIncomeChange(value ?? INCOME_MIN)}
          />

          <div className="field">
            <label htmlFor="budget-age">Age of the youngest buyer</label>
            <p className="field-hint" id="budget-age-hint">
              An HDB loan has to end by 65, so age can shorten it. Between {AGE_MIN} and {AGE_MAX}.
            </p>
            <input
              id="budget-age"
              className="input input-short"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 29"
              defaultValue={budget.age ?? ""}
              aria-describedby="budget-age-hint"
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "");
                const age = digits === "" ? null : Number(digits);
                onBudgetChange({
                  age: age === null || age < AGE_MIN || age > AGE_MAX ? null : age,
                });
              }}
            />
          </div>

          <MoneyField
            id="budget-cpf"
            label="CPF Ordinary Account savings"
            hint="Everyone buying, combined, as shown in the CPF app. Enter 0 if none."
            value={budget.cpfOa}
            max={SAVINGS_MAX}
            placeholder="e.g. 60,000"
            onCommit={(value) => onBudgetChange({ cpfOa: value })}
          />

          <MoneyField
            id="budget-cash"
            label="Cash you can put towards the flat"
            hint="Leave out your emergency fund and renovation money. Enter 0 if none."
            value={budget.cash}
            max={SAVINGS_MAX}
            placeholder="e.g. 20,000"
            onCommit={(value) => onBudgetChange({ cash: value })}
          />

          <fieldset className="field">
            <legend>Are you buying your first HDB flat?</legend>
            <p className="field-hint">
              This decides the Enhanced CPF Housing Grant. A couple where only one partner is a first-timer gets a
              smaller amount; second-timers get none.
            </p>
            <Segmented
              label="First-time buyers"
              value={budget.firstTimers}
              options={[
                { value: "both", label: "Both of us" },
                { value: "one", label: "One of us" },
                { value: "none", label: "Neither" },
              ]}
              onChange={(value) => onBudgetChange({ firstTimers: value })}
            />
          </fieldset>
        </form>

        <section className="answer budget-answer" aria-live="polite">
          {maxPrice === null || estimateAtMax === null ? (
            <div className="answer-waiting">
              <p className="answer-lead">Your price ceiling</p>
              <p className="answer-figure answer-figure-ghost" aria-hidden="true">
                S$ ···
              </p>
              <ul className="answer-checklist">
                {checklist.map((item) => (
                  <li key={item.label} className={item.done ? "is-done" : ""}>
                    <span aria-hidden="true">{item.done ? <Icon name="check" /> : null}</span>
                    {item.label}
                    <span className="sr-only">{item.done ? " (answered)" : " (still needed)"}</span>
                  </li>
                ))}
              </ul>
              <p className="answer-note">Your figures stay in this browser and are never sent anywhere.</p>
            </div>
          ) : (
            <BudgetAnswer
              maxPrice={maxPrice}
              estimate={estimateAtMax}
              budget={budget}
              ehg={ehg}
              financing={financing}
              loanTenureYears={loanTenureYears}
              onSeeProjects={onSeeProjects}
              onOpenPlan={onOpenPlan}
            />
          )}
        </section>
      </div>
    </section>
  );
}

function BudgetAnswer({
  maxPrice,
  estimate,
  budget,
  ehg,
  financing,
  loanTenureYears,
  onSeeProjects,
  onOpenPlan,
}: {
  maxPrice: number;
  estimate: FinancingEstimate;
  budget: BudgetInputs;
  ehg: EhgAssessment;
  financing: FinancingType;
  loanTenureYears: number;
  onSeeProjects: () => void;
  onOpenPlan: () => void;
}) {
  const ceiling = Math.floor(maxPrice / 1000) * 1000;
  const loan = Math.round(estimate.loanForTarget ?? 0);
  const grant = Math.round(estimate.usableGrantAmount ?? 0);
  const ownFunds = Math.max(Math.round(maxPrice) - loan - grant, 0);
  const cpfUsed = Math.min(budget.cpfOa ?? 0, ownFunds);
  const cashUsed = Math.max(ownFunds - cpfUsed, 0);
  const parts: FundingPart[] = [
    { key: "loan", label: financing === "bank" ? "Bank loan" : "HDB loan", amount: loan },
    { key: "grant", label: "Housing grant", amount: grant },
    { key: "cpf", label: "CPF savings", amount: cpfUsed },
    { key: "cash", label: "Cash", amount: cashUsed },
  ];
  const tenure = estimate.effectiveTenureYears;
  const monthly = estimate.estimatedMonthlyPayment;
  const limit = describeLimit({ estimate, loan, maxPrice, financing });
  const shownCeiling = useCountUp(ceiling);
  const shownMonthly = useCountUp(Math.round(monthly ?? 0));

  if (ceiling <= 0) {
    return (
      <div className="answer-waiting">
        <p className="answer-lead">Not enough to reach a flat yet</p>
        <p className="answer-body">
          With {financingLabel[financing]}, some of the price has to come from savings or a grant. Add CPF or cash
          savings to see a ceiling.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="answer-lead">You could buy a flat priced up to</p>
      <p className="answer-figure">{currency(Math.round(shownCeiling / 1000) * 1000)}</p>
      {monthly !== null && tenure !== null && loan > 0 && (
        <p className="answer-body">
          That's about <strong>{currency(Math.round(shownMonthly))} a month</strong> over {tenure} years.
        </p>
      )}

      <FundingBar parts={parts} />

      <div className="answer-limit">
        <h2>{limit.title}</h2>
        <p>{limit.body}</p>
        {tenure !== null && tenure < loanTenureYears && financing === "hdb" && (
          <p>The loan runs {tenure} years, not {loanTenureYears}, because it has to end by age 65.</p>
        )}
      </div>

      <div className="answer-actions">
        <button type="button" className="btn btn-primary" onClick={onSeeProjects}>
          See flats that fit
          <Icon name="arrow" />
        </button>
        <button type="button" className="text-link" onClick={onOpenPlan}>
          Change loan type or length
        </button>
      </div>

      <details className="answer-more">
        <summary>What this estimate assumes</summary>
        <ul>
          <li>{ehg.note}</li>
          {estimate.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
          <li>Stamp duty and one-off fees are set aside from your savings before the price is worked out.</li>
        </ul>
      </details>
    </>
  );
}

function describeLimit({
  estimate,
  loan,
  maxPrice,
  financing,
}: {
  estimate: FinancingEstimate;
  loan: number;
  maxPrice: number;
  financing: FinancingType;
}) {
  if (financing === "none") {
    return {
      title: "Your savings set this ceiling",
      body: "Without a loan, the whole price comes from your grant, CPF and cash.",
    };
  }

  const incomeLimit = estimate.serviceabilityLoanLimit;
  const incomeBinds = incomeLimit !== null && loan >= incomeLimit - 1;
  const ltv = estimate.ltvLimit ?? 0.75;
  const share = Math.round(ltv * 100);

  if (incomeBinds) {
    return {
      title: "Your income sets this ceiling",
      body:
        financing === "hdb"
          ? `HDB caps repayments at 30% of income, which allows a loan of ${currency(Math.round(incomeLimit))}. More savings would raise the ceiling dollar for dollar.`
          : `Lenders cap repayments against income, which allows a loan of ${currency(Math.round(incomeLimit))}. More savings would raise the ceiling dollar for dollar.`,
    };
  }

  return {
    title: "Your savings set this ceiling",
    body: `A loan covers at most ${share}% of the price, so the other ${100 - share}% comes from your grant, CPF and cash. Your income could support a larger loan than ${currency(Math.round(maxPrice * ltv))}.`,
  };
}

function MoneyField({
  id,
  label,
  hint,
  value,
  max,
  placeholder,
  onCommit,
}: {
  id: string;
  label: string;
  hint: string;
  value: number | null;
  max: number;
  placeholder?: string;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? "" : value.toLocaleString("en-SG"));

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <p className="field-hint" id={`${id}-hint`}>
        {hint}
      </p>
      <div className="input input-money">
        <span aria-hidden="true">S$</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          aria-describedby={`${id}-hint`}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 9);
            if (digits === "") {
              setText("");
              onCommit(null);
              return;
            }
            const amount = Math.min(Number(digits), max);
            setText(amount.toLocaleString("en-SG"));
            onCommit(amount);
          }}
        />
      </div>
    </div>
  );
}
