import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BtoTab } from "./components/BtoTab";
import { BudgetTab } from "./components/BudgetTab";
import { Navigation } from "./components/Navigation";
import { HomeTab } from "./components/HomeTab";
import { PurchasePlanTab } from "./components/PurchasePlanTab";
import { SetupFlow } from "./components/SetupFlow";
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
  ASSUMED_BUYER_AGE,
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
import { clampNumber, currency } from "./utils/format";
import { withViewTransition } from "./utils/motion";
import {
  eligibilityChecks,
  journeyStages,
  latestLaunch,
  pricesBySize,
  splitCeiling,
  type Lever,
} from "./utils/journey";
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

  const ehgMode =
    budget.firstTimers === "both"
      ? "family-estimate"
      : budget.firstTimers === "one"
        ? "mixed-couple-estimate"
        : "none";
  const grantFor = useCallback(
    (income: number) =>
      calculateEhgAssessment({
        mode: ehgMode,
        assessedAverageMonthlyIncome: income,
        confirmedAmount: null,
        familyEligibilityConfirmed: true,
      }),
    [ehgMode]
  );
  const ehgAssessment = useMemo(() => grantFor(combinedIncome), [grantFor, combinedIncome]);
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
      ageForLoanRules: ASSUMED_BUYER_AGE,
      outstandingHousingLoans: 0,
      requestedTenureYears: loanTenureYears,
      repaymentRatePercent: loanInterestRate,
    }),
    [
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
      budget.cpfOa === null
        ? null
        : affordableCeiling({
            base: budgetInput,
            timing,
            cpfToday: budget.cpfOa,
            combinedIncome,
            age: ASSUMED_BUYER_AGE,
            monthlyOverride: null,
            signingShare: downpaymentRule.signing,
            minCashSigningShare: downpaymentRule.minCashSigning,
          }),
    [budget.cpfOa, budgetInput, combinedIncome, downpaymentRule.minCashSigning, downpaymentRule.signing]
  );
  // The Budget screen shows a launch applied for now, with keys after the usual wait.
  const typicalTiming = useMemo(
    () => timingForLaunch({ today, applicationMonth: today, expectedKeys: null }),
    [today]
  );
  const typicalCeiling = useMemo(() => ceilingAt(typicalTiming), [ceilingAt, typicalTiming]);
  // The same ceiling with one input changed: for the setup's running total (CPF counts as
  // zero until given) and for what would raise it.
  const ceilingWith = useCallback(
    ({ income = combinedIncome, cpf, laterKeysMonths = 0 }: { income?: number; cpf: number; laterKeysMonths?: number }) =>
      affordableCeiling({
        base: { ...budgetInput, grossMonthlyIncome: income, grantAmount: grantFor(income).amount ?? 0 },
        timing: {
          monthsToSigning: typicalTiming.monthsToSigning,
          monthsToKeys: typicalTiming.monthsToKeys + laterKeysMonths,
        },
        cpfToday: cpf,
        combinedIncome: income,
        age: ASSUMED_BUYER_AGE,
        monthlyOverride: null,
        signingShare: downpaymentRule.signing,
        minCashSigningShare: downpaymentRule.minCashSigning,
      }),
    [budgetInput, combinedIncome, downpaymentRule.minCashSigning, downpaymentRule.signing, grantFor, typicalTiming]
  );
  const [setupOpen, setSetupOpen] = useState(false);
  const draftSplit = useMemo(
    () => (setupOpen ? splitCeiling(ceilingWith({ cpf: budget.cpfOa ?? 0 })) : null),
    [budget.cpfOa, ceilingWith, setupOpen]
  );
  const budgetMaxPrice = typicalCeiling?.price ?? null;
  const budgetAtMax = typicalCeiling?.estimate ?? null;
  const budgetKnown = budgetMaxPrice !== null && budgetAtMax !== null;
  const monthlyCpfAt = useCallback(
    (timing: PurchaseTiming) =>
      estimateMonthlyOa(combinedIncome, ASSUMED_BUYER_AGE + timing.monthsToKeys / 12),
    [combinedIncome]
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
    if (budget.cpfOa === null) return null;
    const project = (months: number) =>
      projectOa({
        cpfToday: budget.cpfOa ?? 0,
        combinedIncome,
        age: ASSUMED_BUYER_AGE,
        monthlyOverride: null,
        months,
      });
    return { signing: project(planTiming.monthsToSigning), keys: project(planTiming.monthsToKeys) };
  }, [budget.cpfOa, combinedIncome, planTiming]);
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

  // Home and the guided setup.
  const ceilingSplit = useMemo(() => splitCeiling(typicalCeiling), [typicalCeiling]);
  const launch = useMemo(
    () => latestLaunch({ projects: btoProjects, flatType, today, ceilingFor: budgetKnown ? ceilingFor : null }),
    [btoProjects, budgetKnown, ceilingFor, flatType, today]
  );
  const sizePrices = useMemo(() => pricesBySize(btoProjects), [btoProjects]);
  const checks = useMemo(
    () => eligibilityChecks({ income: combinedIncome, firstTimers: budget.firstTimers, flatType, grant: ehgGrant }),
    [budget.firstTimers, combinedIncome, ehgGrant, flatType]
  );
  const journey = useMemo(() => journeyStages(timeline), [timeline]);
  const levers = useMemo<Lever[]>(() => {
    if (budget.cpfOa === null || !typicalCeiling) return [];
    const base = typicalCeiling.price;
    const gain = (result: ReturnType<typeof ceilingWith>) =>
      Math.max(Math.floor(((result?.price ?? base) - base) / 1000) * 1000, 0);
    const raise = 500;
    const grantDrop = ehgGrant - (grantFor(combinedIncome + raise).amount ?? 0);
    return [
      {
        key: "income",
        label: `${currency(raise)} more income a month`,
        delta: gain(ceilingWith({ income: combinedIncome + raise, cpf: budget.cpfOa })),
        note: grantDrop > 0 ? `A bigger loan, though the grant falls by ${currency(grantDrop)}.` : "A bigger loan, at 30% of income.",
      },
      {
        key: "savings",
        label: `${currency(10000)} more in CPF or cash`,
        delta: gain(ceilingWith({ cpf: budget.cpfOa + 10000 })),
        note: "Savings go into the downpayment.",
      },
      {
        key: "keys",
        label: "Keys a year later",
        delta: gain(ceilingWith({ cpf: budget.cpfOa, laterKeysMonths: 12 })),
        note: "A project with a longer wait leaves more time for CPF to build up.",
      },
    ];
  }, [budget.cpfOa, ceilingWith, combinedIncome, ehgGrant, grantFor, typicalCeiling]);

  // The setup edits the live plan so its running total is real; closing it early puts the
  // answers back as they were.
  const setupStart = useRef<{ income: number; budget: BudgetInputs; flatType: FlatType } | null>(null);
  const openSetup = () => {
    setupStart.current = { income: combinedIncome, budget, flatType };
    setSetupOpen(true);
  };
  const closeSetup = (finished: boolean) => {
    const start = setupStart.current;
    if (!finished && start) {
      setCombinedIncome(start.income);
      setBudget(start.budget);
      saveBudgetInputs(start.budget);
      setFlatType(start.flatType);
    }
    setupStart.current = null;
    setSetupOpen(false);
    if (finished) setActiveTab("overview");
  };
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
            feesInCash={feesInCash}
            ehg={ehgAssessment}
            onIncomeChange={handleIncomeChange}
            onBudgetChange={handleBudgetChange}
            onSeeProjects={() => setActiveTab("bto")}
            onOpenPlan={() => setActiveTab("plan")}
            onStartSetup={openSetup}
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
          <HomeTab
            split={budgetKnown ? ceilingSplit : null}
            limitedBy={budgetKnown ? (typicalCeiling?.limitedBy ?? null) : null}
            financing={financing}
            monthlyCpf={monthlyCpfAt(typicalTiming)}
            flatType={flatType}
            checks={checks}
            levers={levers}
            launch={launch}
            ceilingFor={ceilingFor}
            journey={journey}
            selectedProject={selectedBtoProject}
            flatPrice={flatPrice}
            onStartSetup={openSetup}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === "sources" && <SourcesTab />}
      </main>

      {setupOpen && (
        <SetupFlow
          combinedIncome={combinedIncome}
          budget={budget}
          flatType={flatType}
          draft={draftSplit}
          grant={ehgGrant}
          monthlyCpf={monthlyCpfAt(typicalTiming)}
          sizePrices={sizePrices}
          launch={launch}
          onIncomeChange={handleIncomeChange}
          onBudgetChange={handleBudgetChange}
          onFlatTypeChange={setFlatType}
          onClose={closeSetup}
          onSeeProjects={() => {
            setupStart.current = null;
            setSetupOpen(false);
            setActiveTab("bto");
          }}
        />
      )}
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
