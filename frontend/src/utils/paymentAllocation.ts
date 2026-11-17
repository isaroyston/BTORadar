export type PaymentStageRequirement = {
  total: number;
  minimumCash: number;
  cashOnly?: boolean;
  allowsGrant?: boolean;
  allowsCpf?: boolean;
  fundingPriority?: number;
};

export type PaymentStageAllocation = {
  total: number;
  cash: number;
  cpfOa: number;
  grant: number;
  unallocated: number;
  minimumCash: number;
  minimumCashShortfall: number;
};

export function constrainPaymentFunding({
  total,
  requestedCash,
  minimumCash,
  otherCash,
  otherCpf,
  availableCash,
  availableCpf,
}: {
  total: number;
  requestedCash: number;
  minimumCash: number;
  otherCash: number;
  otherCpf: number;
  availableCash: number;
  availableCpf: number;
}) {
  if (
    ![
      total,
      requestedCash,
      minimumCash,
      otherCash,
      otherCpf,
      availableCash,
      availableCpf,
    ].every((value) => Number.isFinite(value) && value >= 0)
  ) {
    return null;
  }

  const cashCapacity = Math.max(availableCash - otherCash, 0);
  const cpfCapacity = Math.max(availableCpf - otherCpf, 0);
  const minimumFeasibleCash = Math.max(
    Math.min(minimumCash, total),
    total - cpfCapacity,
    0
  );
  const maximumFeasibleCash = Math.min(total, cashCapacity);
  if (minimumFeasibleCash > maximumFeasibleCash + 0.01) return null;

  const cash = Math.min(
    maximumFeasibleCash,
    Math.max(requestedCash, minimumFeasibleCash)
  );
  return { cash, cpf: total - cash };
}

/**
 * Allocates the buyer-funded purchase settlement in chronological order.
 * Unknown balances are not allocated and any uncovered amount remains
 * explicitly unallocated. Mandatory cash is reserved before discretionary
 * cash, while an insufficient balance is tracked as a cash shortfall.
 */
export function allocatePaymentStages({
  stages,
  availableCash,
  availableCpfOa,
  grantAmount,
}: {
  stages: PaymentStageRequirement[];
  availableCash: number | null;
  availableCpfOa: number | null;
  grantAmount: number | null;
}): PaymentStageAllocation[] {
  const normalizedStages = stages.map((stage) => ({
    total: Math.max(stage.total, 0),
    minimumCash: Math.min(
      Math.max(stage.minimumCash, 0),
      Math.max(stage.total, 0)
    ),
    cashOnly: stage.cashOnly === true,
    allowsGrant: stage.cashOnly !== true && stage.allowsGrant !== false,
    allowsCpf: stage.cashOnly !== true && stage.allowsCpf !== false,
    fundingPriority: stage.fundingPriority ?? 0,
  }));
  let cashRemaining = Math.max(availableCash ?? 0, 0);
  let cpfRemaining = availableCpfOa;
  let grantRemaining = grantAmount;
  const mandatoryCashAllocations = normalizedStages.map((stage) => {
    const cash = Math.min(cashRemaining, stage.minimumCash);
    cashRemaining -= cash;
    return {
      cash,
      shortfall: stage.minimumCash - cash,
    };
  });

  const remaining = normalizedStages.map(
    (stage) => stage.total - stage.minimumCash
  );
  const grants = normalizedStages.map(() => 0);
  const cpf = normalizedStages.map(() => 0);
  const discretionaryCash = normalizedStages.map(() => 0);

  normalizedStages.forEach((stage, index) => {
    if (!stage.allowsGrant) return;
    const amount = takeKnown(grantRemaining, remaining[index]);
    grants[index] = amount;
    remaining[index] -= amount;
    if (grantRemaining !== null) grantRemaining -= amount;
  });

  const fundingOrder = normalizedStages
    .map((stage, index) => ({ stage, index }))
    .sort(
      (left, right) =>
        right.stage.fundingPriority - left.stage.fundingPriority ||
        left.index - right.index
    );

  fundingOrder.forEach(({ stage, index }) => {
    if (!stage.allowsCpf) return;
    const amount = takeKnown(cpfRemaining, remaining[index]);
    cpf[index] = amount;
    remaining[index] -= amount;
    if (cpfRemaining !== null) cpfRemaining -= amount;
  });

  fundingOrder.forEach(({ stage, index }) => {
    if (stage.cashOnly) return;
    const amount = Math.min(cashRemaining, remaining[index]);
    discretionaryCash[index] = amount;
    cashRemaining -= amount;
    remaining[index] -= amount;
  });

  return normalizedStages.map((stage, index) => {
    const mandatoryCash = mandatoryCashAllocations[index];

    return {
      total: stage.total,
      cash: mandatoryCash.cash + discretionaryCash[index],
      cpfOa: cpf[index],
      grant: grants[index],
      unallocated: Math.max(
        remaining[index] + mandatoryCash.shortfall,
        0
      ),
      minimumCash: stage.minimumCash,
      minimumCashShortfall: mandatoryCash.shortfall,
    };
  });
}

function takeKnown(available: number | null, required: number) {
  if (available === null || required <= 0) return 0;
  return Math.min(Math.max(available, 0), required);
}
