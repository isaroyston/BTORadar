import { useMemo, useState } from "react";
import { BtoTab } from "./components/BtoTab";
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
  LOAN_TENURE_MIN,
} from "./constants";
import { useBtoProjects } from "./hooks/useBtoProjects";
import {
  getDownpaymentRule,
  POLICY_CONFIG,
} from "./policies/policyConfig";
import type {
  FinancingType,
  BtoDecisionScore,
  BtoScoreMode,
  BtoScorePreset,
  EhgMode,
  FlatType,
  SchemeType,
  TabKey,
  TimelinePaymentOverride,
} from "./types";
import {
  filterBtoProjects,
  getActiveYear,
  getAvailableYears,
} from "./utils/bto";
import {
  BTO_SCORE_PRESET_DETAILS,
  scoreBtoProject,
  type BtoScoreWeights,
} from "./utils/btoScoring";
import {
  isSupportedApplicationMonth,
  parseLaunchMonthInput,
} from "./utils/date";
import { clampNumber } from "./utils/format";
import { buildPaymentTimeline } from "./utils/paymentTimeline";
import { calculateFinancingEstimate } from "./utils/affordability";
import { calculateEhgAssessment } from "./utils/ehg";
import { calculateBuyerStampDuty } from "./utils/fees";
import {
  allocatePaymentStages,
  constrainPaymentFunding,
} from "./utils/paymentAllocation";
import {
  createPlannerSnapshot,
  loadPlannerSnapshot,
  savePlannerSnapshot,
} from "./utils/planStorage";

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

  const [activeTab, setActiveTabState] = useState<TabKey>(getInitialTab());
  const [combinedIncome, setCombinedIncome] = useState(
    initialPlan?.combinedIncome ?? 6000
  );
  const [flatPrice, setFlatPrice] = useState(initialPlan?.flatPrice ?? 650000);
  const [flatType, setFlatType] = useState<FlatType>(
    initialPlan?.flatType ?? "4-room"
  );
  const [radarFlatType, setRadarFlatType] = useState<FlatType>(
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
  const [paymentOverrides, setPaymentOverrides] = useState<
    Record<string, TimelinePaymentOverride>
  >(initialPlan?.paymentOverrides ?? {});
  const [availableCash, setAvailableCash] = useState<number | null>(
    initialPlan?.availableCash ?? null
  );
  const [availableCpfOa, setAvailableCpfOa] = useState<number | null>(
    initialPlan?.availableCpfOa ?? null
  );
  const [monthlyDebtPayments, setMonthlyDebtPayments] = useState<number | null>(
    initialPlan?.monthlyDebtPayments ?? null
  );
  const [monthlyPropertyLoanPayments, setMonthlyPropertyLoanPayments] =
    useState<number | null>(initialPlan?.monthlyPropertyLoanPayments ?? null);
  const [bankThereafterRate, setBankThereafterRate] = useState<number | null>(
    initialPlan?.bankThereafterRate ?? null
  );
  const [ageForLoanRules, setAgeForLoanRules] = useState<number | null>(
    initialPlan?.ageForLoanRules ?? null
  );
  const [outstandingHousingLoans, setOutstandingHousingLoans] = useState<
    0 | 1 | 2 | null
  >(initialPlan?.outstandingHousingLoans ?? null);
  const [ehgMode, setEhgMode] = useState<EhgMode>(
    initialPlan?.ehgMode ?? "unassessed"
  );
  const [ehgAssessedIncome, setEhgAssessedIncome] = useState<number | null>(
    initialPlan?.ehgAssessedIncome ?? null
  );
  const [ehgConfirmedAmount, setEhgConfirmedAmount] = useState<number | null>(
    initialPlan?.ehgConfirmedAmount ?? null
  );
  const [ehgFamilyEligibilityConfirmed, setEhgFamilyEligibilityConfirmed] =
    useState(initialPlan?.ehgFamilyEligibilityConfirmed ?? false);

  const {
    projects: btoProjects,
    isLoading: btoLoading,
    error: btoError,
    generatedAt: btoGeneratedAt,
    retry: retryBto,
  } = useBtoProjects();

  const ehgAssessment = useMemo(
    () =>
      calculateEhgAssessment({
        mode: ehgMode,
        assessedAverageMonthlyIncome: ehgAssessedIncome,
        confirmedAmount: ehgConfirmedAmount,
        familyEligibilityConfirmed: ehgFamilyEligibilityConfirmed,
      }),
    [
      ehgAssessedIncome,
      ehgConfirmedAmount,
      ehgFamilyEligibilityConfirmed,
      ehgMode,
    ]
  );
  const ehgGrant = ehgAssessment.amount;
  const optionFee = POLICY_CONFIG.fees.optionFeeByFlatType[flatType];
  const surveyFee = POLICY_CONFIG.fees.surveyFeeByFlatType[flatType];
  const fireInsurance =
    financing === "hdb"
      ? POLICY_CONFIG.fees.fireInsuranceByFlatType[flatType]
      : 0;
  const registrationFees =
    POLICY_CONFIG.fees.registrationFeeLeaseEscrow +
    (financing === "hdb"
      ? POLICY_CONFIG.fees.registrationFeeMortgageEscrow
      : 0);
  const buyerStampDuty = calculateBuyerStampDuty(flatPrice);
  const baseKeyFeeAmount = surveyFee + fireInsurance + registrationFees;
  const fixedAdditionalCosts =
    POLICY_CONFIG.fees.applicationFee + baseKeyFeeAmount;
  const modeledCashOnlyCosts =
    POLICY_CONFIG.fees.applicationFee + fireInsurance;
  const financingEstimate = useMemo(
    () =>
      calculateFinancingEstimate({
        financing,
        purchasePrice: flatPrice,
        grossMonthlyIncome: combinedIncome,
        availableCash,
        availableCpfOa,
        grantAmount: ehgGrant,
        monthlyDebtPayments,
        monthlyPropertyLoanPayments,
        bankThereafterRatePercent: bankThereafterRate,
        cashOnlyPurchaseAmount: optionFee,
        fixedAdditionalCosts,
        cashOnlyCosts: modeledCashOnlyCosts,
        ageForLoanRules,
        outstandingHousingLoans,
        requestedTenureYears: loanTenureYears,
        repaymentRatePercent: loanInterestRate,
      }),
    [
      ageForLoanRules,
      availableCash,
      availableCpfOa,
      combinedIncome,
      ehgGrant,
      financing,
      flatPrice,
      loanInterestRate,
      loanTenureYears,
      bankThereafterRate,
      monthlyDebtPayments,
      monthlyPropertyLoanPayments,
      fixedAdditionalCosts,
      modeledCashOnlyCosts,
      optionFee,
      outstandingHousingLoans,
    ]
  );
  const deedOfAssignmentStampDuty =
    financingEstimate.deedOfAssignmentStampDuty;
  const modeledDeedOfAssignmentStampDuty =
    deedOfAssignmentStampDuty ?? 0;
  const keyFeeAmount =
    baseKeyFeeAmount + modeledDeedOfAssignmentStampDuty;
  const keyFeeLabel =
    financing === "hdb"
      ? deedOfAssignmentStampDuty === null
        ? "Survey, HDB registration and fire insurance; deed stamp duty pending"
        : "Survey, HDB registration, fire insurance and deed stamp duty"
      : "Survey and lease-registration estimates";
  const modeledAdditionalCosts =
    fixedAdditionalCosts +
    buyerStampDuty +
    modeledDeedOfAssignmentStampDuty;
  const radarOptionFee =
    POLICY_CONFIG.fees.optionFeeByFlatType[radarFlatType];
  const radarSurveyFee =
    POLICY_CONFIG.fees.surveyFeeByFlatType[radarFlatType];
  const radarFireInsurance =
    financing === "hdb"
      ? POLICY_CONFIG.fees.fireInsuranceByFlatType[radarFlatType]
      : 0;
  const radarFixedAdditionalCosts =
    POLICY_CONFIG.fees.applicationFee +
    radarSurveyFee +
    radarFireInsurance +
    registrationFees;
  const radarCashOnlyCosts =
    POLICY_CONFIG.fees.applicationFee + radarFireInsurance;
  const radarFinancingEstimate = useMemo(
    () =>
      calculateFinancingEstimate({
        financing,
        purchasePrice: flatPrice,
        grossMonthlyIncome: combinedIncome,
        availableCash,
        availableCpfOa,
        grantAmount: ehgGrant,
        monthlyDebtPayments,
        monthlyPropertyLoanPayments,
        bankThereafterRatePercent: bankThereafterRate,
        cashOnlyPurchaseAmount: radarOptionFee,
        fixedAdditionalCosts: radarFixedAdditionalCosts,
        cashOnlyCosts: radarCashOnlyCosts,
        ageForLoanRules,
        outstandingHousingLoans,
        requestedTenureYears: loanTenureYears,
        repaymentRatePercent: loanInterestRate,
      }),
    [
      ageForLoanRules,
      availableCash,
      availableCpfOa,
      bankThereafterRate,
      combinedIncome,
      ehgGrant,
      financing,
      flatPrice,
      loanInterestRate,
      loanTenureYears,
      monthlyDebtPayments,
      monthlyPropertyLoanPayments,
      outstandingHousingLoans,
      radarCashOnlyCosts,
      radarFixedAdditionalCosts,
      radarOptionFee,
    ]
  );
  const loanAmount = financingEstimate.estimatedLoanLimit;
  const totalAffordability = financingEstimate.maxPurchasePrice;
  const isBudgetConditional =
    ehgAssessment.status === "conditional-estimate" || combinedIncome > 14000;
  const scoreablePlanBudget = isBudgetConditional
    ? null
    : totalAffordability;
  const scoreableRadarBudget = isBudgetConditional
    ? null
    : radarFinancingEstimate.maxPurchasePrice;
  const downpaymentRule = getDownpaymentRule(
    financing,
    scheme,
    financingEstimate.ltvLimit
  );
  const signingGrossAmount = flatPrice * downpaymentRule.signing;
  const signingAmount = Math.max(
    signingGrossAmount - optionFee,
    0
  );
  const keyPaymentIsUnassessed = financingEstimate.loanForTarget === null;
  const keyAmount =
    financingEstimate.loanForTarget === null
      ? Math.max(flatPrice - signingGrossAmount, 0)
      : Math.max(
          flatPrice - signingGrossAmount - financingEstimate.loanForTarget,
          0
        );
  const minimumCashRate = financingEstimate.minimumCashRate;
  const minCashSigning =
    minimumCashRate === null
      ? 0
      : Math.max(
          flatPrice * downpaymentRule.minCashSigning - optionFee,
          0
        );
  const minCashKey =
    minimumCashRate === null
      ? 0
      : Math.max(
          flatPrice * downpaymentRule.minCashKey,
          flatPrice * minimumCashRate - optionFee - minCashSigning,
          0
        );
  const downpaymentNote =
    financing === "bank" && minimumCashRate === null
      ? "Bank LTV and minimum cash cannot be assessed until the bank-specific inputs are complete. The key settlement remains unallocated until those inputs are supplied."
      : downpaymentRule.note;
  const [
    applicationAllocation,
    bookingAllocation,
    signingAllocation,
    agreementFeeAllocation,
    keyAllocation,
    keyFeeAllocation,
  ] = useMemo(
    () =>
      allocatePaymentStages({
        stages: [
          {
            total: POLICY_CONFIG.fees.applicationFee,
            minimumCash: POLICY_CONFIG.fees.applicationFee,
            cashOnly: true,
          },
          { total: optionFee, minimumCash: optionFee, cashOnly: true },
          {
            total: signingAmount,
            minimumCash: minCashSigning,
            allowsGrant: scheme !== "dia",
          },
          {
            total: buyerStampDuty,
            minimumCash: 0,
            allowsGrant: false,
            fundingPriority: 1,
          },
          { total: keyAmount, minimumCash: minCashKey },
          {
            total: keyFeeAmount,
            minimumCash: fireInsurance,
            allowsGrant: false,
            fundingPriority: 1,
          },
        ],
        availableCash,
        availableCpfOa,
        grantAmount: financingEstimate.usableGrantAmount,
      }),
    [
      availableCash,
      availableCpfOa,
      buyerStampDuty,
      fireInsurance,
      keyFeeAmount,
      optionFee,
      scheme,
      financingEstimate.usableGrantAmount,
      keyAmount,
      minCashKey,
      minCashSigning,
      signingAmount,
    ]
  );
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
        financing,
        keyFeeLabel,
        applicationAllocation,
        bookingAllocation,
        signingAllocation,
        agreementFeeAllocation,
        keyAllocation,
        keyFeeAllocation,
        keyPaymentIsUnassessed,
      }),
    [
      applicationMonth,
      applicationAllocation,
      bookingAllocation,
      flatType,
      financing,
      agreementFeeAllocation,
      keyAllocation,
      keyFeeAllocation,
      keyFeeLabel,
      keyPaymentIsUnassessed,
      selectedBtoProject?.expectedTop,
      signingAllocation,
    ]
  );
  const activeCompletedMilestones = useMemo(() => {
    const timelineIds = new Set<string>(timeline.map((item) => item.id));
    return completedMilestones.filter((id) => timelineIds.has(id));
  }, [completedMilestones, timeline]);
  const activeConfirmedMilestoneDates = useMemo(() => {
    const timelineIds = new Set<string>(timeline.map((item) => item.id));

    return Object.fromEntries(
      Object.entries(confirmedMilestoneDates).filter(([id]) =>
        timelineIds.has(id)
      )
    );
  }, [confirmedMilestoneDates, timeline]);
  const activePaymentOverrides = useMemo(() => {
    const active: Record<string, TimelinePaymentOverride> = {};
    let cashUsed = timeline.reduce(
      (sum, item) => sum + (item.payment?.cash ?? 0),
      0
    );
    let cpfUsed = timeline.reduce(
      (sum, item) => sum + (item.payment?.cpfOa ?? 0),
      0
    );

    for (const item of timeline) {
      const payment = item.payment;
      const override = paymentOverrides[item.id];
      if (
        !payment ||
        !override ||
        (payment.grant ?? 0) > 0 ||
        (payment.unallocated ?? 0) > 0
      ) {
        continue;
      }

      const requiredCash = Math.min(
        payment.minimumCash ?? 0,
        override.total
      );
      const cash = Math.min(
        override.total,
        Math.max(override.cash, requiredCash)
      );
      const cpf = override.total - cash;
      const nextCashUsed = cashUsed - payment.cash + cash;
      const nextCpfUsed = cpfUsed - payment.cpfOa + cpf;

      if (
        nextCashUsed <= (availableCash ?? 0) + 0.01 &&
        nextCpfUsed <= (availableCpfOa ?? 0) + 0.01
      ) {
        active[item.id] = { total: override.total, cash, cpf };
        cashUsed = nextCashUsed;
        cpfUsed = nextCpfUsed;
      }
    }

    return active;
  }, [availableCash, availableCpfOa, paymentOverrides, timeline]);
  const effectiveTimeline = useMemo(
    () =>
      timeline.map((item) => {
        if (!item.payment) return item;
        const override = activePaymentOverrides[item.id];
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
      }),
    [activePaymentOverrides, timeline]
  );

  const availableYears = useMemo(
    () => getAvailableYears(btoProjects),
    [btoProjects]
  );
  const activeYear = useMemo(
    () => getActiveYear(yearFilter, availableYears),
    [availableYears, yearFilter]
  );
  const filteredProjects = useMemo(
    () => filterBtoProjects(btoProjects, activeYear, townQuery, radarFlatType),
    [activeYear, btoProjects, radarFlatType, townQuery]
  );
  const scoringProjects = useMemo(
    () => filterBtoProjects(btoProjects, activeYear, "", radarFlatType),
    [activeYear, btoProjects, radarFlatType]
  );
  const selectedDecisionScore = useMemo<BtoDecisionScore | null>(() => {
    if (!selectedBtoProject) return null;

    const cohortProjects = btoProjects.filter(
      (project) => project.launchMonth === selectedBtoProject.launchMonth
    );

    return scoreBtoProject(
      selectedBtoProject,
      {
        flatType,
        totalAffordability: scoreablePlanBudget,
        cohortProjects,
      },
      "buyer-fit",
      btoScorePreset,
      btoScoreWeights
    );
  }, [
    btoProjects,
    btoScorePreset,
    btoScoreWeights,
    flatType,
    selectedBtoProject,
    scoreablePlanBudget,
  ]);
  const planFingerprint = JSON.stringify({
    combinedIncome,
    flatPrice,
    flatType,
    financing,
    scheme,
    loanTenureYears,
    loanInterestRate,
    yearFilter,
    townQuery,
    btoScorePreset,
    btoScoreWeights,
    selectedBtoProjectId,
    applicationMonth,
    completedMilestones: activeCompletedMilestones,
    confirmedMilestoneDates: activeConfirmedMilestoneDates,
    paymentOverrides: activePaymentOverrides,
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
  });
  const [savedPlanFingerprint, setSavedPlanFingerprint] = useState<
    string
  >(planFingerprint);
  const [hasSavedPlan, setHasSavedPlan] = useState(Boolean(initialPlan));
  const displayedPlanStorageStatus =
    savedPlanFingerprint === planFingerprint
      ? planStorageStatus
      : hasSavedPlan
        ? "Unsaved changes"
        : "Unsaved plan";

  const setActiveTab = (tab: TabKey) => {
    setActiveTabState(tab);

    const url = new URL(window.location.href);
    if (tab === "overview") {
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
    setRadarFlatType("4-room");
  };

  const handleBtoScorePresetChange = (value: BtoScorePreset) => {
    setBtoScorePreset(value);
    setBtoScoreWeights(BTO_SCORE_PRESET_DETAILS[value].weights);
  };

  const handleRetryBto = () => {
    retryBto();
    setActiveTab("bto");
  };

  const clearPaymentOverrides = () => {
    setPaymentOverrides((current) =>
      Object.keys(current).length > 0 ? {} : current
    );
  };

  const handleIncomeChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setCombinedIncome(clampNumber(value, INCOME_MIN, INCOME_MAX));
    clearPaymentOverrides();
  };

  const handleFlatPriceChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setFlatPrice(clampNumber(value, FLAT_MIN, FLAT_MAX));
    clearPaymentOverrides();
  };

  const handleFlatTypeChange = (value: FlatType) => {
    setFlatType(value);
    clearPaymentOverrides();
  };

  const handleFinancingChange = (value: FinancingType) => {
    setFinancing(value);
    setLoanTenureYears((current) =>
      clampNumber(current, LOAN_TENURE_MIN, getLoanTenureMax(value))
    );
    clearPaymentOverrides();
  };

  const handleSchemeChange = (value: SchemeType) => {
    setScheme(value);
    clearPaymentOverrides();
  };

  const handleLoanTenureChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setLoanTenureYears(
      clampNumber(value, LOAN_TENURE_MIN, getLoanTenureMax(financing))
    );
    clearPaymentOverrides();
  };

  const handleLoanInterestRateChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setLoanInterestRate(
      clampNumber(value, LOAN_INTEREST_RATE_MIN, LOAN_INTEREST_RATE_MAX)
    );
    clearPaymentOverrides();
  };

  const handleAvailableCashChange = (value: number | null) => {
    setAvailableCash(value);
    clearPaymentOverrides();
  };

  const handleAvailableCpfOaChange = (value: number | null) => {
    setAvailableCpfOa(value);
    clearPaymentOverrides();
  };

  const handleMonthlyDebtPaymentsChange = (value: number | null) => {
    setMonthlyDebtPayments(value);
    clearPaymentOverrides();
  };

  const handleMonthlyPropertyLoanPaymentsChange = (value: number | null) => {
    setMonthlyPropertyLoanPayments(value);
    clearPaymentOverrides();
  };

  const handleBankThereafterRateChange = (value: number | null) => {
    setBankThereafterRate(value);
    clearPaymentOverrides();
  };

  const handleAgeForLoanRulesChange = (value: number | null) => {
    setAgeForLoanRules(value);
    clearPaymentOverrides();
  };

  const handleOutstandingHousingLoansChange = (value: 0 | 1 | 2 | null) => {
    setOutstandingHousingLoans(value);
    clearPaymentOverrides();
  };

  const handleEhgModeChange = (value: EhgMode) => {
    setEhgMode(value);
    clearPaymentOverrides();
  };

  const handleEhgAssessedIncomeChange = (value: number | null) => {
    setEhgAssessedIncome(value);
    clearPaymentOverrides();
  };

  const handleEhgConfirmedAmountChange = (value: number | null) => {
    setEhgConfirmedAmount(value);
    clearPaymentOverrides();
  };

  const handleEhgFamilyEligibilityConfirmedChange = (value: boolean) => {
    setEhgFamilyEligibilityConfirmed(value);
    clearPaymentOverrides();
  };

  const handleToggleMilestoneComplete = (id: string) => {
    setCompletedMilestones((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const handleApplicationMonthChange = (value: string) => {
    const parsed = parseLaunchMonthInput(value);
    if (parsed && isSupportedApplicationMonth(parsed)) {
      setApplicationMonth(parsed);
      setConfirmedMilestoneDates({});
    }
  };

  const handleMilestoneDateChange = (id: string, value: string) => {
    setConfirmedMilestoneDates((current) => {
      const next = { ...current };

      if (value) {
        next[id] = value;
      } else {
        delete next[id];
      }

      return next;
    });
  };

  const handlePaymentOverrideChange = (
    id: string,
    override: TimelinePaymentOverride
  ) => {
    if (
      !Number.isFinite(override.total) ||
      !Number.isFinite(override.cash) ||
      !Number.isFinite(override.cpf) ||
      override.total < 0 ||
      override.cash < 0 ||
      override.cpf < 0 ||
      override.total > FLAT_MAX * 2
    ) {
      return;
    }
    const payment = timeline.find((item) => item.id === id)?.payment;
    const requiredCash = Math.min(
      payment?.minimumCash ?? 0,
      override.total
    );
    const otherSourceTotals = timeline.reduce(
      (totals, item) => {
        if (!item.payment || item.id === id) return totals;
        const activeOverride = activePaymentOverrides[item.id];
        return {
          cash:
            totals.cash +
            (activeOverride?.cash ?? item.payment.cash),
          cpf:
            totals.cpf +
            (activeOverride?.cpf ?? item.payment.cpfOa),
        };
      },
      { cash: 0, cpf: 0 }
    );
    const constrained = constrainPaymentFunding({
      total: override.total,
      requestedCash: override.cash,
      minimumCash: requiredCash,
      otherCash: otherSourceTotals.cash,
      otherCpf: otherSourceTotals.cpf,
      availableCash: availableCash ?? 0,
      availableCpf: availableCpfOa ?? 0,
    });
    if (!constrained) return;
    const { cash } = constrained;
    setPaymentOverrides((current) => ({
      ...current,
      [id]: {
        total: override.total,
        cash,
        cpf: override.total - cash,
      },
    }));
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
      paymentOverrides: activePaymentOverrides,
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
    });

  const handleSavePlan = () => {
    try {
      const snapshot = buildCurrentSnapshot();
      savePlannerSnapshot(snapshot);
      setSavedPlanFingerprint(planFingerprint);
      setHasSavedPlan(true);
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

    if (project.id === selectedBtoProjectId) {
      setActiveTab("plan");
      return;
    }

    const hasMilestoneProgress =
      completedMilestones.length > 0 ||
      Object.keys(confirmedMilestoneDates).length > 0 ||
      Object.keys(paymentOverrides).length > 0;
    if (
      selectedBtoProjectId &&
      hasMilestoneProgress &&
      !window.confirm(
        "Replace the selected project? Your milestone confirmations, dates, and payment edits will be cleared."
      )
    ) {
      return;
    }

    const preferredVariant =
      project.flatVariants.find((variant) => variant.type === radarFlatType) ??
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
    const isHistoricalReference =
      project.status === "completed" ||
      project.status === "construction" ||
      Boolean(launchMonth && launchMonth < "2024-10");
    setApplicationMonth(
      isHistoricalReference
        ? getDefaultApplicationMonth()
        : launchMonth ?? getDefaultApplicationMonth()
    );

    setActiveTab("plan");
  };

  return (
    <div className="app-shell min-h-screen bg-hdb-bg text-heritage-navy">
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <main className="min-w-0 overflow-x-hidden px-5 pb-14 pt-24 md:px-8 lg:ml-[280px] lg:px-8 lg:pt-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1720px] space-y-8">
        {activeTab === "overview" && (
          <OverviewTab
            combinedIncome={combinedIncome}
            loanAmount={loanAmount}
            ehgGrant={ehgGrant}
            totalAffordability={totalAffordability}
            financingEstimate={financingEstimate}
            ehgAssessment={ehgAssessment}
            selectedProject={selectedBtoProject}
            flatType={flatType}
            flatPrice={flatPrice}
            decisionScore={selectedDecisionScore}
            completedMilestoneCount={activeCompletedMilestones.length}
            totalMilestoneCount={timeline.length}
            timeline={effectiveTimeline}
            completedMilestones={activeCompletedMilestones}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === "plan" && (
          <PurchasePlanTab
            selectedProject={selectedBtoProject}
            combinedIncome={combinedIncome}
            loanAmount={loanAmount}
            ehgGrant={ehgGrant}
            totalAffordability={totalAffordability}
            financingEstimate={financingEstimate}
            ehgAssessment={ehgAssessment}
            availableCash={availableCash}
            availableCpfOa={availableCpfOa}
            monthlyDebtPayments={monthlyDebtPayments}
            monthlyPropertyLoanPayments={monthlyPropertyLoanPayments}
            bankThereafterRate={bankThereafterRate}
            ageForLoanRules={ageForLoanRules}
            outstandingHousingLoans={outstandingHousingLoans}
            ehgMode={ehgMode}
            ehgAssessedIncome={ehgAssessedIncome}
            ehgConfirmedAmount={ehgConfirmedAmount}
            ehgFamilyEligibilityConfirmed={ehgFamilyEligibilityConfirmed}
            applicationMonth={applicationMonth}
            modeledPlanTotal={flatPrice + modeledAdditionalCosts}
            flatPrice={flatPrice}
            flatType={flatType}
            financing={financing}
            scheme={scheme}
            loanTenureYears={loanTenureYears}
            loanInterestRate={loanInterestRate}
            downpaymentNote={downpaymentNote}
            timeline={effectiveTimeline}
            completedMilestones={activeCompletedMilestones}
            confirmedMilestoneDates={activeConfirmedMilestoneDates}
            paymentOverrides={activePaymentOverrides}
            planStorageStatus={displayedPlanStorageStatus}
            planStorageError={planStorageError}
            onIncomeChange={handleIncomeChange}
            onFlatPriceChange={handleFlatPriceChange}
            onFlatTypeChange={handleFlatTypeChange}
            onFinancingChange={handleFinancingChange}
            onSchemeChange={handleSchemeChange}
            onLoanTenureChange={handleLoanTenureChange}
            onLoanInterestRateChange={handleLoanInterestRateChange}
            onSavePlan={handleSavePlan}
            onToggleMilestoneComplete={handleToggleMilestoneComplete}
            onMilestoneDateChange={handleMilestoneDateChange}
            onPaymentOverrideChange={handlePaymentOverrideChange}
            onAvailableCashChange={handleAvailableCashChange}
            onAvailableCpfOaChange={handleAvailableCpfOaChange}
            onMonthlyDebtPaymentsChange={handleMonthlyDebtPaymentsChange}
            onMonthlyPropertyLoanPaymentsChange={
              handleMonthlyPropertyLoanPaymentsChange
            }
            onBankThereafterRateChange={handleBankThereafterRateChange}
            onAgeForLoanRulesChange={handleAgeForLoanRulesChange}
            onOutstandingHousingLoansChange={
              handleOutstandingHousingLoansChange
            }
            onEhgModeChange={handleEhgModeChange}
            onEhgAssessedIncomeChange={handleEhgAssessedIncomeChange}
            onEhgConfirmedAmountChange={handleEhgConfirmedAmountChange}
            onEhgFamilyEligibilityConfirmedChange={
              handleEhgFamilyEligibilityConfirmedChange
            }
            onApplicationMonthChange={handleApplicationMonthChange}
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
            scoringProjects={scoringProjects}
            selectedFlatType={radarFlatType}
            totalAffordability={scoreableRadarBudget}
            cashSigningRate={
              minimumCashRate === null ||
              (financing === "bank" &&
                financingEstimate.ltvLimit !== 0.75 &&
                financingEstimate.ltvLimit !== 0.55)
                ? null
                : downpaymentRule.minCashSigning
            }
            scorePreset={btoScorePreset}
            scoreWeights={btoScoreWeights}
            onScorePresetChange={handleBtoScorePresetChange}
            onScoreWeightsChange={setBtoScoreWeights}
            onRetry={handleRetryBto}
            onYearFilterChange={handleYearFilterChange}
            onTownQueryChange={handleTownQueryChange}
            onFlatTypeChange={setRadarFlatType}
            selectedProjectId={selectedBtoProjectId}
            onSelectProject={handleSelectBtoProject}
            onResetFilters={handleResetBtoFilters}
          />
        )}

        {activeTab === "sources" && (
          <SourcesTab
            datasetGeneratedAt={btoGeneratedAt}
            projectCount={btoProjects.length}
          />
        )}
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

function getInitialTab(): TabKey {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tab === "plan" || tab === "bto" || tab === "sources" || tab === "overview" ? tab : "overview";
}

function getLoanTenureMax(financing: FinancingType) {
  return financing === "hdb" ? HDB_LOAN_TENURE_MAX : BANK_LOAN_TENURE_MAX;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected storage error.";
}

export default App;
