import { useMemo, useState, type ChangeEvent } from "react";
import {
  BANK_LOAN_TENURE_MAX,
  FLAT_MAX,
  FLAT_MIN,
  FLAT_TYPE_OPTIONS,
  HDB_LOAN_TENURE_MAX,
  LOAN_INTEREST_RATE_MAX,
  LOAN_INTEREST_RATE_MIN,
  LOAN_TENURE_MIN,
} from "../constants";
import type { BtoProject } from "../policies/policyConfig";
import type { FinancingType, FlatType, SchemeType, TimelineItem } from "../types";
import type { FinancingEstimate } from "../utils/affordability";
import type { BudgetInputs } from "../utils/budgetStorage";
import { formatDateInputDisplay } from "../utils/date";
import { currency } from "../utils/format";
import { Icon, PageHeader } from "./DashboardUi";

type PurchasePlanTabProps = {
  selectedProject: BtoProject | null;
  ehgGrant: number;
  targetEstimate: FinancingEstimate;
  budgetKnown: boolean;
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
  planStorageStatus: string;
  planStorageError: string | null;
  onOpenBudget: () => void;
  onOpenRadar: () => void;
  onFlatPriceChange: (value: number) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onFinancingChange: (value: FinancingType) => void;
  onSchemeChange: (value: SchemeType) => void;
  onLoanTenureChange: (value: number) => void;
  onLoanInterestRateChange: (value: number) => void;
  onSavePlan: () => void;
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
  normal: "Standard: the downpayment is split between signing the lease and collecting keys.",
  staggered:
    "Staggered Downpayment Scheme: a smaller part at signing and the rest at key collection. Check with HDB whether you qualify.",
  dia: "Deferred Income Assessment: for couples who are still studying or serving NS. HDB assesses income closer to key collection. Check with HDB whether you qualify.",
};

export function PurchasePlanTab({
  selectedProject,
  ehgGrant,
  targetEstimate,
  budgetKnown,
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
  planStorageStatus,
  planStorageError,
  onOpenBudget,
  onOpenRadar,
  onFlatPriceChange,
  onFlatTypeChange,
  onFinancingChange,
  onSchemeChange,
  onLoanTenureChange,
  onLoanInterestRateChange,
  onSavePlan,
  onToggleMilestoneComplete,
  onMilestoneDateChange,
}: PurchasePlanTabProps) {
  // With a budget set, the figures come from the financing estimate. Without one, the plan
  // falls back to the downpayment rule alone and says so.
  const known = budgetKnown && targetEstimate.completeness === "complete";
  const fallbackLoan =
    financing === "none" ? 0 : Math.max(flatPrice - signingAmount - keyAmount - ehgGrant, 0);
  const loan = known ? Math.round(targetEstimate.loanForTarget ?? 0) : fallbackLoan;
  const grant = known ? Math.round(targetEstimate.usableGrantAmount ?? 0) : ehgGrant;
  const gap = known ? Math.round(targetEstimate.fundingGap ?? 0) : 0;
  const tenure = known ? targetEstimate.effectiveTenureYears ?? loanTenureYears : loanTenureYears;
  const monthlyPayment = known
    ? targetEstimate.estimatedMonthlyPayment ?? 0
    : calculateMonthlyPayment(fallbackLoan, loanInterestRate, loanTenureYears);
  const ownNeeded = Math.max(flatPrice - loan - grant, 0);
  const cpfUsed = known ? Math.min(budget.cpfOa ?? 0, ownNeeded) : signingCpf + keyCpf;
  const cashUsed = known ? Math.max(ownNeeded - cpfUsed - gap, 0) : minCashSigning;
  const fundingParts = [
    { key: "loan", tone: "budget-part-loan", label: financing === "bank" ? "Bank loan" : "HDB loan", amount: loan },
    { key: "grant", tone: "budget-part-grant", label: "Housing grant", amount: grant },
    { key: "cpf", tone: "budget-part-cpf", label: "CPF savings", amount: cpfUsed },
    { key: "cash", tone: "budget-part-cash", label: "Cash", amount: cashUsed },
    { key: "short", tone: "plan-part-short", label: "Not covered", amount: gap },
  ].filter((part) => part.amount > 0);
  const fundingTotal = Math.max(
    fundingParts.reduce((sum, part) => sum + part.amount, 0),
    1
  );
  const projectVariant = selectedProject?.flatVariants.find((variant) => variant.type === flatType);
  const [paymentOverrides, setPaymentOverrides] = useState<Record<string, { total: number; cpf: number; cash: number }>>({});

  const effectiveTimeline = useMemo(() => {
    return timeline.map((item) => {
      if (!item.payment) return item;
      const override = paymentOverrides[item.label];
      if (!override) return item;
      return {
        ...item,
        payment: {
          ...item.payment,
          total: override.total,
          cpfOa: override.cpf,
          cash: override.cash,
        },
      };
    });
  }, [timeline, paymentOverrides]);

  const handleTogglePaymentFunding = (label: string, type: 'cpf' | 'cash') => {
    const item = effectiveTimeline.find((t) => t.label === label);
    if (!item?.payment) return;
    const { total, cpfOa, cash } = item.payment;
    // Only allow toggling for milestones that have both funding sources (or are downpayments)
    const isDownpayment = total >= 10000;
    if (!isDownpayment) return;

    setPaymentOverrides((prev) => {
      const current = prev[label] ?? { total, cpf: cpfOa, cash };
      if (type === 'cpf') {
        // Toggle CPF: if CPF > 0, move all to cash; if CPF is 0, move all back to CPF
        const newCpf = current.cpf > 0 ? 0 : current.total;
        const newCash = current.total - newCpf;
        return { ...prev, [label]: { ...current, cpf: newCpf, cash: newCash } };
      } else {
        // Toggle Cash: if Cash > 0, move all to CPF; if Cash is 0, move all back to Cash
        const newCash = current.cash > 0 ? 0 : current.total;
        const newCpf = current.total - newCash;
        return { ...prev, [label]: { ...current, cpf: newCpf, cash: newCash } };
      }
    });
  };

  const handlePaymentTotalChange = (label: string, newTotal: number) => {
    const item = effectiveTimeline.find((t) => t.label === label);
    if (!item?.payment) return;
    const { cpfOa, cash } = item.payment;
    const currentTotal = cpfOa + cash;
    if (currentTotal === 0) return;
    // Maintain the same ratio
    const cpfRatio = cpfOa / currentTotal;
    const cashRatio = cash / currentTotal;
    setPaymentOverrides((prev) => {
      return {
        ...prev,
        [label]: {
          total: newTotal,
          cpf: Math.round(newTotal * cpfRatio),
          cash: Math.round(newTotal * cashRatio),
        },
      };
    });
  };

  return (
    <section className="dashboard-page">
      <PageHeader
        title="Plan"
        subtitle="The flat you are aiming for, how you will pay, and what is due when."
        action={
          <div className="plan-actions">
            <button type="button" className="btn-primary" onClick={onSavePlan}>
              Save plan
            </button>
            <span className={planStorageError ? "form-error" : ""}>
              {planStorageError ? planStorageError : planStorageStatus}
            </span>
          </div>
        }
      />

      <div className="plan-layout">
        <div className="plan-main">
          <section className="plan-block">
            <h2>Your flat</h2>
            {selectedProject ? (
              <div className="plan-flat">
                <div>
                  <h3>{selectedProject.name}</h3>
                  <p>
                    {selectedProject.location}
                    {selectedProject.expectedTop ? `, keys estimated ${selectedProject.expectedTop}` : ""}
                    {projectVariant ? `, ${flatType} from ${currency(projectVariant.basePrice)}` : ""}
                  </p>
                </div>
                <button type="button" className="budget-link" onClick={onOpenRadar}>
                  Choose another
                </button>
              </div>
            ) : (
              <p className="plan-explain">
                No project chosen. You can plan around a target price alone, or{" "}
                <button type="button" className="budget-link" onClick={onOpenRadar}>
                  pick a project
                </button>
                .
              </p>
            )}
            <div className="plan-fields">
              <MoneyInput
                label="Target price"
                value={flatPrice}
                min={FLAT_MIN}
                max={FLAT_MAX}
                onChange={onFlatPriceChange}
              />
              <SelectField
                label="Flat size"
                value={flatType}
                onChange={(value) => onFlatTypeChange(value as FlatType)}
                options={FLAT_TYPE_OPTIONS}
              />
            </div>
          </section>

          <section className="plan-block">
            <h2>How you will pay</h2>
            <div className="plan-fields">
              <SegmentedField
                label="Loan"
                value={financing}
                onChange={(value) => onFinancingChange(value as FinancingType)}
                options={FINANCING_OPTIONS}
              />
              <SegmentedField
                label="Downpayment timing"
                value={scheme}
                onChange={(value) => onSchemeChange(value as SchemeType)}
                options={SCHEME_OPTIONS}
              />
            </div>
            <p className="plan-explain">{SCHEME_HELP[scheme]}</p>
            <p className="plan-explain">{downpaymentNote}</p>
            <details className="assumption-more">
              <summary>Loan length and interest rate</summary>
              <div className="assumption-grid assumption-grid-small">
                <NumberInput
                  label="Loan length"
                  value={loanTenureYears}
                  min={LOAN_TENURE_MIN}
                  max={getLoanTenureMax(financing)}
                  suffix="years"
                  onChange={onLoanTenureChange}
                />
                <NumberInput
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

        <aside className="plan-side">
          <div className="plan-summary">
            <p className="budget-lead">Target price</p>
            <p className="plan-summary-figure">{currency(flatPrice)}</p>

            {!known ? (
              <p className="plan-status plan-status-unknown">
                <Icon name="info" />
                Not checked against your budget yet
              </p>
            ) : gap > 0 ? (
              <p className="plan-status plan-status-short">
                <Icon name="alert" />
                {currency(gap)} short
              </p>
            ) : (
              <p className="plan-status plan-status-good">
                <Icon name="check" />
                Fits your budget
              </p>
            )}

            {loan > 0 && (
              <p className="budget-monthly">
                About <strong>{currency(Math.round(monthlyPayment))} a month</strong> for {tenure} years.
              </p>
            )}

            <div
              className="budget-bar"
              role="img"
              aria-label={`Paid for by ${fundingParts.map((part) => `${part.label} ${currency(part.amount)}`).join(", ")}`}
            >
              {fundingParts.map((part) => (
                <span
                  key={part.key}
                  className={`budget-bar-part ${part.tone}`}
                  style={{ flexGrow: part.amount / fundingTotal }}
                />
              ))}
            </div>
            <dl className="budget-legend">
              {fundingParts.map((part) => (
                <div key={part.key} className="budget-legend-row">
                  <dt>
                    <span className={`budget-swatch ${part.tone}`} aria-hidden="true" />
                    {part.label}
                  </dt>
                  <dd>{currency(part.amount)}</dd>
                </div>
              ))}
            </dl>

            {known && gap > 0 && (
              <p className="plan-explain">
                Your loan, grant and savings do not reach this price. A lower target, more savings or a different
                project would close the gap.
              </p>
            )}
            {!known && (
              <p className="plan-explain">
                These figures use the downpayment rule alone. Add your age and savings to check what you can
                borrow.
              </p>
            )}
            <button type="button" className="budget-link" onClick={onOpenBudget}>
              {known ? "Change income or savings" : "Set your budget"}
            </button>
          </div>

          <div className="plan-dates">
            <h2>Key dates</h2>
            <dl>
              {timeline.slice(0, 4).map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>
                    {confirmedMilestoneDates[item.label]
                      ? formatDateInputDisplay(confirmedMilestoneDates[item.label])
                      : item.date}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>

        <section className="plan-block plan-payments">
          <h2>Payments along the way</h2>
          <p className="plan-explain">
            Dates are estimates. Select an amount to replace it with your actual figure, and tick each step off
            as you finish it.
          </p>
          <div className="milestone-table-wrap">
            <table className="milestone-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>What you pay</th>
                  <th>Amount</th>
                  <th>Your date</th>
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                {effectiveTimeline.map((item, index) => (
                  <MilestoneRow
                    key={item.label}
                    item={item}
                    index={index}
                    confirmedDate={confirmedMilestoneDates[item.label]}
                    isComplete={completedMilestones.includes(item.label)}
                    onToggleComplete={onToggleMilestoneComplete}
                    onMilestoneDateChange={onMilestoneDateChange}
                    onTogglePaymentFunding={handleTogglePaymentFunding}
                    onPaymentTotalChange={handlePaymentTotalChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

function MoneyInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // Follow the value when it changes from outside, such as choosing a project.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(String(value));
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || /^\d+$/.test(raw)) {
      setText(raw);
    }
  };

  const handleBlur = () => {
    if (text === "") {
      onChange(min);
      return;
    }
    const num = Number(text);
    if (Number.isNaN(num)) {
      onChange(min);
    } else if (num < min) {
      onChange(min);
    } else if (num > max) {
      onChange(max);
    } else {
      onChange(num);
    }
  };

  return (
    <label className="input-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="input-field">
      <span>{label}</span>
      <div className="number-with-suffix">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <em>{suffix}</em>
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`select-field ${className}`}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SegmentedField({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`segmented-field ${className}`}>
      <span>{label}</span>
      <div
        className="segmented-button-group"
        style={{ "--segment-count": options.length } as React.CSSProperties}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === value ? "segmented-button-active" : ""}
            onClick={() => onChange(option.value)}
            aria-pressed={option.value === value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MilestoneRow({
  item,
  index,
  confirmedDate,
  isComplete,
  onToggleComplete,
  onMilestoneDateChange,
  onTogglePaymentFunding,
  onPaymentTotalChange,
}: {
  item: TimelineItem;
  index: number;
  confirmedDate: string | undefined;
  isComplete: boolean;
  onToggleComplete: (label: string) => void;
  onMilestoneDateChange: (label: string, value: string) => void;
  onTogglePaymentFunding: (label: string, type: 'cpf' | 'cash') => void;
  onPaymentTotalChange: (label: string, value: number) => void;
}) {
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountText, setAmountText] = useState("");
  const isInterchangeable = item.payment !== undefined && (item.payment.cpfOa > 0 && item.payment.cash > 0);

  return (
    <tr>
      <td>
        <div className="milestone-name">
          <span>{index + 1}</span>
          <div>
            <strong>{item.label}</strong>
            <p>{item.note}</p>
          </div>
        </div>
      </td>
      <td>{item.payment?.label ?? "No payment expected"}</td>
      <td>
        {item.payment ? (
          <div>
            {editingAmount ? (
              <input
                type="text"
                inputMode="numeric"
                value={amountText}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^\d+$/.test(raw)) {
                    setAmountText(raw);
                  }
                }}
                onBlur={() => {
                  const num = Number(amountText);
                  if (!Number.isNaN(num) && num > 0) {
                    onPaymentTotalChange(item.label, num);
                  }
                  setEditingAmount(false);
                  setAmountText("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="milestone-amount-input"
                autoFocus
              />
            ) : (
              <strong
                className="milestone-amount-editable"
                onClick={() => {
                  setAmountText(String(item.payment!.total));
                  setEditingAmount(true);
                }}
                title="Click to edit actual amount"
              >
                {currency(item.payment.total)}
              </strong>
            )}
            <div className="milestone-payment-tags">
              {item.payment.cpfOa > 0 && (
                <span
                  className={`milestone-tag milestone-tag-cpf ${isInterchangeable ? "milestone-tag-interactive" : ""}`}
                  onClick={isInterchangeable ? () => onTogglePaymentFunding(item.label, 'cpf') : undefined}
                  title={isInterchangeable ? "Click to move to Cash" : undefined}
                >
                  CPF {currency(item.payment.cpfOa)}
                </span>
              )}
              {item.payment.cash > 0 && (
                <span
                  className={`milestone-tag milestone-tag-cash ${isInterchangeable ? "milestone-tag-interactive" : ""}`}
                  onClick={isInterchangeable ? () => onTogglePaymentFunding(item.label, 'cash') : undefined}
                  title={isInterchangeable ? "Click to move to CPF" : undefined}
                >
                  Cash {currency(item.payment.cash)}
                </span>
              )}

            </div>
          </div>
        ) : (
          "-"
        )}
        <p>{item.date}</p>
      </td>
      <td>
        <input
          type="date"
          value={confirmedDate ?? ""}
          onChange={(event) => onMilestoneDateChange(item.label, event.target.value)}
          aria-label={`Expected date for ${item.label}`}
        />
      </td>
      <td>
        <button
          type="button"
          className={`milestone-status ${isComplete ? "milestone-status-done" : ""}`}
          onClick={() => onToggleComplete(item.label)}
          aria-pressed={isComplete}
        >
          <span className="milestone-status-box">
            {isComplete ? <Icon name="check" /> : <span className="milestone-status-empty" />}
          </span>
          {isComplete ? "Done" : "Mark done"}
        </button>
      </td>
    </tr>
  );
}

function calculateMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  tenureYears: number
) {
  if (principal <= 0 || tenureYears <= 0) return 0;

  const months = tenureYears * 12;
  const monthlyRate = annualRatePercent / 100 / 12;

  if (monthlyRate <= 0) return principal / months;

  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

function getLoanTenureMax(financing: FinancingType) {
  if (financing === "bank") return BANK_LOAN_TENURE_MAX;
  if (financing === "none") return BANK_LOAN_TENURE_MAX;
  return HDB_LOAN_TENURE_MAX;
}
