import { useMemo, useState } from "react";
import { BtoTab } from "./components/BtoTab";
import { BudgetTab } from "./components/BudgetTab";
import { Navigation } from "./components/Navigation";
import { OverviewTab } from "./components/OverviewTab";
import { PurchasePlanTab } from "./components/PurchasePlanTab";
import { SourcesTab } from "./components/SourcesTab";
import {
  FLAT_MAX,
  FLAT_MIN,
  BANK_LOAN_TENURE_MAX,
  DEFAULT_LOAN_INTEREST_RATE,
  DEFAULT_LOAN_TENURE_YEARS,
  HDB_LOAN_TENURE_MAX,
  INCOME_MAX,
  INCOME_MIN,
  LOAN_INTEREST_RATE_MAX,
  LOAN_INTEREST_RATE_MIN,
  LOAN_MULTIPLIER,
  LOAN_TENURE_MIN,
} from "./constants";
import { useBtoProjects } from "./hooks/useBtoProjects";
import { POLICY_CONFIG } from "./policies/policyConfig";
import type {
  FinancingType,
  BtoScoreMode,
  BtoScorePreset,
  FlatType,
  SchemeType,
  TabKey,
} from "./types";
import {
  filterBtoProjects,
  getActiveYear,
  getAvailableYears,
} from "./utils/bto";
import {
  calculateFinancingEstimate,
  type FinancingEstimateInput,
} from "./utils/affordability";
import {
  loadBudgetInputs,
  saveBudgetInputs,
  type BudgetInputs,
} from "./utils/budgetStorage";
import { calculateEhgAssessment } from "./utils/ehg";
import {
  BTO_SCORE_PRESET_DETAILS,
  type BtoScoreWeights,
} from "./utils/btoScoring";
import { parseLaunchMonthInput } from "./utils/date";
import { clampNumber } from "./utils/format";
import { buildPaymentTimeline } from "./utils/paymentTimeline";
import {
  createPlannerSnapshot,
  loadPlannerSnapshot,
  savePlannerSnapshot,
} from "./utils/planStorage";

const APPLICATION_FEE = 10;

function App() {
  const [initialPlanResult] = useState(() => {
    try {
      return {
        snapshot: loadPlannerSnapshot(),
        error: null,
      };
    } catch (error) {
      return {
        snapshot: null,
        error: getErrorMessage(error),
      };
    }
  });
  const initialPlan = initialPlanResult.snapshot;

  const [activeTab, setActiveTabState] = useState<TabKey>(() =>
    getInitialTab(Boolean(initialPlan?.selectedBtoProjectId))
  );
  const [budget, setBudget] = useState<BudgetInputs>(loadBudgetInputs);
  const [combinedIncome, setCombinedIncome] = useState(
    initialPlan?.combinedIncome ?? 6000
  );
  const [flatPrice, setFlatPrice] = useState(initialPlan?.flatPrice ?? 650000);
  const [flatType, setFlatType] = useState<FlatType>(
    initialPlan?.flatType ?? "4-room"
  );
  const [financing, setFinancing] = useState<FinancingType>(
    initialPlan?.financing ?? "hdb"
  );
  const [scheme, setScheme] = useState<SchemeType>(
    initialPlan?.scheme ?? "normal"
  );
  const [loanTenureYears, setLoanTenureYears] = useState(
    initialPlan?.loanTenureYears ?? DEFAULT_LOAN_TENURE_YEARS
  );
  const [loanInterestRate, setLoanInterestRate] = useState(
    initialPlan?.loanInterestRate ?? DEFAULT_LOAN_INTEREST_RATE
  );
  const [yearFilter, setYearFilter] = useState(
    initialPlan?.yearFilter ?? "latest"
  );
  const [townQuery, setTownQuery] = useState(initialPlan?.townQuery ?? "");
  const btoScoreMode: BtoScoreMode = "buyer-fit";
  const [btoScorePreset, setBtoScorePreset] = useState<BtoScorePreset>(
    initialPlan?.btoScorePreset ?? "balanced"
  );
  const [btoScoreWeights, setBtoScoreWeights] = useState<BtoScoreWeights>(
    initialPlan?.btoScoreWeights ??
      BTO_SCORE_PRESET_DETAILS[initialPlan?.btoScorePreset ?? "balanced"].weights
  );
  const [selectedBtoProjectId, setSelectedBtoProjectId] = useState<string | null>(
    initialPlan?.selectedBtoProjectId ?? null
  );
  const [planStorageStatus, setPlanStorageStatus] = useState(
    initialPlanResult.error
      ? "Saved plan could not be loaded"
      : initialPlan
        ? `Loaded saved plan from ${formatSavedAt(initialPlan.savedAt)}`
        : "No saved plan in this browser"
  );
  const [planStorageError, setPlanStorageError] = useState<string | null>(
    initialPlanResult.error
  );
  const [applicationMonth, setApplicationMonth] = useState(
    initialPlan?.applicationMonth ?? getDefaultApplicationMonth()
  );
  const [completedMilestones, setCompletedMilestones] = useState<string[]>(
    initialPlan?.completedMilestones ?? []
  );
  const [confirmedMilestoneDates, setConfirmedMilestoneDates] = useState<
    Record<string, string>
  >(initialPlan?.confirmedMilestoneDates ?? {});

  const {
    projects: btoProjects,
    isLoading: btoLoading,
    error: btoError,
    retry: retryBto,
  } = useBtoProjects();

  const ehgAssessment = useMemo(
    () =>
      calculateEhgAssessment({
        mode: budget.firstTimer ? "family-estimate" : "none",
        assessedAverageMonthlyIncome: combinedIncome,
        confirmedAmount: null,
        familyEligibilityConfirmed: true,
      }),
    [budget.firstTimer, combinedIncome]
  );
  const ehgGrant = ehgAssessment.amount ?? 0;

  const downpaymentRule = POLICY_CONFIG.downpaymentRules[financing][scheme];
  const downpaymentTotal = downpaymentRule.signing + downpaymentRule.key;
  const signingAmount = flatPrice * downpaymentRule.signing;
  const keyAmount = flatPrice * downpaymentRule.key;
  const minCashSigning = flatPrice * downpaymentRule.minCashSigning;
  const signingCpf = Math.max(signingAmount - minCashSigning, 0);
  const keyCpf = keyAmount;
  const optionFee = POLICY_CONFIG.fees.optionFeeByFlatType[flatType];
  const surveyFee = POLICY_CONFIG.fees.surveyFeeByFlatType[flatType];
  const fireInsurance = POLICY_CONFIG.fees.fireInsuranceByFlatType[flatType];

  // The price ceiling comes from the financing estimate once age and savings are known.
  // Until then the old income-only rule stands in, and BTO Radar says so.
  const budgetInput = useMemo<FinancingEstimateInput>(
    () => ({
      financing,
      purchasePrice: flatPrice,
      grossMonthlyIncome: combinedIncome,
      availableCash: budget.cash,
      availableCpfOa: budget.cpfOa,
      grantAmount: ehgGrant,
      monthlyDebtPayments: 0,
      monthlyPropertyLoanPayments: 0,
      bankThereafterRatePercent: loanInterestRate,
      cashOnlyPurchaseAmount: optionFee,
      fixedAdditionalCosts: APPLICATION_FEE + surveyFee + fireInsurance,
      cashOnlyCosts: APPLICATION_FEE,
      ageForLoanRules: budget.age,
      outstandingHousingLoans: 0,
      requestedTenureYears: loanTenureYears,
      repaymentRatePercent: loanInterestRate,
    }),
    [
      budget.age,
      budget.cash,
      budget.cpfOa,
      combinedIncome,
      ehgGrant,
      financing,
      fireInsurance,
      flatPrice,
      loanInterestRate,
      loanTenureYears,
      optionFee,
      surveyFee,
    ]
  );
  const targetEstimate = useMemo(() => calculateFinancingEstimate(budgetInput), [budgetInput]);
  const budgetMaxPrice = targetEstimate.maxPurchasePrice;
  const budgetAtMax = useMemo(
    () =>
      budgetMaxPrice === null
        ? null
        : calculateFinancingEstimate({ ...budgetInput, purchasePrice: budgetMaxPrice }),
    [budgetInput, budgetMaxPrice]
  );
  const budgetKnown = budgetMaxPrice !== null && budgetAtMax !== null;
  const loanAmount = budgetKnown
    ? Math.round(budgetAtMax.loanForTarget ?? 0)
    : combinedIncome * LOAN_MULTIPLIER;
  const totalAffordability = budgetKnown
    ? Math.round(budgetMaxPrice)
    : Math.round((loanAmount + ehgGrant) / (1 - downpaymentTotal));
  const selectedBtoProject = useMemo(
    () =>
      selectedBtoProjectId
        ? btoProjects.find((project) => project.id === selectedBtoProjectId) ?? null
        : null,
    [btoProjects, selectedBtoProjectId]
  );

  const timeline = useMemo(
    () =>
      buildPaymentTimeline({
        applicationMonth,
        expectedTop: selectedBtoProject?.expectedTop,
        flatType,
        signingAmount,
        signingCpf,
        minCashSigning,
        keyAmount,
        keyCpf,
        optionFee,
        surveyFee,
        fireInsurance,
      }),
    [
      applicationMonth,
      fireInsurance,
      flatType,
      keyAmount,
      keyCpf,
      minCashSigning,
      optionFee,
      selectedBtoProject?.expectedTop,
      signingAmount,
      signingCpf,
      surveyFee,
    ]
  );
  const activeCompletedMilestones = useMemo(() => {
    const timelineLabels = new Set(timeline.map((item) => item.label));
    return completedMilestones.filter((label) => timelineLabels.has(label));
  }, [completedMilestones, timeline]);
  const activeConfirmedMilestoneDates = useMemo(() => {
    const timelineLabels = new Set(timeline.map((item) => item.label));

    return Object.fromEntries(
      Object.entries(confirmedMilestoneDates).filter(([label]) =>
        timelineLabels.has(label)
      )
    );
  }, [confirmedMilestoneDates, timeline]);

  const availableYears = useMemo(
    () => getAvailableYears(btoProjects),
    [btoProjects]
  );
  const activeYear = useMemo(
    () => getActiveYear(yearFilter, availableYears),
    [availableYears, yearFilter]
  );
  const filteredProjects = useMemo(
    () => filterBtoProjects(btoProjects, activeYear, townQuery, flatType),
    [activeYear, btoProjects, flatType, townQuery]
  );
  const setActiveTab = (tab: TabKey) => {
    setActiveTabState(tab);

    const url = new URL(window.location.href);
    if (tab === "budget") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const handleYearFilterChange = (value: string) => {
    setYearFilter(value);
  };

  const handleTownQueryChange = (value: string) => {
    setTownQuery(value);
  };

  const handleResetBtoFilters = () => {
    setYearFilter("latest");
    setTownQuery("");
  };

  const handleBtoScorePresetChange = (value: BtoScorePreset) => {
    setBtoScorePreset(value);
    setBtoScoreWeights(BTO_SCORE_PRESET_DETAILS[value].weights);
  };

  const handleRetryBto = () => {
    retryBto();
    setActiveTab("bto");
  };

  const handleBudgetChange = (patch: Partial<BudgetInputs>) => {
    setBudget((current) => {
      const next = { ...current, ...patch };
      saveBudgetInputs(next);
      return next;
    });
  };

  const handleIncomeChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setCombinedIncome(clampNumber(value, INCOME_MIN, INCOME_MAX));
  };

  const handleFlatPriceChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setFlatPrice(clampNumber(value, FLAT_MIN, FLAT_MAX));
  };

  const handleFinancingChange = (value: FinancingType) => {
    setFinancing(value);
    setLoanTenureYears((current) =>
      clampNumber(current, LOAN_TENURE_MIN, getLoanTenureMax(value))
    );
  };

  const handleLoanTenureChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setLoanTenureYears(
      clampNumber(value, LOAN_TENURE_MIN, getLoanTenureMax(financing))
    );
  };

  const handleLoanInterestRateChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setLoanInterestRate(
      clampNumber(value, LOAN_INTEREST_RATE_MIN, LOAN_INTEREST_RATE_MAX)
    );
  };

  const handleToggleMilestoneComplete = (label: string) => {
    setCompletedMilestones((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  };

  const handleMilestoneDateChange = (label: string, value: string) => {
    setConfirmedMilestoneDates((current) => {
      const next = { ...current };

      if (value) {
        next[label] = value;
      } else {
        delete next[label];
      }

      return next;
    });
  };

  const buildCurrentSnapshot = () =>
    createPlannerSnapshot({
      combinedIncome,
      flatPrice,
      flatType,
      financing,
      scheme,
      loanTenureYears,
      loanInterestRate,
      yearFilter,
      townQuery,
      btoScoreMode,
      btoScorePreset,
      btoScoreWeights,
      selectedBtoProjectId,
      applicationMonth,
      completedMilestones: activeCompletedMilestones,
      confirmedMilestoneDates: activeConfirmedMilestoneDates,
    });

  const handleSavePlan = () => {
    try {
      const snapshot = buildCurrentSnapshot();
      savePlannerSnapshot(snapshot);
      setPlanStorageStatus(`Saved locally at ${formatSavedAt(snapshot.savedAt)}`);
      setPlanStorageError(null);
    } catch (error) {
      setPlanStorageStatus("Plan was not saved");
      setPlanStorageError(getErrorMessage(error));
    }
  };

  const handleSelectBtoProject = (projectId: string) => {
    const project = btoProjects.find((candidate) => candidate.id === projectId);
    if (!project) return;

    const preferredVariant =
      project.flatVariants.find((variant) => variant.type === flatType) ??
      project.flatVariants[0];

    setSelectedBtoProjectId(project.id);
    setCompletedMilestones([]);
    setConfirmedMilestoneDates({});

    if (preferredVariant) {
      setFlatType(preferredVariant.type);
      setFlatPrice(clampNumber(preferredVariant.basePrice, FLAT_MIN, FLAT_MAX));
    }

    const launchMonth = parseLaunchMonthInput(project.launchMonth);
    if (launchMonth) setApplicationMonth(launchMonth);

    setActiveTab("plan");
  };

  return (
    <div className="app-shell min-h-screen bg-hdb-bg text-heritage-navy">
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <main className="min-w-0 overflow-x-hidden px-5 pb-28 pt-24 md:px-8 lg:pb-14 lg:ml-[280px] lg:px-8 lg:pt-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1720px] space-y-8">
        {activeTab === "budget" && (
          <BudgetTab
            combinedIncome={combinedIncome}
            budget={budget}
            financing={financing}
            loanTenureYears={loanTenureYears}
            estimateAtMax={budgetAtMax}
            maxPrice={budgetMaxPrice}
            ehg={ehgAssessment}
            onIncomeChange={handleIncomeChange}
            onBudgetChange={handleBudgetChange}
            onSeeProjects={() => setActiveTab("bto")}
            onOpenPlan={() => setActiveTab("plan")}
          />
        )}

        {activeTab === "overview" && (
          <OverviewTab
            budgetKnown={budgetKnown}
            budgetCeiling={totalAffordability}
            selectedProject={selectedBtoProject}
            flatPrice={flatPrice}
            fundingGap={budgetKnown ? targetEstimate.fundingGap : null}
            timeline={timeline}
            completedMilestones={activeCompletedMilestones}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === "plan" && (
          <PurchasePlanTab
            selectedProject={selectedBtoProject}
            ehgGrant={ehgGrant}
            targetEstimate={targetEstimate}
            budgetKnown={budgetKnown}
            budget={budget}
            flatPrice={flatPrice}
            flatType={flatType}
            financing={financing}
            scheme={scheme}
            loanTenureYears={loanTenureYears}
            loanInterestRate={loanInterestRate}
            signingAmount={signingAmount}
            keyAmount={keyAmount}
            minCashSigning={minCashSigning}
            signingCpf={signingCpf}
            keyCpf={keyCpf}
            downpaymentNote={downpaymentRule.note}
            timeline={timeline}
            completedMilestones={activeCompletedMilestones}
            confirmedMilestoneDates={activeConfirmedMilestoneDates}
            planStorageStatus={planStorageStatus}
            planStorageError={planStorageError}
            onOpenBudget={() => setActiveTab("budget")}
            onOpenRadar={() => setActiveTab("bto")}
            onFlatPriceChange={handleFlatPriceChange}
            onFlatTypeChange={setFlatType}
            onFinancingChange={handleFinancingChange}
            onSchemeChange={setScheme}
            onLoanTenureChange={handleLoanTenureChange}
            onLoanInterestRateChange={handleLoanInterestRateChange}
            onSavePlan={handleSavePlan}
            onToggleMilestoneComplete={handleToggleMilestoneComplete}
            onMilestoneDateChange={handleMilestoneDateChange}
          />
        )}

        {activeTab === "bto" && !budgetKnown && (
          <div className="budget-notice" role="note">
            <p>
              The budget labels below use a rough guess from income alone. Add your age and savings for a real
              price ceiling.
            </p>
            <button type="button" className="budget-link" onClick={() => setActiveTab("budget")}>
              Set your budget
            </button>
          </div>
        )}

        {activeTab === "bto" && (
          <BtoTab
            btoLoading={btoLoading}
            btoError={btoError}
            availableYears={availableYears}
            yearFilter={yearFilter}
            townQuery={townQuery}
            filteredProjects={filteredProjects}
            selectedFlatType={flatType}
            loanAmount={loanAmount}
            ehgGrant={ehgGrant}
            totalAffordability={totalAffordability}
            scorePreset={btoScorePreset}
            scoreWeights={btoScoreWeights}
            onScorePresetChange={handleBtoScorePresetChange}
            onScoreWeightsChange={setBtoScoreWeights}
            onRetry={handleRetryBto}
            onYearFilterChange={handleYearFilterChange}
            onTownQueryChange={handleTownQueryChange}
            onFlatTypeChange={setFlatType}
            selectedProjectId={selectedBtoProjectId}
            onSelectProject={handleSelectBtoProject}
            onResetFilters={handleResetBtoFilters}
          />
        )}

        {activeTab === "sources" && <SourcesTab />}
        </div>
      </main>
    </div>
  );
}

function formatSavedAt(value: string) {
  return new Date(value).toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDefaultApplicationMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

// New visitors start at the budget; someone returning to a chosen project lands on their overview.
function getInitialTab(hasSavedProject: boolean): TabKey {
  const tab = new URLSearchParams(window.location.search).get("tab");
  if (tab === "plan" || tab === "bto" || tab === "sources" || tab === "overview" || tab === "budget") return tab;
  return hasSavedProject ? "overview" : "budget";
}

function getLoanTenureMax(financing: FinancingType) {
  return financing === "hdb" ? HDB_LOAN_TENURE_MAX : BANK_LOAN_TENURE_MAX;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected storage error.";
}

export default App;
