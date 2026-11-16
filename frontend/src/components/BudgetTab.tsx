import { useState } from "react";
import { INCOME_MAX, INCOME_MIN } from "../constants";
import type { FinancingType } from "../types";
import type { FinancingEstimate } from "../utils/affordability";
import type { CeilingResult, PurchaseTiming } from "../utils/cpfProjection";
import type { BudgetInputs, FirstTimers } from "../utils/budgetStorage";
import type { EhgAssessment } from "../utils/ehg";
import { currency } from "../utils/format";
import { useCountUp } from "../utils/motion";
import {
  EditChip,
  HeroCard,
  MonthlyChip,
  Note,
  StatTiles,
  type Tile,
} from "./Cards";
import { Icon, PageHeader, type IconName } from "./DashboardUi";
import { Segmented } from "./Segmented";

type BudgetTabProps = {
  combinedIncome: number;
  budget: BudgetInputs;
  financing: FinancingType;
  loanTenureYears: number;
  estimateAtMax: FinancingEstimate | null;
  maxPrice: number | null;
  ceiling: CeilingResult | null;
  timing: PurchaseTiming;
  monthlyCpf: number | null;
  estimatedMonthlyCpf: number | null;
  feesInCash: number;
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

const firstTimerLabel: Record<FirstTimers, string> = {
  both: "Both of us",
  one: "One of us",
  none: "Neither",
};

export function BudgetTab({
  combinedIncome,
  budget,
  financing,
  loanTenureYears,
  estimateAtMax,
  maxPrice,
  ceiling,
  timing,
  monthlyCpf,
  estimatedMonthlyCpf,
  feesInCash,
  ehg,
  onIncomeChange,
  onBudgetChange,
  onSeeProjects,
  onOpenPlan,
}: BudgetTabProps) {
  // Cash is optional: most of a BTO downpayment can come from the grant and CPF.
  const complete = budget.age !== null && budget.cpfOa !== null;
  const [editing, setEditing] = useState(!complete);
  const showForm = editing || !complete;
  const known = maxPrice !== null && estimateAtMax !== null;
  const checklist = [
    { label: "Household income", done: true },
    { label: "Age of the youngest buyer", done: budget.age !== null },
    { label: "CPF savings", done: budget.cpfOa !== null },
  ];

  const openField = (id: string) => {
    setEditing(true);
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  };

  const answers: {
    id: string;
    icon: IconName;
    label: string;
    value: string;
  }[] = [
    {
      id: "budget-income",
      icon: "wallet",
      label: "Household income",
      value: `${currency(combinedIncome)} a month`,
    },
    {
      id: "budget-age",
      icon: "user",
      label: "Youngest buyer's age",
      value: budget.age === null ? "Not set" : String(budget.age),
    },
    {
      id: "budget-cpf",
      icon: "piggy",
      label: "CPF savings",
      value: budget.cpfOa === null ? "Not set" : currency(budget.cpfOa),
    },
    {
      id: "budget-cpf-monthly",
      icon: "calendar",
      label: "CPF added each month",
      value:
        monthlyCpf === null
          ? "Not set"
          : `${currency(monthlyCpf)}${budget.cpfMonthly === null ? " (estimated)" : ""}`,
    },
    {
      id: "budget-cash",
      icon: "cash",
      label: "Cash you could use",
      value:
        budget.cash === null
          ? `Fees only (${currency(feesInCash)})`
          : currency(budget.cash),
    },
    {
      id: "budget-first",
      icon: "home",
      label: "First-time buyers",
      value: firstTimerLabel[budget.firstTimers],
    },
  ];

  return (
    <section className="screen">
      <PageHeader
        title="Budget"
        subtitle="Tell us about your finances, and every project is checked against what you could spend."
      />

      {known ? (
        <BudgetAnswer
          part="hero"
          maxPrice={maxPrice}
          estimate={estimateAtMax}
          oaAtKeys={ceiling?.oaAtKeys ?? budget.cpfOa ?? 0}
          financing={financing}
          loanTenureYears={loanTenureYears}
          ehg={ehg}
          onSeeProjects={onSeeProjects}
          onOpenPlan={onOpenPlan}
        />
      ) : (
        <HeroCard art="budget">
          <p className="hero-lead">Your price ceiling</p>
          <p className="hero-figure hero-figure-ghost" aria-hidden="true">
            S$ ···
          </p>
          <ul className="checklist">
            {checklist.map((item) => (
              <li key={item.label} className={item.done ? "is-done" : ""}>
                <span aria-hidden="true">
                  {item.done ? <Icon name="check" /> : null}
                </span>
                {item.label}
                <span className="sr-only">
                  {item.done ? " (answered)" : " (still needed)"}
                </span>
              </li>
            ))}
          </ul>
        </HeroCard>
      )}
      <div className="two-col">
        <div className="col">
          {known && (
            <BudgetAnswer
              part="breakdown"
              maxPrice={maxPrice}
              estimate={estimateAtMax}
              oaAtKeys={ceiling?.oaAtKeys ?? budget.cpfOa ?? 0}
              financing={financing}
              loanTenureYears={loanTenureYears}
              ehg={ehg}
              onSeeProjects={onSeeProjects}
              onOpenPlan={onOpenPlan}
            />
          )}
          {known && ceiling && (
            <Note>
              Counts the CPF you build up before each payment is due: about{" "}
              {currency(ceiling.oaAtSigning)} by signing (in about{" "}
              {timing.monthsToSigning} months) and {currency(ceiling.oaAtKeys)}{" "}
              by keys (about {Math.round(timing.monthsToKeys / 6) / 2} years).
              Your grant is credited before signing.
              {monthlyCpf !== null && estimateAtMax?.estimatedMonthlyPayment
                ? monthlyCpf >= estimateAtMax.estimatedMonthlyPayment
                  ? ` After keys, your CPF of about ${currency(monthlyCpf)} a month covers the loan repayment.`
                  : ` After keys, CPF covers about ${currency(monthlyCpf)} of the ${currency(Math.round(estimateAtMax.estimatedMonthlyPayment))} monthly repayment; the other ${currency(Math.round(estimateAtMax.estimatedMonthlyPayment - monthlyCpf))} is cash.`
                : ""}
            </Note>
          )}
          <Note>
            Your figures stay in this browser and are never sent anywhere. HDB's
            HFE letter is the final word on what you can borrow.
          </Note>
        </div>

        <div className="col">
          {showForm ? (
            <form
              className="card form-card"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="card-head">
                <h2>
                  <span className="head-icon" aria-hidden="true">
                    <Icon name="user" />
                  </span>
                  Your answers
                </h2>
                {complete && (
                  <button
                    type="button"
                    className="edit-chip"
                    onClick={() => setEditing(false)}
                  >
                    <Icon name="check" />
                    Done
                  </button>
                )}
              </div>
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
                  An HDB loan has to end by 65, so age can shorten it. Between{" "}
                  {AGE_MIN} and {AGE_MAX}.
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
                      age:
                        age === null || age < AGE_MIN || age > AGE_MAX
                          ? null
                          : age,
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
                id="budget-cpf-monthly"
                label="CPF added to your Ordinary Account each month"
                hint={
                  estimatedMonthlyCpf === null
                    ? "Combined. Leave blank and we'll estimate it from income and age."
                    : `Combined. Leave blank to use our estimate of ${currency(estimatedMonthlyCpf)} from your income and age, or enter what your CPF statement shows (0 if self-employed).`
                }
                value={budget.cpfMonthly}
                max={SAVINGS_MAX}
                placeholder={
                  estimatedMonthlyCpf === null
                    ? "e.g. 1,380"
                    : `${estimatedMonthlyCpf.toLocaleString("en-SG")} (estimate)`
                }
                onCommit={(value) => onBudgetChange({ cpfMonthly: value })}
              />

              <MoneyField
                id="budget-cash"
                label="Cash you could use (optional)"
                hint={`Most of the downpayment can come from your grant and CPF. Cash is needed for the ${currency(feesInCash)} in fees, a bank loan's 5%, or a gap CPF can't cover in time. Leave out emergency and renovation money.`}
                value={budget.cash}
                max={SAVINGS_MAX}
                placeholder="e.g. 20,000"
                onCommit={(value) => onBudgetChange({ cash: value })}
              />

              <fieldset className="field" id="budget-first">
                <legend>Are you buying your first HDB flat?</legend>
                <p className="field-hint">
                  This decides the Enhanced CPF Housing Grant. A couple where
                  only one partner is a first-timer gets a smaller amount;
                  second-timers get none.
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
          ) : (
            <section className="card">
              <div className="card-head">
                <h2>
                  <span className="head-icon" aria-hidden="true">
                    <Icon name="user" />
                  </span>
                  Your answers
                </h2>
                <EditChip onClick={() => setEditing(true)} />
              </div>
              <ul className="rows">
                {answers.map((answer) => (
                  <li key={answer.id}>
                    <button
                      type="button"
                      className="row"
                      onClick={() => openField(answer.id)}
                    >
                      <span className="row-icon" aria-hidden="true">
                        <Icon name={answer.icon} />
                      </span>
                      <span className="row-label">{answer.label}</span>
                      <span className="row-value">{answer.value}</span>
                      <Icon name="chevron" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {known && estimateAtMax && maxPrice !== null && (
            <TipCard
              limit={describeLimit({
                estimate: estimateAtMax,
                loan: Math.round(estimateAtMax.loanForTarget ?? 0),
                maxPrice,
                financing,
                ceiling,
                timing,
              })}
              onSeeProjects={onSeeProjects}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function TipCard({
  limit,
  onSeeProjects,
}: {
  limit: { title: string; body: string };
  onSeeProjects: () => void;
}) {
  return (
    <section className="tip">
      <span className="tip-icon" aria-hidden="true">
        <Icon name="bulb" />
      </span>
      <div>
        <h2>{limit.title}</h2>
        <p>{limit.body}</p>
      </div>
      <button
        type="button"
        className="round-btn"
        aria-label="See flats that fit"
        onClick={onSeeProjects}
      >
        <Icon name="arrow" />
      </button>
    </section>
  );
}

function BudgetAnswer({
  part,
  maxPrice,
  estimate,
  oaAtKeys,
  financing,
  loanTenureYears,
  ehg,
  onSeeProjects,
  onOpenPlan,
}: {
  part: "hero" | "breakdown";
  maxPrice: number;
  estimate: FinancingEstimate;
  oaAtKeys: number;
  financing: FinancingType;
  loanTenureYears: number;
  ehg: EhgAssessment;
  onSeeProjects: () => void;
  onOpenPlan: () => void;
}) {
  const ceiling = Math.floor(maxPrice / 1000) * 1000;
  const loan = Math.round(estimate.loanForTarget ?? 0);
  const grant = Math.round(estimate.usableGrantAmount ?? 0);
  const ownFunds = Math.max(Math.round(maxPrice) - loan - grant, 0);
  const cpfUsed = Math.min(oaAtKeys, ownFunds);
  const cashUsed = Math.max(ownFunds - cpfUsed, 0);
  const tiles: Tile[] = [
    {
      key: "loan",
      icon: "home",
      label: financing === "bank" ? "Bank loan" : "HDB loan",
      amount: loan,
    },
    { key: "grant", icon: "sparkle", label: "Housing grant", amount: grant },
    { key: "cpf", icon: "piggy", label: "CPF by keys", amount: cpfUsed },
    { key: "cash", icon: "cash", label: "Cash", amount: cashUsed },
  ];
  const tenure = estimate.effectiveTenureYears;
  const monthly = estimate.estimatedMonthlyPayment;
  const shownCeiling = useCountUp(ceiling);
  const shownMonthly = useCountUp(Math.round(monthly ?? 0));

  if (part === "breakdown") {
    if (ceiling <= 0) return null;
    return (
      <>
        <StatTiles tiles={tiles} />
        <details className="card disclosure-card">
          <summary>What this estimate assumes</summary>
          <ul>
            <li>{ehg.note}</li>
            {estimate.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
            <li>
              Stamp duty and one-off fees are set aside from your savings before
              the price is worked out.
            </li>
          </ul>
        </details>
      </>
    );
  }

  if (ceiling <= 0) {
    return (
      <HeroCard art="budget">
        <p className="hero-lead">Not enough to reach a flat yet</p>
        <p className="hero-body-text">
          With {financingLabel[financing]}, some of the price has to come from
          savings or a grant. Add CPF or cash savings to see a ceiling.
        </p>
      </HeroCard>
    );
  }

  return (
    <HeroCard art="budget">
      <p className="hero-lead">You could buy a flat priced up to</p>
      <p className="hero-figure">
        {currency(Math.round(shownCeiling / 1000) * 1000)}
      </p>
      {monthly !== null && tenure !== null && loan > 0 && (
        <MonthlyChip
          amount={Math.round(shownMonthly)}
          years={tenure}
          note={
            tenure < loanTenureYears && financing === "hdb"
              ? "the loan must end by 65"
              : undefined
          }
        />
      )}
      <div className="hero-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSeeProjects}
        >
          See flats that fit
          <Icon name="arrow" />
        </button>
        <button type="button" className="text-link" onClick={onOpenPlan}>
          Change loan type
        </button>
      </div>
    </HeroCard>
  );
}

function describeLimit({
  estimate,
  loan,
  maxPrice,
  financing,
  ceiling,
  timing,
}: {
  estimate: FinancingEstimate;
  loan: number;
  maxPrice: number;
  financing: FinancingType;
  ceiling: CeilingResult | null;
  timing: PurchaseTiming;
}) {
  if (ceiling?.limitedBy === "signing") {
    return {
      title: "The payment at signing sets this ceiling",
      body: `Signing comes about ${timing.monthsToSigning} months from now, before much CPF has built up. Your grant and about ${currency(ceiling.oaAtSigning)} of CPF cover it up to this price. More cash, or the Staggered scheme on Plan, would raise it.`,
    };
  }
  if (ceiling?.limitedBy === "keys" && financing !== "none") {
    const share = Math.round((estimate.ltvLimit ?? 0.75) * 100);
    return {
      title: "Your savings by key collection set this ceiling",
      body: `A loan covers at most ${share}% of the price. The rest comes from your grant, cash and the ${currency(ceiling.oaAtKeys)} of CPF you'll have by keys. Later keys or more CPF each month would raise it.`,
    };
  }
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

export function MoneyField({
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
  const [text, setText] = useState(
    value === null ? "" : value.toLocaleString("en-SG"),
  );

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
