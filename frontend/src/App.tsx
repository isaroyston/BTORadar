import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BtoTab } from "./components/BtoTab";
import { BudgetTab } from "./components/BudgetTab";
import { Navigation } from "./components/Navigation";
import { OverviewTab } from "./components/OverviewTab";
import { PurchasePlanTab } from "./components/PurchasePlanTab";
import { SourcesTab } from "./components/SourcesTab";
import {
  TABS,
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
import { POLICY_CONFIG, type BtoProject } from "./policies/policyConfig";
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
import {
  affordableCeiling,
  estimateMonthlyOa,
  fundStages,
  projectOa,
  timingForLaunch,
  type PurchaseTiming,
} from "./utils/cpfProjection";
import { parseLaunchMonthInput, parseMonth, parseMonthYearDate } from "./utils/date";
import { keysMonth } from "./utils/projectFacts";
import { clampNumber } from "./utils/format";
import { withViewTransition } from "./utils/motion";
import { buildPaymentTimeline } from "./utils/paymentTimeline";
import { loadShortlist, saveShortlist } from "./utils/shortlistStorage";
import {
  createPlannerSnapshot,
  loadPlannerSnapshot,
  savePlannerSnapshot,
  type PaymentOverride,
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
    getInitialTab()
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
  const planLoadError = initialPlanResult.error;
  const [savedProjectIds, setSavedProjectIds] = useState<string[]>(loadShortlist);
  const [applicationMonth, setApplicationMonth] = useState(
    initialPlan?.applicationMonth ?? getDefaultApplicationMonth()
  );
  const [completedMilestones, setCompletedMilestones] = useState<string[]>(
    initialPlan?.completedMilestones ?? []
  );
  const [confirmedMilestoneDates, setConfirmedMilestoneDates] = useState<
    Record<string, string>
  >(initialPlan?.confirmedMilestoneDates ?? {});
  const [paymentOverrides, setPaymentOverrides] = useState<Record<string, PaymentOverride>>(
    initialPlan?.paymentOverrides ?? {}
  );

  const {
    projects: btoProjects,
    isLoading: btoLoading,
    error: btoError,
    retry: retryBto,
  } = useBtoProjects();

  const ehgAssessment = useMemo(
    () =>
      calculateEhgAssessment({
        mode:
          budget.firstTimers === "both"
            ? "family-estimate"
            : budget.firstTimers === "one"
              ? "mixed-couple-estimate"
              : "none",
        assessedAverageMonthlyIncome: combinedIncome,
        confirmedAmount: null,
        familyEligibilityConfirmed: true,
      }),
    [budget.firstTimers, combinedIncome]
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

  // Cash is optional. Without it, the maths assumes enough cash for the cash-only fees and
  // shows any other cash a payment would need.
  const feesInCash = APPLICATION_FEE + optionFee + surveyFee + fireInsurance;
  const cashForMaths = budget.cash ?? feesInCash;

  // The price ceiling comes from the financing estimate once age and CPF are known.
  // Until then the old income-only rule stands in, and BTO Radar says so.
  const budgetInput = useMemo<FinancingEstimateInput>(
    () => ({
      financing,
      purchasePrice: flatPrice,
      grossMonthlyIncome: combinedIncome,
      availableCash: cashForMaths,
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
      cashForMaths,
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
  // Payments fall due months or years after booking, and CPF keeps building up until then.
  // The ceiling is the highest price where each payment can be met on its date.
  const [today] = useState(() => new Date());
  const ceilingAt = useCallback(
    (timing: PurchaseTiming) =>
      budget.age === null || budget.cpfOa === null
        ? null
        : affordableCeiling({
            base: budgetInput,
            timing,
            cpfToday: budget.cpfOa,
            combinedIncome,
            age: budget.age,
            monthlyOverride: budget.cpfMonthly,
            signingShare: downpaymentRule.signing,
            minCashSigningShare: downpaymentRule.minCashSigning,
          }),
    [budget.age, budget.cpfMonthly, budget.cpfOa, budgetInput, combinedIncome, downpaymentRule.minCashSigning, downpaymentRule.signing]
  );
  // The Budget screen shows a launch applied for now, with keys after the usual wait.
  const typicalTiming = useMemo(
    () => timingForLaunch({ today, applicationMonth: today, expectedKeys: null }),
    [today]
  );
  const typicalCeiling = useMemo(() => ceilingAt(typicalTiming), [ceilingAt, typicalTiming]);
  const budgetMaxPrice = typicalCeiling?.price ?? null;
  const budgetAtMax = typicalCeiling?.estimate ?? null;
  const budgetKnown = budgetMaxPrice !== null && budgetAtMax !== null;
  const monthlyCpfAt = useCallback(
    (timing: PurchaseTiming) =>
      budget.cpfMonthly ??
      (budget.age === null ? null : estimateMonthlyOa(combinedIncome, budget.age + timing.monthsToKeys / 12)),
    [budget.age, budget.cpfMonthly, combinedIncome]
  );
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

  const planTiming = useMemo(
    () =>
      timingForLaunch({
        today,
        applicationMonth: parseMonth(applicationMonth),
        expectedKeys: parseMonthYearDate(keysMonth(selectedBtoProject)),
      }),
    [applicationMonth, selectedBtoProject, today]
  );
  const planOa = useMemo(() => {
    if (budget.age === null || budget.cpfOa === null) return null;
    const project = (months: number) =>
      projectOa({
        cpfToday: budget.cpfOa ?? 0,
        combinedIncome,
        age: budget.age ?? 0,
        monthlyOverride: budget.cpfMonthly,
        months,
      });
    return { signing: project(planTiming.monthsToSigning), keys: project(planTiming.monthsToKeys) };
  }, [budget.age, budget.cpfMonthly, budget.cpfOa, combinedIncome, planTiming]);
  const targetEstimate = useMemo(
    () => calculateFinancingEstimate({ ...budgetInput, availableCpfOa: planOa?.keys ?? budget.cpfOa }),
    [budget.cpfOa, budgetInput, planOa]
  );
  const stageFunding = useMemo(
    () =>
      planOa === null
        ? null
        : fundStages({
            signing: signingAmount,
            keys: keyAmount,
            minCashSigning,
            grant: Math.min(ehgGrant, flatPrice * 0.95),
            oaAtSigning: planOa.signing,
            oaAtKeys: planOa.keys,
            cash: budget.cash === null ? null : Math.max(budget.cash - feesInCash, 0),
          }),
    [budget.cash, ehgGrant, feesInCash, flatPrice, keyAmount, minCashSigning, planOa, signingAmount]
  );

  // Each project is checked with its own dates: later keys leave more time for CPF to build up.
  const projectCeilings = useMemo(() => {
    const byTiming = new Map<string, number>();
    const byProject = new Map<string, number>();
    for (const project of btoProjects) {
      const timing = timingForLaunch({
        today,
        applicationMonth: parseMonthYearDate(project.launchMonth) ?? today,
        expectedKeys: parseMonthYearDate(keysMonth(project)),
      });
      const key = `${timing.monthsToSigning}:${timing.monthsToKeys}`;
      if (!byTiming.has(key)) byTiming.set(key, Math.floor((ceilingAt(timing)?.price ?? 0) / 1000) * 1000);
      byProject.set(project.id, byTiming.get(key) ?? 0);
    }
    return byProject;
  }, [btoProjects, ceilingAt, today]);
  const ceilingFor = useCallback(
    (project: BtoProject) => projectCeilings.get(project.id) ?? totalAffordability,
    [projectCeilings, totalAffordability]
  );

  const timeline = useMemo(
    () =>
      buildPaymentTimeline({
        applicationMonth,
        expectedTop: keysMonth(selectedBtoProject),
        flatType,
        signingAmount,
        signingCpf,
        minCashSigning,
        keyAmount,
        keyCpf,
        optionFee,
        surveyFee,
        fireInsurance,
        signingFunding: stageFunding?.signing,
        keyFunding: stageFunding?.keys,
      }),
    [
      applicationMonth,
      stageFunding,
      fireInsurance,
      flatType,
      keyAmount,
      keyCpf,
      minCashSigning,
      optionFee,
      selectedBtoProject,
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
  useEffect(() => {
    try {
      savePlannerSnapshot(
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
          paymentOverrides,
        })
      );
    } catch {
      // Storage can be blocked or full; the plan still works for this visit.
    }
  }, [
    activeCompletedMilestones,
    activeConfirmedMilestoneDates,
    applicationMonth,
    btoScoreMode,
    btoScorePreset,
    btoScoreWeights,
    combinedIncome,
    financing,
    flatPrice,
    flatType,
    loanInterestRate,
    loanTenureYears,
    paymentOverrides,
    scheme,
    selectedBtoProjectId,
    townQuery,
    yearFilter,
  ]);

  // After moving to another screen, name it in the tab title and move focus to its heading.
  const firstScreen = useRef(true);
  useEffect(() => {
    const label = TABS.find((tab) => tab.id === activeTab)?.label ?? "Budget";
    document.title = `${label} · BTO Radar`;
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    document.querySelector<HTMLElement>(".main h1")?.focus({ preventScroll: true });
  }, [activeTab]);

  const doneTabs = useMemo(() => {
    const done = new Set<TabKey>();
    if (budgetKnown) done.add("budget");
    if (selectedBtoProjectId) done.add("bto");
    if (timeline.length > 0 && activeCompletedMilestones.length === timeline.length) done.add("plan");
    return done;
  }, [activeCompletedMilestones.length, budgetKnown, selectedBtoProjectId, timeline.length]);

  const setActiveTab = (tab: TabKey) => {
    // Scroll inside the transition, so the old screen doesn't jump before it fades.
    withViewTransition(() => {
      setActiveTabState(tab);
      window.scrollTo({ top: 0 });
    });

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

  const handleToggleSaved = (projectId: string) => {
    setSavedProjectIds((current) => {
      const next = current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [projectId, ...current];
      saveShortlist(next);
      return next;
    });
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
    setPaymentOverrides({});

    if (preferredVariant) {
      setFlatType(preferredVariant.type);
      setFlatPrice(clampNumber(preferredVariant.basePrice, FLAT_MIN, FLAT_MAX));
    }

    const launchMonth = parseLaunchMonthInput(project.launchMonth);
    if (launchMonth) setApplicationMonth(launchMonth);

    setActiveTab("plan");
  };

  return (
    <div className="shell">
      <Navigation activeTab={activeTab} doneTabs={doneTabs} onSelectTab={setActiveTab} />

      <main className="main">
        {activeTab === "budget" && (
          <BudgetTab
            combinedIncome={combinedIncome}
            budget={budget}
            financing={financing}
            loanTenureYears={loanTenureYears}
            estimateAtMax={budgetAtMax}
            maxPrice={budgetMaxPrice}
            ceiling={typicalCeiling}
            timing={typicalTiming}
            monthlyCpf={monthlyCpfAt(typicalTiming)}
            estimatedMonthlyCpf={budget.age === null ? null : estimateMonthlyOa(combinedIncome, budget.age)}
            feesInCash={feesInCash}
            ehg={ehgAssessment}
            onIncomeChange={handleIncomeChange}
            onBudgetChange={handleBudgetChange}
            onSeeProjects={() => setActiveTab("bto")}
            onOpenPlan={() => setActiveTab("plan")}
          />
        )}

        {activeTab === "bto" && (
          <BtoTab
            btoLoading={btoLoading}
            btoError={btoError}
            availableYears={availableYears}
            yearFilter={yearFilter}
            townQuery={townQuery}
            filteredProjects={filteredProjects}
            allProjects={btoProjects}
            selectedFlatType={flatType}
            budgetKnown={budgetKnown}
            loanAmount={loanAmount}
            ehgGrant={ehgGrant}
            totalAffordability={totalAffordability}
            ceilingFor={ceilingFor}
            scorePreset={btoScorePreset}
            scoreWeights={btoScoreWeights}
            selectedProjectId={selectedBtoProjectId}
            savedProjectIds={savedProjectIds}
            onScorePresetChange={handleBtoScorePresetChange}
            onScoreWeightsChange={setBtoScoreWeights}
            onRetry={handleRetryBto}
            onYearFilterChange={handleYearFilterChange}
            onTownQueryChange={handleTownQueryChange}
            onFlatTypeChange={setFlatType}
            onSelectProject={handleSelectBtoProject}
            onToggleSaved={handleToggleSaved}
            onResetFilters={handleResetBtoFilters}
            onOpenBudget={() => setActiveTab("budget")}
          />
        )}

        {activeTab === "plan" && (
          <PurchasePlanTab
            selectedProject={selectedBtoProject}
            ehgGrant={ehgGrant}
            targetEstimate={targetEstimate}
            budgetKnown={budgetKnown}
            stageFunding={stageFunding}
            oaAtKeys={planOa?.keys ?? null}
            monthlyCpf={monthlyCpfAt(planTiming)}
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
            paymentOverrides={paymentOverrides}
            onPaymentOverridesChange={setPaymentOverrides}
            loadError={planLoadError}
            combinedIncome={combinedIncome}
            onIncomeChange={handleIncomeChange}
            onBudgetChange={handleBudgetChange}
            onOpenBudget={() => setActiveTab("budget")}
            onOpenRadar={() => setActiveTab("bto")}
            onFlatPriceChange={handleFlatPriceChange}
            onFlatTypeChange={setFlatType}
            onFinancingChange={handleFinancingChange}
            onSchemeChange={setScheme}
            onLoanTenureChange={handleLoanTenureChange}
            onLoanInterestRateChange={handleLoanInterestRateChange}
            onToggleMilestoneComplete={handleToggleMilestoneComplete}
            onMilestoneDateChange={handleMilestoneDateChange}
          />
        )}

        {activeTab === "overview" && (
          <OverviewTab
            budgetKnown={budgetKnown}
            budgetCeiling={totalAffordability}
            selectedProject={selectedBtoProject}
            flatPrice={flatPrice}
            fundingGap={budgetKnown ? targetEstimate.fundingGap : null}
            savedCount={savedProjectIds.length}
            timeline={timeline}
            completedMilestones={activeCompletedMilestones}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === "sources" && <SourcesTab />}
      </main>
    </div>
  );
}

function getDefaultApplicationMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

// Everyone starts at the overview: new visitors choose where to begin, returning ones see what is next.
function getInitialTab(): TabKey {
  const tab = new URLSearchParams(window.location.search).get("tab");
  if (tab === "plan" || tab === "bto" || tab === "sources" || tab === "overview" || tab === "budget") return tab;
  return "overview";
}

function getLoanTenureMax(financing: FinancingType) {
  return financing === "hdb" ? HDB_LOAN_TENURE_MAX : BANK_LOAN_TENURE_MAX;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected storage error.";
}

export default App;
