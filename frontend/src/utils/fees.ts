const BSD_BANDS = [
  { width: 180000, rate: 0.01 },
  { width: 180000, rate: 0.02 },
  { width: 640000, rate: 0.03 },
  { width: 500000, rate: 0.04 },
  { width: 1500000, rate: 0.05 },
  { width: Number.POSITIVE_INFINITY, rate: 0.06 },
] as const;

export function calculateBuyerStampDuty(purchasePrice: number) {
  let remaining = Math.max(purchasePrice, 0);
  let duty = 0;

  for (const band of BSD_BANDS) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, band.width);
    duty += taxable * band.rate;
    remaining -= taxable;
  }

  return Math.floor(duty);
}

export function calculateDeedOfAssignmentStampDuty(loanAmount: number) {
  return Math.min(Math.floor(Math.max(loanAmount, 0) * 0.004), 500);
}
