import { useState, type ReactNode } from "react";
import { INCOME_MAX, INCOME_MIN } from "../constants";
import type { FinancingType } from "../types";
import type { FinancingEstimate } from "../utils/affordability";
import type { BudgetInputs } from "../utils/budgetStorage";
import type { EhgAssessment } from "../utils/ehg";
import { currency } from "../utils/format";
import { PageHeader } from "./DashboardUi";

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
  const missing = [
    budget.age === null ? "your age" : null,
    budget.cpfOa === null ? "your CPF savings" : null,
    budget.cash === null ? "your cash savings" : null,
  ].filter((item): item is string => item !== null);

  return (
    <>
      <PageHeader
        title="Your budget"
        subtitle="Four answers give you a price ceiling. Everything else in BTO Radar is measured against it."
      />

      <div className="budget-layout">
        <form className="budget-form" onSubmit={(event) => event.preventDefault()}>
          <MoneyField
            id="budget-income"
            label="Household income, per month"
            hint="Before CPF and tax, for everyone buying. HDB uses the average of the last 12 months."
            value={combinedIncome}
            max={INCOME_MAX}
            onCommit={(value) => onIncomeChange(value ?? INCOME_MIN)}
          />

          <div className="budget-field">
            <label htmlFor="budget-age">Age of the youngest buyer</label>
            <p className="budget-hint">An HDB loan must end by 65, so age can shorten it.</p>
            <input
              id="budget-age"
              className="budget-input budget-input-short"
              inputMode="numeric"
              placeholder="e.g. 29"
              defaultValue={budget.age ?? ""}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "");
                const age = digits === "" ? null : Number(digits);
                onBudgetChange({
                  age: age === null || age < AGE_MIN || age > AGE_MAX ? null : age,
                });
              }}
              aria-describedby="budget-age-range"
            />
            <p id="budget-age-range" className="budget-hint">Between {AGE_MIN} and {AGE_MAX}.</p>
          </div>

          <MoneyField
            id="budget-cpf"
            label="CPF Ordinary Account savings"
            hint="Combined, as shown in the CPF app. Enter 0 if none."
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

          <fieldset className="budget-field">
            <legend>First-time buyers?</legend>
            <p className="budget-hint">
              First-timer families can get the Enhanced CPF Housing Grant. Singles and second-timers get different amounts.
            </p>
            <div className="budget-choice" role="radiogroup" aria-label="First-time buyers">
              {[
                { value: true, label: "Yes, include the grant" },
                { value: false, label: "No grant" },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={budget.firstTimer === option.value}
                  className="budget-choice-option"
                  onClick={() => onBudgetChange({ firstTimer: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </form>

        <section className="budget-answer" aria-live="polite">
          {maxPrice === null || estimateAtMax === null ? (
            <div className="budget-waiting">
              <h2>Your price ceiling appears here</h2>
              <p>
                Still needed: {missing.join(", ")}. Your figures stay in this browser and are never sent anywhere.
              </p>
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
    </>
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
  const total = Math.max(loan + grant + cpfUsed + cashUsed, 1);
  const parts = [
    { key: "loan", tone: "budget-part-loan", label: financing === "bank" ? "Bank loan" : "HDB loan", amount: loan },
    { key: "grant", tone: "budget-part-grant", label: "Housing grant", amount: grant },
    { key: "cpf", tone: "budget-part-cpf", label: "CPF savings", amount: cpfUsed },
    { key: "cash", tone: "budget-part-cash", label: "Cash", amount: cashUsed },
  ].filter((part) => part.amount > 0);
  const tenure = estimate.effectiveTenureYears;
  const monthly = estimate.estimatedMonthlyPayment;
  const limit = describeLimit({ estimate, loan, maxPrice, financing });

  if (ceiling <= 0) {
    return (
      <div className="budget-waiting">
        <h2>These figures don't reach a flat yet</h2>
        <p>
          With {financingLabel[financing]}, some of the price has to come from savings or a grant. Add CPF or cash
          savings to see a ceiling.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="budget-lead">You could buy a flat priced up to</p>
      <p className="budget-figure">{currency(ceiling)}</p>
      {monthly !== null && tenure !== null && loan > 0 && (
        <p className="budget-monthly">
          That is about <strong>{currency(Math.round(monthly))} a month</strong> for {tenure} years.
        </p>
      )}

      <div className="budget-bar" role="img" aria-label={`Paid for by ${parts.map((part) => `${part.label} ${currency(part.amount)}`).join(", ")}`}>
        {parts.map((part) => (
          <span
            key={part.key}
            className={`budget-bar-part ${part.tone}`}
            style={{ flexGrow: part.amount / total }}
          />
        ))}
      </div>
      <dl className="budget-legend">
        {parts.map((part) => (
          <div key={part.key} className="budget-legend-row">
            <dt>
              <span className={`budget-swatch ${part.tone}`} aria-hidden="true" />
              {part.label}
            </dt>
            <dd>{currency(part.amount)}</dd>
          </div>
        ))}
      </dl>

      <div className="budget-limit">
        <h2>{limit.title}</h2>
        <p>{limit.body}</p>
        {tenure !== null && tenure < loanTenureYears && financing === "hdb" && (
          <p>The loan runs {tenure} years, not {loanTenureYears}, because it has to end by age 65.</p>
        )}
      </div>

      <div className="budget-actions">
        <button type="button" className="budget-cta" onClick={onSeeProjects}>
          See projects that fit
        </button>
        <button type="button" className="budget-link" onClick={onOpenPlan}>
          Change loan type or length
        </button>
      </div>

      <Disclosure summary="What this estimate assumes">
        <ul>
          <li>{ehg.note}</li>
          {estimate.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
          <li>Stamp duty and one-off fees are set aside from your savings before the price is worked out.</li>
        </ul>
      </Disclosure>
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
    <div className="budget-field">
      <label htmlFor={id}>{label}</label>
      <p className="budget-hint" id={`${id}-hint`}>{hint}</p>
      <div className="budget-money">
        <span aria-hidden="true">S$</span>
        <input
          id={id}
          className="budget-input"
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

function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="budget-disclosure">
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
