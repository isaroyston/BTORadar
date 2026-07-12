import { useMemo, useState, useId, type ChangeEvent } from "react";
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
  EhgMode,
  FinancingType,
  FlatType,
  SchemeType,
  TimelineItem,
  TimelinePayment,
  TimelinePaymentOverride,
} from "../types";
import type { FinancingEstimate } from "../utils/affordability";
import {
  formatDateInputDisplay,
  getLaunchMonthSortValue,
  MAX_SUPPORTED_APPLICATION_MONTH,
  MIN_SUPPORTED_APPLICATION_MONTH,
  parseMonthYearDate,
} from "../utils/date";
import type { EhgAssessment } from "../utils/ehg";
import { currency } from "../utils/format";
import {
  Card,
  Icon,
  MetricRow,
  PageHeader,
  Pill,
} from "./DashboardUi";

type PurchasePlanTabProps = {
  selectedProject: BtoProject | null;
  combinedIncome: number;
  loanAmount: number | null;
  ehgGrant: number | null;
  totalAffordability: number | null;
  financingEstimate: FinancingEstimate;
  ehgAssessment: EhgAssessment;
  availableCash: number | null;
  availableCpfOa: number | null;
  monthlyDebtPayments: number | null;
  monthlyPropertyLoanPayments: number | null;
  bankThereafterRate: number | null;
  ageForLoanRules: number | null;
  outstandingHousingLoans: 0 | 1 | 2 | null;
  ehgMode: EhgMode;
  ehgAssessedIncome: number | null;
  ehgConfirmedAmount: number | null;
  ehgFamilyEligibilityConfirmed: boolean;
  applicationMonth: string;
  modeledPlanTotal: number;
  flatPrice: number;
  flatType: FlatType;
  financing: FinancingType;
  scheme: SchemeType;
  loanTenureYears: number;
  loanInterestRate: number;
  downpaymentNote: string;
  timeline: TimelineItem[];
  completedMilestones: string[];
  confirmedMilestoneDates: Record<string, string>;
  paymentOverrides: Record<string, TimelinePaymentOverride>;
  planStorageStatus: string;
  planStorageError: string | null;
  onIncomeChange: (value: number) => void;
  onFlatPriceChange: (value: number) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onFinancingChange: (value: FinancingType) => void;
  onSchemeChange: (value: SchemeType) => void;
  onLoanTenureChange: (value: number) => void;
  onLoanInterestRateChange: (value: number) => void;
  onSavePlan: () => void;
  onToggleMilestoneComplete: (label: string) => void;
  onMilestoneDateChange: (label: string, value: string) => void;
  onPaymentOverrideChange: (
    label: string,
    override: TimelinePaymentOverride
  ) => void;
  onAvailableCashChange: (value: number | null) => void;
  onAvailableCpfOaChange: (value: number | null) => void;
  onMonthlyDebtPaymentsChange: (value: number | null) => void;
  onMonthlyPropertyLoanPaymentsChange: (value: number | null) => void;
  onBankThereafterRateChange: (value: number | null) => void;
  onAgeForLoanRulesChange: (value: number | null) => void;
  onOutstandingHousingLoansChange: (value: 0 | 1 | 2 | null) => void;
  onEhgModeChange: (value: EhgMode) => void;
  onEhgAssessedIncomeChange: (value: number | null) => void;
  onEhgConfirmedAmountChange: (value: number | null) => void;
  onEhgFamilyEligibilityConfirmedChange: (value: boolean) => void;
  onApplicationMonthChange: (value: string) => void;
};

const FINANCING_OPTIONS: { value: FinancingType; label: string }[] = [
  { value: "hdb", label: "HDB Loan" },
  { value: "bank", label: "Bank Loan" },
  { value: "none", label: "No Loan" },
];

const SCHEME_OPTIONS: { value: SchemeType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "staggered", label: "Staggered" },
  { value: "dia", label: "DIA" },
];

const EHG_OPTIONS: { value: EhgMode; label: string }[] = [
  { value: "unassessed", label: "Not assessed" },
  { value: "confirmed", label: "HFE-confirmed amount" },
  { value: "family-estimate", label: "Conditional family estimate" },
  { value: "none", label: "No EHG" },
];

export function PurchasePlanTab({
  selectedProject,
  combinedIncome,
  loanAmount,
  ehgGrant,
  totalAffordability,
  financingEstimate,
  ehgAssessment,
  availableCash,
  availableCpfOa,
  monthlyDebtPayments,
  monthlyPropertyLoanPayments,
  bankThereafterRate,
  ageForLoanRules,
  outstandingHousingLoans,
  ehgMode,
  ehgAssessedIncome,
  ehgConfirmedAmount,
  ehgFamilyEligibilityConfirmed,
  applicationMonth,
  modeledPlanTotal,
  flatPrice,
  flatType,
  financing,
  scheme,
  loanTenureYears,
  loanInterestRate,
  downpaymentNote,
  timeline,
  completedMilestones,
  confirmedMilestoneDates,
  paymentOverrides,
  planStorageStatus,
  planStorageError,
  onIncomeChange,
  onFlatPriceChange,
  onFlatTypeChange,
  onFinancingChange,
  onSchemeChange,
  onLoanTenureChange,
  onLoanInterestRateChange,
  onSavePlan,
  onToggleMilestoneComplete,
  onMilestoneDateChange,
  onPaymentOverrideChange,
  onAvailableCashChange,
  onAvailableCpfOaChange,
  onMonthlyDebtPaymentsChange,
  onMonthlyPropertyLoanPaymentsChange,
  onBankThereafterRateChange,
  onAgeForLoanRulesChange,
  onOutstandingHousingLoansChange,
  onEhgModeChange,
  onEhgAssessedIncomeChange,
  onEhgConfirmedAmountChange,
  onEhgFamilyEligibilityConfirmedChange,
  onApplicationMonthChange,
}: PurchasePlanTabProps) {
  const [showAffordTip, setShowAffordTip] = useState(false);
  const affordTipId = useId();
  const effectiveTimeline = useMemo(() => {
    return timeline.map((item) => {
      if (!item.payment) return item;
      const override = paymentOverrides[item.id];
      if (!override) return item;
      if (
        (item.payment.grant ?? 0) > 0 ||
        (item.payment.unallocated ?? 0) > 0
      ) {
        return item;
      }
      const requiredCash = Math.min(
        item.payment.minimumCash ?? 0,
        override.total
      );
      const effectiveCash = Math.min(
        override.total,
        Math.max(override.cash, requiredCash)
      );
      return {
        ...item,
        payment: {
          ...item.payment,
          total: override.total,
          cpfOa: override.total - effectiveCash,
          cash: effectiveCash,
          grant: 0,
          unallocated: 0,
        },
      };
    });
  }, [timeline, paymentOverrides]);
  const effectivePayments = effectiveTimeline.flatMap((item) =>
    item.payment ? [item.payment] : []
  );
  const cpfTotal = sumPayments(effectivePayments, "cpfOa");
  const cashTotal = sumPayments(effectivePayments, "cash");
  const grantUsed = sumPayments(effectivePayments, "grant");
  const unallocatedTotal = sumPayments(effectivePayments, "unallocated");
  const loanForTarget = financingEstimate.loanForTarget;
  const loanForFunding = loanForTarget ?? 0;
  const rawTimelineFunding =
    loanForFunding + cpfTotal + cashTotal + grantUsed + unallocatedTotal;
  const reconciliationDifference = Math.abs(
    modeledPlanTotal - rawTimelineFunding
  );
  const unallocatedForBreakdown =
    unallocatedTotal + Math.max(modeledPlanTotal - rawTimelineFunding, 0);
  const fundingTotal = Math.max(modeledPlanTotal, rawTimelineFunding, 1);
  const [loanShare, cpfShare, cashShare, grantShare, unallocatedShare] =
    getFundingShares(
      [
        loanForFunding,
        cpfTotal,
        cashTotal,
        grantUsed,
        unallocatedForBreakdown,
      ],
      fundingTotal
    );
  const isAssessmentComplete = financingEstimate.completeness === "complete";
  const isConditionalAssessment =
    ehgAssessment.status === "conditional-estimate" ||
    scheme !== "normal" ||
    combinedIncome > 14000;
  const isWithinAffordability =
    isAssessmentComplete &&
    financingEstimate.fundingGap === 0 &&
    reconciliationDifference < 0.5;
  const loanLabel =
    loanForTarget === null
      ? "Loan not assessed"
      : financing === "hdb"
      ? "Estimated HDB loan"
      : financing === "bank"
        ? "Estimated bank loan"
        : "No loan";
  const selectedProjectVariant = selectedProject?.flatVariants.find(
    (variant) => variant.type === flatType
  );
  const selectedProjectIsHistorical = Boolean(
    selectedProject &&
      (selectedProject.status === "completed" ||
        selectedProject.status === "construction" ||
        (getLaunchMonthSortValue(selectedProject.launchMonth) > 0 &&
          getLaunchMonthSortValue(selectedProject.launchMonth) <
            2024 * 12 + 9))
  );
  const targetExceedsBudget =
    totalAffordability !== null && flatPrice > totalAffordability;
  const targetPriceNeedsWarning = Boolean(
    (selectedProject && !selectedProjectVariant) || targetExceedsBudget
  );

  const handleTogglePaymentFunding = (label: string, type: "cpf" | "cash") => {
    const item = effectiveTimeline.find((t) => t.id === label);
    if (!item?.payment) return;
    const { total, cpfOa, cash, minimumCash = 0 } = item.payment;
    if (
      item.payment.fundingLocked ||
      (item.payment.grant ?? 0) > 0 ||
      (item.payment.unallocated ?? 0) > 0
    ) {
      return;
    }

    const current = paymentOverrides[label] ?? { total, cpf: cpfOa, cash };
    if (type === "cpf") {
      const newCpf = current.cpf > 0 ? 0 : current.total - minimumCash;
      onPaymentOverrideChange(label, {
        ...current,
        cpf: newCpf,
        cash: current.total - newCpf,
      });
      return;
    }

    const newCash = Math.min(minimumCash, current.total);
    onPaymentOverrideChange(label, {
      ...current,
      cash: newCash,
      cpf: current.total - newCash,
    });
  };

  const handlePaymentTotalChange = (label: string, newTotal: number) => {
    const item = effectiveTimeline.find((t) => t.id === label);
    if (!item?.payment) return;
    const { cpfOa, cash, minimumCash = 0, fundingLocked } = item.payment;
    const currentTotal = cpfOa + cash;
    const nextMinimumCash = Math.min(minimumCash, newTotal);
    const nextCash = fundingLocked
      ? newTotal
      : Math.max(
          nextMinimumCash,
          currentTotal > 0 ? Math.round(newTotal * (cash / currentTotal)) : 0
        );
    onPaymentOverrideChange(label, {
      total: newTotal,
      cpf: newTotal - nextCash,
      cash: nextCash,
    });
  };

  return (
    <section className="dashboard-page">
      <PageHeader
        title="Plan"
        subtitle="Adjust your budget, financing, and payment milestones."
        action={
          <div className="plan-actions">
            <button type="button" className="btn-primary" onClick={onSavePlan}>
              Save Plan
            </button>
            <span className={planStorageError ? "form-error" : ""}>
              <Icon name="calendar" />
              {planStorageError ? planStorageError : planStorageStatus}
            </span>
          </div>
        }
      />

      <div className="plan-layout">
        <div className="plan-main">
          {selectedProject && (
            <Card className="plan-section-card plan-project-card">
              <div className="plan-project-header">
                <div>
                  <h3>{selectedProject.name}</h3>
                  <div className="plan-project-meta">
                    <span className="plan-project-tag">{selectedProject.location}</span>
                    {selectedProject.btoType && (
                      <span className={`plan-project-badge plan-project-badge-${selectedProject.btoType.toLowerCase()}`}>
                        {selectedProject.btoType.charAt(0).toUpperCase() + selectedProject.btoType.slice(1)}
                      </span>
                    )}
                    {selectedProject.status && (
                      <span className="plan-project-tag">
                        {formatProjectStatus(selectedProject.status)}
                        {selectedProjectIsHistorical
                          ? " · historical reference"
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
                {selectedProject.sourceUrl && (
                  <a
                    href={selectedProject.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="plan-project-link"
                  >
                    View Details <Icon name="external" />
                  </a>
                )}
              </div>
              <div className="plan-project-kpis">
                <span className="plan-project-kpi">
                  <Icon name="home" />
                  <strong>
                    {selectedProjectVariant
                      ? currency(selectedProjectVariant.basePrice)
                      : "No price"}
                  </strong>
                  <span className="plan-project-kpi-sublabel">est.</span>
                  <span>{flatType}</span>
                </span>
                <span className="plan-project-kpi-divider" />
                <span className="plan-project-kpi">
                  <Icon name="calendar" />
                  <strong>{selectedProject.expectedTop ?? "—"}</strong>
                  <span>TOP</span>
                </span>
                <span className="plan-project-kpi-divider" />
                <span className="plan-project-kpi">
                  <Icon name="metro" />
                  <strong>
                    {selectedProject.nearestMrtDistanceMeters
                      ? `${(selectedProject.nearestMrtDistanceMeters / 1000).toFixed(1)} km`
                      : "—"}
                  </strong>
                  <span>{selectedProject.nearestMrt ?? "MRT"}</span>
                </span>
                <span className="plan-project-kpi-divider" />
                <span className="plan-project-kpi">
                  <Icon name="building" />
                  <strong>{selectedProject.totalUnits?.toLocaleString("en-SG") ?? "—"}</strong>
                  <span>Units</span>
                </span>
              </div>
            <p className="plan-project-footer">
              <Icon name="info" />
                {selectedProjectIsHistorical
                  ? "Historical price reference only. This plan uses today’s policy assumptions and a current application timeline; it does not imply the project is available to buy."
                  : selectedProject.flatVariants.length > 0
                  ? `Available: ${selectedProject.flatVariants.map((v) => v.type).join(", ")}`
                  : "Flat types not listed"}
              </p>
            </Card>
          )}

          <Card className="plan-section-card">
            <PlanStepHeader
              step={1}
              title="Assumptions"
              description="These inputs help us customise your plan and estimates."
            />
            <div className="assumption-grid primary-assumption-grid">
              <MoneyInput
                label="Gross Monthly Household Income"
                value={combinedIncome}
                min={INCOME_MIN}
                max={INCOME_MAX}
                onChange={onIncomeChange}
              />
              <SelectField
                label="Flat"
                value={flatType}
                onChange={(value) => onFlatTypeChange(value as FlatType)}
                options={FLAT_TYPE_OPTIONS}
                className="segmented-field-flat"
              />
              <SegmentedField
                label="Financing"
                value={financing}
                onChange={(value) => onFinancingChange(value as FinancingType)}
                options={FINANCING_OPTIONS}
                className="segmented-field-financing"
              />
              <SegmentedField
                label="Payment"
                value={scheme}
                onChange={(value) => onSchemeChange(value as SchemeType)}
                options={SCHEME_OPTIONS}
                className="segmented-field-payment"
              />
            </div>
            <details className="assumption-more">
              <summary>Complete financing and grant inputs</summary>
              <div className="assumption-grid assumption-grid-small">
                <OptionalMoneyInput
                  label="Cash available for this purchase"
                  value={availableCash}
                  max={FLAT_MAX * 2}
                  onChange={onAvailableCashChange}
                />
                <OptionalMoneyInput
                  label="CPF OA available for this purchase"
                  value={availableCpfOa}
                  max={FLAT_MAX * 2}
                  onChange={onAvailableCpfOaChange}
                />
                {financing !== "none" && (
                  <>
                    <OptionalNumberInput
                      label={
                        financing === "bank"
                          ? "Income-weighted borrower age"
                          : "Average applicant age"
                      }
                      value={ageForLoanRules}
                      min={18}
                      max={80}
                      suffix="years"
                      onChange={onAgeForLoanRulesChange}
                    />
                    <NumberInput
                      label="Requested loan tenure"
                      value={loanTenureYears}
                      min={LOAN_TENURE_MIN}
                      max={getLoanTenureMax(financing)}
                      suffix="years"
                      onChange={onLoanTenureChange}
                    />
                    <NumberInput
                      label="Repayment interest rate"
                      value={loanInterestRate}
                      min={LOAN_INTEREST_RATE_MIN}
                      max={LOAN_INTEREST_RATE_MAX}
                      step={0.05}
                      suffix="% p.a."
                      onChange={onLoanInterestRateChange}
                    />
                  </>
                )}
                {financing === "bank" && (
                  <>
                    <OptionalMoneyInput
                      label="All existing monthly debt payments"
                      value={monthlyDebtPayments}
                      max={INCOME_MAX * 2}
                      onChange={onMonthlyDebtPaymentsChange}
                    />
                    <OptionalMoneyInput
                      label="Of which: monthly property-loan payments"
                      value={monthlyPropertyLoanPayments}
                      max={INCOME_MAX * 2}
                      onChange={onMonthlyPropertyLoanPaymentsChange}
                    />
                    <OptionalNumberInput
                      label="Bank thereafter rate"
                      value={bankThereafterRate}
                      min={LOAN_INTEREST_RATE_MIN}
                      max={LOAN_INTEREST_RATE_MAX}
                      step={0.05}
                      suffix="% p.a."
                      onChange={onBankThereafterRateChange}
                    />
                    <SelectField
                      label="Outstanding housing loans"
                      value={
                        outstandingHousingLoans === null
                          ? ""
                          : String(outstandingHousingLoans)
                      }
                      onChange={(value) =>
                        onOutstandingHousingLoansChange(
                          value === "" ? null : (Number(value) as 0 | 1 | 2)
                        )
                      }
                      options={[
                        { value: "", label: "Not entered" },
                        { value: "0", label: "None" },
                        { value: "1", label: "One" },
                        { value: "2", label: "Two or more" },
                      ]}
                    />
                  </>
                )}
                <SelectField
                  label="EHG treatment"
                  value={ehgMode}
                  onChange={(value) => onEhgModeChange(value as EhgMode)}
                  options={EHG_OPTIONS}
                />
                {ehgMode === "confirmed" && (
                  <OptionalMoneyInput
                    label="EHG amount in HFE letter"
                    value={ehgConfirmedAmount}
                    max={120000}
                    onChange={onEhgConfirmedAmountChange}
                  />
                )}
                {ehgMode === "family-estimate" && (
                  <>
                    <OptionalMoneyInput
                      label="HFE-assessed 12-month average income"
                      value={ehgAssessedIncome}
                      max={INCOME_MAX}
                      onChange={onEhgAssessedIncomeChange}
                    />
                    <label className="input-field">
                      <span>Family estimate eligibility</span>
                      <span className="policy-confirmation">
                        <input
                          type="checkbox"
                          checked={ehgFamilyEligibilityConfirmed}
                          onChange={(event) =>
                            onEhgFamilyEligibilityConfirmedChange(
                              event.target.checked
                            )
                          }
                        />
                        I confirm the first-timer family, 12-month employment,
                        current employment, property and lease conditions
                      </span>
                    </label>
                  </>
                )}
                <label className="input-field">
                  <span>Application month</span>
                  <input
                    type="month"
                    min={MIN_SUPPORTED_APPLICATION_MONTH}
                    max={MAX_SUPPORTED_APPLICATION_MONTH}
                    value={applicationMonth}
                    onChange={(event) =>
                      onApplicationMonthChange(event.target.value)
                    }
                  />
                </label>
                <MetricRow
                  icon="building"
                  label="Project"
                  value={selectedProject?.name ?? "No project selected"}
                  detail={selectedProject?.location}
                />
              </div>
            </details>
            <p className="policy-note">
              {downpaymentNote} Staggered and DIA eligibility is not assessed by
              this planner. CPF use is limited to the amount you enter and remains
              subject to CPF/HDB rules.
            </p>
            <p className="policy-note">
              <strong>EHG:</strong> {ehgAssessment.note}
            </p>
            {ehgGrant !== null &&
              financingEstimate.usableGrantAmount !== null &&
              financingEstimate.usableGrantAmount < ehgGrant && (
                <p className="policy-note inline-help-warn">
                  This target can use up to {currency(
                    financingEstimate.usableGrantAmount
                  )} of the entered EHG; at least 5% must come from your own CPF
                  OA or cash when the grant exceeds 95% of the flat price.
                </p>
              )}
            {financingEstimate.missingInputs.length > 0 && (
              <p className="policy-note inline-help-warn">
                Complete: {financingEstimate.missingInputs.join(", ")}.
              </p>
            )}
            {financingEstimate.warnings.map((warning) => (
              <p key={warning} className="policy-note">
                {warning}
              </p>
            ))}
          </Card>

          <Card className="plan-section-card">
            <PlanStepHeader
              step={2}
              title="Target Flat Price"
              description="Set your own target price. BTO prices shown elsewhere are estimates based on past launches."
            />
            <div className="target-price-grid">
              <div>
                <MoneyInput
                  label="Target Flat Price (your estimate)"
                  value={flatPrice}
                  min={FLAT_MIN}
                  max={FLAT_MAX}
                  onChange={onFlatPriceChange}
                />
                <p
                  className={`inline-help ${
                    targetPriceNeedsWarning ? "inline-help-warn" : ""
                  }`}
                >
                  <Icon
                    name={
                      selectedProjectVariant &&
                      totalAffordability !== null &&
                      flatPrice <= totalAffordability
                        ? "check"
                        : "info"
                    }
                  />
                  {selectedProject && !selectedProjectVariant
                    ? `No ${flatType} RecordBTO price is available for this project; the target remains your manual estimate`
                    : totalAffordability === null
                    ? "Complete the financing and funding inputs to assess this target"
                    : flatPrice <= totalAffordability
                      ? "Target price is within the estimated purchase budget"
                      : "Target price exceeds the estimated purchase budget"}
                </p>
              </div>
              <div className="affordability-callout">
                <div>
                  <p>
                    Estimated purchase budget from the entered funds and loan rules
                    <span
                      className="bto-breakdown-info"
                      onMouseEnter={() => setShowAffordTip(true)}
                      onMouseLeave={() => setShowAffordTip(false)}
                      onFocus={() => setShowAffordTip(true)}
                      onBlur={() => setShowAffordTip(false)}
                      aria-describedby={affordTipId}
                      tabIndex={0}
                    >
                      <Icon name="info" />
                      {showAffordTip && (
                        <span id={affordTipId} className="bto-tooltip" role="tooltip">
                          This estimate applies the relevant LTV, MSR/TDSR, rate and tenure rules to the entered income, debt, cash, CPF and EHG. HFE or bank IPA remains authoritative.
                        </span>
                      )}
                    </span>
                  </p>
                  <strong>
                    {totalAffordability === null
                      ? "Not assessed"
                      : currency(totalAffordability)}
                  </strong>
                  <span className="affordability-note">
                    Planning loan cap: {formatOptionalCurrency(loanAmount)} · EHG: {formatOptionalCurrency(ehgGrant)}
                  </span>
                  {selectedProject &&
                    totalAffordability !== null &&
                    (selectedProject.flatVariants.find(
                      (variant) => variant.type === flatType
                    )?.basePrice ?? 0) > totalAffordability && (
                    <span className="affordability-warning">
                      <Icon name="alert" />
                      Selected project exceeds this estimate
                    </span>
                  )}
                </div>
                <div className="affordability-illustration" aria-hidden="true">
                  <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Left building */}
                    <rect x="12" y="48" width="42" height="62" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    <rect x="18" y="56" width="10" height="10" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="34" y="56" width="10" height="10" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="18" y="72" width="10" height="10" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="34" y="72" width="10" height="10" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    {/* Main house */}
                    <rect x="58" y="28" width="80" height="82" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    {/* Roof */}
                    <path d="M55 28 L98 4 L141 28 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" strokeLinejoin="round" />
                    {/* Top windows */}
                    <rect x="68" y="38" width="14" height="14" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="92" y="38" width="14" height="14" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="116" y="38" width="14" height="14" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    {/* Bottom left window */}
                    <rect x="68" y="62" width="14" height="14" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    {/* Door/Garage */}
                    <rect x="90" y="58" width="28" height="52" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="104" y1="58" x2="104" y2="110" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="90" y1="72" x2="118" y2="72" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="90" y1="86" x2="118" y2="86" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="90" y1="100" x2="118" y2="100" stroke="#cbd5e1" strokeWidth="1" />
                    {/* Bushes */}
                    <circle cx="20" cy="112" r="8" fill="#bbf7d0" />
                    <circle cx="40" cy="115" r="10" fill="#86efac" />
                    <circle cx="70" cy="113" r="7" fill="#bbf7d0" />
                    <circle cx="135" cy="114" r="9" fill="#bbf7d0" />
                  </svg>
                </div>
              </div>
            </div>
          </Card>

          <Card className="plan-section-card">
            <PlanStepHeader
              step={3}
              title="Milestones & Payments"
              description="Review the key milestones, estimated amounts and select your expected dates."
            />
            <div className="milestone-table-wrap">
              <table className="milestone-table">
                <thead>
                  <tr>
                    <th>Milestone</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Your Expected Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveTimeline.map((item, index) => {
                    const earlierDates = effectiveTimeline
                      .slice(0, index)
                      .map((candidate) =>
                        confirmedMilestoneDates[candidate.id] ??
                        timelineDateToInput(candidate.date)
                      )
                      .filter((date): date is string => Boolean(date));
                    const laterDates = effectiveTimeline
                      .slice(index + 1)
                      .map((candidate) =>
                        confirmedMilestoneDates[candidate.id] ??
                        timelineDateToInput(candidate.date)
                      )
                      .filter((date): date is string => Boolean(date));
                    const minimumDate = [
                      `${applicationMonth}-01`,
                      ...earlierDates,
                    ].sort().at(-1);
                    const maximumDate = laterDates.sort()[0];

                    return (
                      <MilestoneRow
                        key={item.id}
                        item={item}
                        index={index}
                        confirmedDate={confirmedMilestoneDates[item.id]}
                        minimumDate={minimumDate}
                        maximumDate={maximumDate}
                        isComplete={completedMilestones.includes(item.id)}
                        onToggleComplete={onToggleMilestoneComplete}
                        onMilestoneDateChange={onMilestoneDateChange}
                        onTogglePaymentFunding={handleTogglePaymentFunding}
                        onPaymentTotalChange={handlePaymentTotalChange}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="milestone-footer">
              <span>
                Dates are estimates only. “Unallocated” means the entered CPF,
                cash and EHG do not yet cover that buyer payment. Changing a
                financial assumption clears entered payment edits so they cannot
                mask a recalculated balance. Funding switches stay within the
                CPF and cash balances entered above.
              </span>
            </div>
          </Card>
        </div>

        <aside className="plan-side">
          <Card className="summary-card">
            <div className="summary-head">
              <h2>Plan Summary</h2>
              <Pill
                tone={
                  isWithinAffordability && !isConditionalAssessment
                    ? "green"
                    : "amber"
                }
              >
                {!isAssessmentComplete
                  ? "Complete inputs"
                  : isConditionalAssessment
                    ? "Conditional estimate"
                  : reconciliationDifference >= 0.5
                    ? "Reconcile payment edits"
                  : isWithinAffordability
                    ? "Modelled funding covered"
                    : `${formatOptionalCurrency(
                        financingEstimate.fundingGap
                      )} gap`}
              </Pill>
            </div>
            <div className="summary-price">
              <span>Target Flat Price</span>
              <strong>{currency(flatPrice)}</strong>
            </div>
            <SummaryLine label="Flat purchase price" value={currency(flatPrice)} />
            <SummaryLine
              label="Planning loan cap"
              value={formatOptionalCurrency(loanAmount)}
              tooltip="Estimated from the entered income and regulatory limits. Your HFE letter or bank IPA is authoritative."
            />
            <SummaryLine
              label="Estimated Monthly Payment"
              value={formatOptionalCurrency(
                financingEstimate.estimatedMonthlyPayment
              )}
              tooltip="Calculated on the loan needed for this target, capped at the planning loan limit, using the repayment rate and effective tenure."
            />
            {financing !== "none" && (
              <>
                <SummaryLine
                  label="Qualification rate"
                  value={
                    financingEstimate.assessmentRatePercent === null
                      ? "Not assessed"
                      : `${financingEstimate.assessmentRatePercent.toFixed(2)}% p.a.`
                  }
                />
                <SummaryLine
                  label="Effective tenure"
                  value={
                    financingEstimate.effectiveTenureYears === null
                      ? "Not assessed"
                      : `${financingEstimate.effectiveTenureYears} years`
                  }
                />
              </>
            )}
            {financingEstimate.fundingGap !== null &&
              financingEstimate.fundingGap > 0 && (
                <SummaryLine
                  label="Funding gap"
                  value={currency(financingEstimate.fundingGap)}
                />
              )}
            {financingEstimate.minimumCashShortfall !== null &&
              financingEstimate.minimumCashShortfall > 0 && (
                <SummaryLine
                  label="Cash requirement shortfall"
                  value={currency(financingEstimate.minimumCashShortfall)}
                />
              )}
            {financingEstimate.grantOwnFundsShortfall !== null &&
              financingEstimate.grantOwnFundsShortfall > 0 && (
                <SummaryLine
                  label="Own CPF/cash needed for grant rule"
                  value={currency(
                    financingEstimate.grantOwnFundsShortfall
                  )}
                />
              )}
            {reconciliationDifference >= 0.5 && (
              <SummaryLine
                label="Payment edits differ from model"
                value={currency(reconciliationDifference)}
              />
            )}
            <p className="policy-note">
              The assessment includes the listed application, option, BSD,
              survey and applicable HDB registration, fire-insurance and deed
              stamp-duty estimates.
              It excludes legal/conveyancing fees, ABSD, any second-timer resale
              levy, bank-specific charges, Home Protection Scheme premiums and
              optional renovation costs.
            </p>
            <FundingBreakdown
              loan={loanForTarget}
              loanShare={loanShare}
              loanLabel={loanLabel}
              cpf={cpfTotal}
              cpfShare={cpfShare}
              cash={cashTotal}
              cashShare={cashShare}
              ehgGrant={grantUsed}
              grantShare={grantShare}
              unallocated={unallocatedForBreakdown}
              unallocatedShare={unallocatedShare}
            />
          </Card>

          <Card title="Key Dates" icon="calendar">
            <div className="key-date-list">
              {effectiveTimeline
                .filter(
                  (item) =>
                    item.id !== "agreement-fees" && item.id !== "key-fees"
                )
                .slice(0, 4)
                .map((item) => (
                <div key={item.id}>
                  <span>
                    <Icon name="calendar" />
                    {item.label}
                  </span>
                  <strong>
                    {confirmedMilestoneDates[item.id]
                      ? formatDateInputDisplay(confirmedMilestoneDates[item.id])
                      : item.date}
                  </strong>
                </div>
                ))}
            </div>
          </Card>


        </aside>
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
  const [draft, setDraft] = useState<{
    baseValue: number;
    text: string;
  } | null>(null);
  const text = draft?.baseValue === value ? draft.text : String(value);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || /^\d+$/.test(raw)) {
      setDraft({ baseValue: value, text: raw });
    }
  };

  const handleBlur = () => {
    const parsed = text === "" ? min : Number(text);
    const nextValue = Number.isNaN(parsed)
      ? min
      : Math.min(max, Math.max(min, parsed));

    setDraft(null);
    onChange(nextValue);
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
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function OptionalMoneyInput({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number | null;
  max: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="input-field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        placeholder="Not entered"
        value={value ?? ""}
        onChange={(event) => {
          if (event.target.value === "") {
            onChange(null);
            return;
          }

          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) {
            onChange(Math.min(max, Math.max(0, parsed)));
          }
        }}
      />
    </label>
  );
}

function OptionalNumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number | null) => void;
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
          placeholder="Not entered"
          value={value ?? ""}
          onChange={(event) => {
            if (event.target.value === "") {
              onChange(null);
              return;
            }

            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) {
              onChange(Math.min(max, Math.max(min, parsed)));
            }
          }}
        />
        <em>{suffix}</em>
      </div>
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

function PlanStepHeader({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="plan-step-header">
      <span>{step}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function MilestoneRow({
  item,
  index,
  confirmedDate,
  minimumDate,
  maximumDate,
  isComplete,
  onToggleComplete,
  onMilestoneDateChange,
  onTogglePaymentFunding,
  onPaymentTotalChange,
}: {
  item: TimelineItem;
  index: number;
  confirmedDate: string | undefined;
  minimumDate: string | undefined;
  maximumDate: string | undefined;
  isComplete: boolean;
  onToggleComplete: (label: string) => void;
  onMilestoneDateChange: (label: string, value: string) => void;
  onTogglePaymentFunding: (label: string, type: "cpf" | "cash") => void;
  onPaymentTotalChange: (label: string, value: number) => void;
}) {
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountText, setAmountText] = useState("");
  const isFundingSwitchable = Boolean(
    item.payment &&
      item.payment.total >= 10000 &&
      !item.payment.fundingLocked &&
      (item.payment.grant ?? 0) === 0 &&
      (item.payment.unallocated ?? 0) === 0
  );
  const cashCanToggle = Boolean(
    isFundingSwitchable &&
      item.payment &&
      item.payment.cash > (item.payment.minimumCash ?? 0)
  );
  const isPaymentEditable = Boolean(
    item.payment &&
      (item.payment.grant ?? 0) === 0 &&
      (item.payment.unallocated ?? 0) === 0
  );

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
            {editingAmount && isPaymentEditable ? (
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={amountText}
                aria-label={`Actual amount for ${item.label}`}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^\d+$/.test(raw)) {
                    setAmountText(raw);
                  }
                }}
                onBlur={() => {
                  const num = Number(amountText);
                  if (
                    Number.isFinite(num) &&
                    num > 0 &&
                    num <= FLAT_MAX * 2
                  ) {
                    onPaymentTotalChange(item.id, num);
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
            ) : isPaymentEditable ? (
              <button
                type="button"
                className="milestone-amount-editable"
                onClick={() => {
                  setAmountText(String(item.payment!.total));
                  setEditingAmount(true);
                }}
                aria-label={`Edit actual amount for ${item.label}`}
                title="Edit actual amount"
              >
                {currency(item.payment.total)}
              </button>
            ) : (
              <strong>{currency(item.payment.total)}</strong>
            )}
            <div className="milestone-payment-tags">
              {item.payment.cpfOa > 0 && (isFundingSwitchable ? (
                <button
                  type="button"
                  className="milestone-tag milestone-tag-cpf milestone-tag-interactive"
                  onClick={() => onTogglePaymentFunding(item.id, "cpf")}
                  aria-label={`Move CPF amount to Cash for ${item.label}`}
                  title="Move to Cash"
                >
                  CPF {currency(item.payment.cpfOa)}
                </button>
              ) : (
                <span className="milestone-tag milestone-tag-cpf">
                  CPF {currency(item.payment.cpfOa)}
                </span>
              ))}
              {item.payment.cash > 0 && (cashCanToggle ? (
                <button
                  type="button"
                  className="milestone-tag milestone-tag-cash milestone-tag-interactive"
                  onClick={() => onTogglePaymentFunding(item.id, "cash")}
                  aria-label={`Move Cash amount to CPF for ${item.label}`}
                  title="Move to CPF"
                >
                  Cash {currency(item.payment.cash)}
                </button>
              ) : (
                <span className="milestone-tag milestone-tag-cash">
                  Cash {currency(item.payment.cash)}
                </span>
              ))}
              {(item.payment.grant ?? 0) > 0 && (
                <span className="milestone-tag milestone-tag-cpf">
                  EHG {currency(item.payment.grant ?? 0)}
                </span>
              )}
              {(item.payment.unallocated ?? 0) > 0 && (
                <span className="milestone-tag milestone-tag-cash">
                  Unallocated {currency(item.payment.unallocated ?? 0)}
                </span>
              )}
              {(item.payment.minimumCashShortfall ?? 0) > 0 && (
                <span className="milestone-tag milestone-tag-cash">
                  Required cash shortfall {currency(
                    item.payment.minimumCashShortfall ?? 0
                  )}
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
          min={minimumDate}
          max={maximumDate}
          value={confirmedDate ?? ""}
          onChange={(event) => {
            if (event.target.validity.valid) {
              onMilestoneDateChange(item.id, event.target.value);
            }
          }}
          aria-label={`Expected date for ${item.label}`}
        />
      </td>
      <td>
        <button
          type="button"
          className={`milestone-status ${isComplete ? "milestone-status-done" : ""}`}
          onClick={() => onToggleComplete(item.id)}
          aria-pressed={isComplete}
        >
          <span className="milestone-status-box">
            {isComplete ? <Icon name="check" /> : <span className="milestone-status-empty" />}
          </span>
          {isComplete ? "Done" : "Confirm"}
        </button>
      </td>
    </tr>
  );
}

function timelineDateToInput(value: string) {
  const date = parseMonthYearDate(value);
  if (!date) return undefined;

  return `${String(date.getFullYear()).padStart(4, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

function FundingBreakdown({
  loan,
  loanShare,
  loanLabel,
  cpf,
  cpfShare,
  cash,
  cashShare,
  ehgGrant,
  grantShare,
  unallocated,
  unallocatedShare,
}: {
  loan: number | null;
  loanShare: number;
  loanLabel: string;
  cpf: number;
  cpfShare: number;
  cash: number;
  cashShare: number;
  ehgGrant: number;
  grantShare: number;
  unallocated: number;
  unallocatedShare: number;
}) {
  return (
    <div className="funding-box">
      <h3>Estimated Funding Breakdown</h3>
      <div className="funding-content">
        <div
          className="donut"
          style={{
            ["--loan" as string]: `${loanShare * 3.6}deg`,
            ["--cpf" as string]: `${(loanShare + cpfShare) * 3.6}deg`,
            ["--cash" as string]: `${(loanShare + cpfShare + cashShare) * 3.6}deg`,
            ["--grant" as string]: `${
              (loanShare + cpfShare + cashShare + grantShare) * 3.6
            }deg`,
          }}
          aria-hidden="true"
        />
        <div className="funding-lines">
          <FundingLegendItem
            label={`${loanLabel} (${loanShare}%)`}
            value={formatOptionalCurrency(loan)}
            color="oklch(var(--color-futuristic-teal))"
          />
          <FundingLegendItem label={`CPF Usage (${cpfShare}%)`} value={currency(cpf)} color="oklch(70% 0.13 178)" />
          <FundingLegendItem label={`Cash (${cashShare}%)`} value={currency(cash)} color="oklch(68% 0.11 292)" />
          <FundingLegendItem label={`EHG Grant (${grantShare}%)`} value={currency(ehgGrant)} color="oklch(75% 0.12 95)" />
          {unallocated > 0 && (
            <FundingLegendItem
              label={`Unallocated (${unallocatedShare}%)`}
              value={currency(unallocated)}
              color="oklch(72% 0.02 250)"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  const [showTip, setShowTip] = useState(false);
  const tipId = useId();
  return (
    <div className="summary-line">
      <span>
        {label}
        {tooltip && (
          <span
            className="bto-breakdown-info"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            onFocus={() => setShowTip(true)}
            onBlur={() => setShowTip(false)}
            aria-describedby={tipId}
            tabIndex={0}
          >
            <Icon name="info" />
            {showTip && (
              <span id={tipId} className="bto-tooltip" role="tooltip">
                {tooltip}
              </span>
            )}
          </span>
        )}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function FundingLegendItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="funding-legend-item">
      <div className="funding-legend-row">
        <span className="funding-legend-dot" style={{ backgroundColor: color }} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function sumPayments(
  payments: TimelinePayment[],
  key: "cpfOa" | "cash" | "grant" | "unallocated"
) {
  return payments.reduce((sum, payment) => sum + (payment[key] ?? 0), 0);
}

function getFundingShares(values: number[], total: number) {
  const lastPositiveIndex = values.reduce(
    (last, value, index) => (value > 0 ? index : last),
    -1
  );
  let assigned = 0;

  return values.map((value, index) => {
    if (value <= 0) return 0;
    if (index === lastPositiveIndex) return Math.max(100 - assigned, 0);

    const share = Math.min(
      100 - assigned,
      Math.max(0, Math.round((value / total) * 100))
    );
    assigned += share;
    return share;
  });
}

function formatOptionalCurrency(value: number | null) {
  return value === null ? "Not assessed" : currency(value);
}

function formatProjectStatus(status: string) {
  return status
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getLoanTenureMax(financing: FinancingType) {
  if (financing === "bank") return BANK_LOAN_TENURE_MAX;
  if (financing === "none") return BANK_LOAN_TENURE_MAX;
  return HDB_LOAN_TENURE_MAX;
}
