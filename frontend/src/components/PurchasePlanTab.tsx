import { useMemo, useState, type CSSProperties } from "react";
import {
  BANK_LOAN_TENURE_MAX,
  FLAT_MAX,
  FLAT_MIN,
  FLAT_TYPE_OPTIONS,
  HDB_LOAN_TENURE_MAX,
  INCOME_MAX,
  INCOME_MIN,
  LOAN_INTEREST_RATE_MAX,
  LOAN_INTEREST_RATE_MIN,
  LOAN_TENURE_MIN,
} from "../constants";
import type { BtoProject } from "../policies/policyConfig";
import type {
  FinancingType,
  FlatType,
  SchemeType,
  TimelineItem,
} from "../types";
import type { FinancingEstimate } from "../utils/affordability";
import type { BudgetInputs } from "../utils/budgetStorage";
import type { StageFunding } from "../utils/cpfProjection";
import { formatDateInputDisplay } from "../utils/date";
import { currency } from "../utils/format";
import { useCountUp } from "../utils/motion";
import type { PaymentOverride } from "../utils/planStorage";
import {
  EditChip,
  HeroCard,
  MonthlyChip,
  Note,
  StatTiles,
  type Tile,
} from "./Cards";
import { MoneyField } from "./BudgetTab";
import { Icon, PageHeader } from "./DashboardUi";
import { Segmented } from "./Segmented";

type PurchasePlanTabProps = {
  selectedProject: BtoProject | null;
  ehgGrant: number;
  targetEstimate: FinancingEstimate;
  budgetKnown: boolean;
  stageFunding: { signing: StageFunding; keys: StageFunding } | null;
  oaAtKeys: number | null;
  monthlyCpf: number | null;
  budget: BudgetInputs;
  flatPrice: number;
  flatType: FlatType;
  financing: FinancingType;
  scheme: SchemeType;
  loanTenureYears: number;
  loanInterestRate: number;
  signingAmount: number;
  keyAmount: number;
  minCashSigning: number;
  signingCpf: number;
  keyCpf: number;
  downpaymentNote: string;
  timeline: TimelineItem[];
  completedMilestones: string[];
  confirmedMilestoneDates: Record<string, string>;
  paymentOverrides: Record<string, PaymentOverride>;
  onPaymentOverridesChange: (
    update: (
      current: Record<string, PaymentOverride>,
    ) => Record<string, PaymentOverride>,
  ) => void;
  loadError: string | null;
  combinedIncome: number;
  onIncomeChange: (value: number) => void;
  onBudgetChange: (patch: Partial<BudgetInputs>) => void;
  onOpenBudget: () => void;
  onOpenRadar: () => void;
  onFlatPriceChange: (value: number) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onFinancingChange: (value: FinancingType) => void;
  onSchemeChange: (value: SchemeType) => void;
  onLoanTenureChange: (value: number) => void;
  onLoanInterestRateChange: (value: number) => void;
  onToggleMilestoneComplete: (label: string) => void;
  onMilestoneDateChange: (label: string, value: string) => void;
};

const FINANCING_OPTIONS: { value: FinancingType; label: string }[] = [
  { value: "hdb", label: "HDB loan" },
  { value: "bank", label: "Bank loan" },
  { value: "none", label: "No loan" },
];

const SCHEME_OPTIONS: { value: SchemeType; label: string }[] = [
  { value: "normal", label: "Standard" },
  { value: "staggered", label: "Staggered" },
  { value: "dia", label: "Deferred" },
];

const SCHEME_HELP: Record<SchemeType, string> = {
  normal:
    "The downpayment is split between signing the lease and collecting keys.",
  staggered:
    "Staggered Downpayment Scheme: a smaller part at signing and the rest at key collection. Check with HDB whether you qualify.",
  dia: "Deferred Income Assessment: for couples still studying or serving NS. HDB assesses income closer to key collection. Check with HDB whether you qualify.",
};

export function PurchasePlanTab({
  selectedProject,
  ehgGrant,
  targetEstimate,
  budgetKnown,
  stageFunding,
  oaAtKeys,
  monthlyCpf,
  budget,
  flatPrice,
  flatType,
  financing,
  scheme,
  loanTenureYears,
  loanInterestRate,
  signingAmount,
  keyAmount,
  minCashSigning,
  signingCpf,
  keyCpf,
  downpaymentNote,
  timeline,
  completedMilestones,
  confirmedMilestoneDates,
  paymentOverrides,
  onPaymentOverridesChange,
  loadError,
  combinedIncome,
  onIncomeChange,
  onBudgetChange,
  onOpenBudget,
  onOpenRadar,
  onFlatPriceChange,
  onFlatTypeChange,
  onFinancingChange,
  onSchemeChange,
  onLoanTenureChange,
  onLoanInterestRateChange,
  onToggleMilestoneComplete,
  onMilestoneDateChange,
}: PurchasePlanTabProps) {
  // With a budget set, the figures come from the financing estimate. Without one, the plan
  // falls back to the downpayment rule alone and says so.
  const known = budgetKnown && targetEstimate.completeness === "complete";
  const fallbackLoan =
    financing === "none"
      ? 0
      : Math.max(flatPrice - signingAmount - keyAmount - ehgGrant, 0);
  const loan = known
    ? Math.round(targetEstimate.loanForTarget ?? 0)
    : fallbackLoan;
  const grant = known
    ? Math.round(targetEstimate.usableGrantAmount ?? 0)
    : ehgGrant;
  const gap = known ? Math.round(targetEstimate.fundingGap ?? 0) : 0;
  const tenure = known
    ? (targetEstimate.effectiveTenureYears ?? loanTenureYears)
    : loanTenureYears;
  const monthlyPayment = known
    ? (targetEstimate.estimatedMonthlyPayment ?? 0)
    : calculateMonthlyPayment(fallbackLoan, loanInterestRate, loanTenureYears);
  const ownNeeded = Math.max(flatPrice - loan - grant, 0);
  const cpfUsed = known
    ? Math.min(oaAtKeys ?? budget.cpfOa ?? 0, ownNeeded)
    : signingCpf + keyCpf;
  const signingShort = stageFunding ? stageFunding.signing.uncovered : 0;
  const cpfCoversMonthly = monthlyCpf !== null && monthlyCpf >= monthlyPayment;
  const cashUsed = known
    ? Math.max(ownNeeded - cpfUsed - gap, 0)
    : minCashSigning;
  const tiles: Tile[] = [
    {
      key: "loan",
      icon: "home",
      label: financing === "bank" ? "Bank loan" : "HDB loan",
      amount: loan,
    },
    { key: "grant", icon: "sparkle", label: "Housing grant", amount: grant },
    { key: "cpf", icon: "piggy", label: known ? "CPF by keys" : "CPF savings", amount: cpfUsed },
    { key: "cash", icon: "cash", label: "Cash", amount: cashUsed },
  ];
  const projectVariant = selectedProject?.flatVariants.find(
    (variant) => variant.type === flatType,
  );
  const shownPrice = useCountUp(flatPrice);
  const shownMonthly = useCountUp(Math.round(monthlyPayment));

  const effectiveTimeline = useMemo(
    () =>
      timeline.map((item) => {
        const override = item.payment
          ? paymentOverrides[item.label]
          : undefined;
        if (!item.payment || !override) return item;
        return {
          ...item,
          payment: {
            ...item.payment,
            total: override.total,
            cpfOa: override.cpf,
            cash: override.cash,
            grant: 0,
            shortfall: 0,
          },
        };
      }),
    [timeline, paymentOverrides],
  );
  const doneCount = effectiveTimeline.filter((item) =>
    completedMilestones.includes(item.label),
  ).length;

  const handleSwitchFunding = (label: string) => {
    const item = effectiveTimeline.find((entry) => entry.label === label);
    if (!item?.payment) return;
    const { total, cpfOa, cash } = item.payment;
    onPaymentOverridesChange((current) => {
      const base = current[label] ?? { total, cpf: cpfOa, cash };
      // Move the whole payment to the other source; switching again moves it back.
      return base.cpf > 0
        ? {
            ...current,
            [label]: { total: base.total, cpf: 0, cash: base.total },
          }
        : {
            ...current,
            [label]: { total: base.total, cpf: base.total, cash: 0 },
          };
    });
  };

  const handlePaymentTotalChange = (label: string, newTotal: number) => {
    const item = effectiveTimeline.find((entry) => entry.label === label);
    if (!item?.payment) return;
    const { cpfOa, cash } = item.payment;
    const currentTotal = cpfOa + cash;
    if (currentTotal === 0) return;
    const cpfRatio = cpfOa / currentTotal;
    onPaymentOverridesChange((current) => ({
      ...current,
      [label]: {
        total: newTotal,
        cpf: Math.round(newTotal * cpfRatio),
        cash: newTotal - Math.round(newTotal * cpfRatio),
      },
    }));
  };

  return (
    <section className="screen">
      <PageHeader
        title="Plan"
        subtitle="Your flat, how you'll pay for it, and what's due when. Changes save automatically."
      />

      {loadError && (
        <div className="callout callout-caution" role="alert">
          <p>
            Your earlier plan couldn't be loaded, so this is a fresh one.{" "}
            {loadError}
          </p>
        </div>
      )}

      <HeroCard art="plan">
        <div className="hero-top">
          <p className="hero-lead">
            <Icon name="target" />
            Target price
          </p>
          <EditChip
            onClick={() => {
              const field = document.getElementById(
                "plan-price",
              ) as HTMLInputElement | null;
              field?.focus();
              field?.select();
            }}
          />
        </div>
        <p className="hero-figure">{currency(Math.round(shownPrice))}</p>
        {loan > 0 && (
          <MonthlyChip amount={Math.round(shownMonthly)} years={tenure} />
        )}
        {!known ? (
          <p className="pill pill-neutral">Not checked against your budget</p>
        ) : gap > 0 ? (
          <p className="pill pill-caution">
            <Icon name="alert" />
            {currency(gap)} short
          </p>
        ) : (
          <p className="pill pill-positive">
            <Icon name="check" />
            Fits your budget
          </p>
        )}
      </HeroCard>

      <div className="two-col plan-cols">
        <div className="col">
          <StatTiles tiles={tiles} />

          {known && signingShort > 0 && (
            <Note>
              At signing you'd need {currency(signingShort)} more than your grant, CPF by then and cash cover. The
              Staggered scheme, more cash, or a lower price would close it.
            </Note>
          )}
          {known && monthlyCpf !== null && monthlyPayment > 0 && (
            <Note>
              {cpfCoversMonthly
                ? `After keys, your CPF of about ${currency(monthlyCpf)} a month covers the ${currency(Math.round(monthlyPayment))} repayment.`
                : `After keys, CPF covers about ${currency(monthlyCpf)} of the ${currency(Math.round(monthlyPayment))} monthly repayment; the rest is cash.`}
            </Note>
          )}
          {known && gap > 0 && (
            <Note>
              Your loan, grant and savings don't reach this price by{" "}
              {currency(gap)}. A lower target, more savings or a different
              project would close the gap.
            </Note>
          )}
          {!known && (
            <section className="card form-card">
              <div className="card-head">
                <h2>
                  <span className="head-icon" aria-hidden="true">
                    <Icon name="wallet" />
                  </span>
                  Check this price against your finances
                </h2>
              </div>
              <p className="muted">
                Three answers check this price against your loan, grant and CPF. The rest of your budget is optional.
              </p>
              <MoneyField
                id="plan-income"
                label="Household income, per month"
                hint="Before CPF and tax, for everyone buying."
                value={combinedIncome}
                max={INCOME_MAX}
                onCommit={(value) => onIncomeChange(value ?? INCOME_MIN)}
              />
              <div className="field">
                <label htmlFor="plan-age">Age of the youngest buyer</label>
                <input
                  id="plan-age"
                  className="input input-short"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 29"
                  defaultValue={budget.age ?? ""}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "");
                    const age = digits === "" ? null : Number(digits);
                    onBudgetChange({ age: age === null || age < 21 || age > 70 ? null : age });
                  }}
                />
              </div>
              <MoneyField
                id="plan-cpf"
                label="CPF Ordinary Account savings"
                hint="Everyone buying, combined. Enter 0 if none."
                value={budget.cpfOa}
                max={2000000}
                placeholder="e.g. 20,000"
                onCommit={(value) => onBudgetChange({ cpfOa: value })}
              />
              <button type="button" className="text-link" onClick={onOpenBudget}>
                Add cash and grant details on Budget
              </button>
            </section>
          )}

          <section className="card">
            <div className="card-head">
              <h2>
                <span className="head-icon" aria-hidden="true">
                  <Icon name="building" />
                </span>
                Your flat
              </h2>
              <EditChip label="Change" onClick={onOpenRadar} />
            </div>
            {selectedProject ? (
              <div className="flat-row">
                <span className="flat-thumb" aria-hidden="true">
                  <Icon name="building" />
                </span>
                <div>
                  <h3>{selectedProject.name}</h3>
                  <p className="muted">
                    {selectedProject.location}, {flatType}
                    {keysPhrase(selectedProject.expectedTop)}
                    {projectVariant
                      ? `, from ${currency(projectVariant.basePrice)}`
                      : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flat-row">
                <span className="flat-thumb" aria-hidden="true">
                  <Icon name="building" />
                </span>
                <p className="muted">
                  No project chosen. Plan around a target price, or pick a
                  project to fill it in.
                </p>
              </div>
            )}
            <div className="field-row">
              <MoneyInput
                id="plan-price"
                label="Target price"
                value={flatPrice}
                min={FLAT_MIN}
                max={FLAT_MAX}
                onChange={onFlatPriceChange}
              />
              <div className="field">
                <label htmlFor="plan-size">Flat size</label>
                <select
                  id="plan-size"
                  className="input select"
                  value={flatType}
                  onChange={(event) =>
                    onFlatTypeChange(event.target.value as FlatType)
                  }
                >
                  {FLAT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>
                <span className="head-icon" aria-hidden="true">
                  <Icon name="wallet" />
                </span>
                How you'll pay
              </h2>
            </div>
            <div className="field">
              <span className="field-label">Loan</span>
              <Segmented
                label="Loan"
                value={financing}
                options={FINANCING_OPTIONS}
                onChange={onFinancingChange}
              />
            </div>
            <div className="field">
              <span className="field-label">Downpayment timing</span>
              <Segmented
                label="Downpayment timing"
                value={scheme}
                options={SCHEME_OPTIONS}
                onChange={onSchemeChange}
              />
            </div>
            <Note>
              {SCHEME_HELP[scheme]} {downpaymentNote}
            </Note>
            <details className="disclosure">
              <summary>Loan length and interest rate</summary>
              <div className="field-row">
                <NumberInput
                  id="plan-tenure"
                  label="Loan length"
                  value={loanTenureYears}
                  min={LOAN_TENURE_MIN}
                  max={getLoanTenureMax(financing)}
                  suffix="years"
                  onChange={onLoanTenureChange}
                />
                <NumberInput
                  id="plan-rate"
                  label="Interest rate"
                  value={loanInterestRate}
                  min={LOAN_INTEREST_RATE_MIN}
                  max={LOAN_INTEREST_RATE_MAX}
                  step={0.05}
                  suffix="% a year"
                  onChange={onLoanInterestRateChange}
                />
              </div>
            </details>
          </section>
        </div>

        <div className="col">
          <section className="card payments">
            <div className="card-head">
              <h2>
                <span className="head-icon" aria-hidden="true">
                  <Icon name="calendar" />
                </span>
                Payments along the way
              </h2>
              <p className="muted">
                {doneCount} of {effectiveTimeline.length} done
              </p>
            </div>
            <div className="progress" aria-hidden="true">
              <span
                style={{
                  width: `${(doneCount / Math.max(effectiveTimeline.length, 1)) * 100}%`,
                }}
              />
            </div>
            <p className="field-hint">
              Dates are estimates. Select a date to set your own, select an
              amount to replace it with your actual figure, and tick each step
              off as you go.
            </p>
            <ol className="timeline">
              {effectiveTimeline.map((item, index) => (
                <TimelineStep
                  key={item.label}
                  item={item}
                  index={index}
                  confirmedDate={confirmedMilestoneDates[item.label]}
                  isComplete={completedMilestones.includes(item.label)}
                  onToggleComplete={onToggleMilestoneComplete}
                  onMilestoneDateChange={onMilestoneDateChange}
                  onSwitchFunding={handleSwitchFunding}
                  onPaymentTotalChange={handlePaymentTotalChange}
                />
              ))}
            </ol>
          </section>
        </div>
      </div>
    </section>
  );
}

function TimelineStep({
  item,
  index,
  confirmedDate,
  isComplete,
  onToggleComplete,
  onMilestoneDateChange,
  onSwitchFunding,
  onPaymentTotalChange,
}: {
  item: TimelineItem;
  index: number;
  confirmedDate: string | undefined;
  isComplete: boolean;
  onToggleComplete: (label: string) => void;
  onMilestoneDateChange: (label: string, value: string) => void;
  onSwitchFunding: (label: string) => void;
  onPaymentTotalChange: (label: string, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [amountText, setAmountText] = useState("");
  const payment = item.payment;
  // Switching CPF and cash makes sense only where the grant is not paying part of it.
  const canSwitch = Boolean(payment && payment.total >= 10000 && !(payment.grant ?? 0));

  return (
    <li
      className={isComplete ? "timeline-step is-done" : "timeline-step"}
      style={{ ["--i" as string]: index } as CSSProperties}
    >
      <button
        type="button"
        className="timeline-dot"
        aria-pressed={isComplete}
        aria-label={
          isComplete
            ? `Mark ${item.label} as not done`
            : `Mark ${item.label} as done`
        }
        onClick={() => onToggleComplete(item.label)}
      >
        {isComplete ? <Icon name="check" /> : index + 1}
      </button>

      <div className="timeline-body">
        <div className="timeline-top">
          <div>
            <h3>{item.label}</h3>
            <p className="muted">{item.note}</p>
          </div>
          {editingDate ? (
            <input
              type="date"
              className="input input-date"
              aria-label={`Your date for ${item.label}`}
              value={confirmedDate ?? ""}
              autoFocus
              onChange={(event) =>
                onMilestoneDateChange(item.label, event.target.value)
              }
              onBlur={() => setEditingDate(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Escape")
                  setEditingDate(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="timeline-date"
              aria-label={`${confirmedDate ? "Your date" : "Estimated"} ${confirmedDate ? formatDateInputDisplay(confirmedDate) : item.date}. Change date for ${item.label}`}
              onClick={() => setEditingDate(true)}
            >
              <strong>
                {confirmedDate
                  ? formatDateInputDisplay(confirmedDate)
                  : item.date}
              </strong>
              <span>{confirmedDate ? "Your date" : "Estimated"}</span>
            </button>
          )}
        </div>

        {payment && (
          <div className="timeline-pay">
            <span className="muted">{payment.label}</span>
            {editing ? (
              <input
                className="input input-amount"
                inputMode="numeric"
                aria-label={`Actual amount for ${item.label}`}
                value={amountText}
                autoFocus
                onChange={(event) =>
                  setAmountText(event.target.value.replace(/\D/g, ""))
                }
                onBlur={() => {
                  const amount = Number(amountText);
                  if (amountText !== "" && amount > 0)
                    onPaymentTotalChange(item.label, amount);
                  setEditing(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") setEditing(false);
                }}
              />
            ) : (
              <button
                type="button"
                className="timeline-amount"
                title="Replace with your actual amount"
                onClick={() => {
                  setAmountText(String(payment.total));
                  setEditing(true);
                }}
              >
                {currency(payment.total)}
                <Icon name="edit" />
              </button>
            )}
            <span className="timeline-split">
              <FundingTags payment={payment} />
              {canSwitch && (
                <button
                  type="button"
                  className="text-link text-link-small"
                  onClick={() => onSwitchFunding(item.label)}
                >
                  {payment.cpfOa > 0
                    ? "Pay in cash instead"
                    : "Pay from CPF instead"}
                </button>
              )}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

function MoneyInput({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(value.toLocaleString("en-SG"));
  const [syncedValue, setSyncedValue] = useState(value);

  // Follow the value when it changes from outside, such as choosing a project.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(value.toLocaleString("en-SG"));
  }

  const commit = () => {
    const amount = Number(text.replace(/\D/g, ""));
    const next =
      text.trim() === "" || Number.isNaN(amount)
        ? min
        : Math.min(Math.max(amount, min), max);
    onChange(next);
    setText(next.toLocaleString("en-SG"));
  };

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
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
            setText(
              digits === "" ? "" : Number(digits).toLocaleString("en-SG"),
            );
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </div>
    </div>
  );
}

function NumberInput({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input input-suffix">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span>{suffix}</span>
      </div>
    </div>
  );
}

// Listings say "To be announced" until HDB publishes a completion date.
function keysPhrase(expectedTop: string | undefined) {
  if (!expectedTop) return "";
  return /announced/i.test(expectedTop)
    ? ", keys date not announced yet"
    : `, keys estimated ${expectedTop}`;
}

function calculateMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  tenureYears: number,
) {
  if (principal <= 0 || tenureYears <= 0) return 0;
  const months = tenureYears * 12;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate <= 0) return principal / months;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

function getLoanTenureMax(financing: FinancingType) {
  if (financing === "hdb") return HDB_LOAN_TENURE_MAX;
  return BANK_LOAN_TENURE_MAX;
}

// How a payment is covered: grant, CPF and cash, plus any cash still to find.
function FundingTags({ payment }: { payment: TimelineItem["payment"] & object }) {
  const parts = [
    { key: "grant", amount: payment.grant ?? 0, only: "From your grant", label: "Grant" },
    { key: "cpf", amount: payment.cpfOa, only: "From CPF", label: "CPF" },
    { key: "cash", amount: payment.cash, only: "In cash", label: "Cash" },
  ].filter((part) => part.amount > 0);
  const shortfall = payment.shortfall ?? 0;
  return (
    <>
      {parts.length === 1 ? (
        <span className={`tag tag-${parts[0].key}`}>{parts[0].only}</span>
      ) : (
        parts.map((part) => (
          <span key={part.key} className={`tag tag-${part.key}`}>
            {part.label} {currency(part.amount)}
          </span>
        ))
      )}
      {shortfall > 0 && (
        <span className="tag tag-short">
          <Icon name="alert" />
          {currency(shortfall)} more cash needed
        </span>
      )}
    </>
  );
}
