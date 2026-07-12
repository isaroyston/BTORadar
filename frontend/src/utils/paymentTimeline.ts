import { POLICY_CONFIG } from "../policies/policyConfig";
import type {
  FinancingType,
  FlatType,
  TimelineItem,
  TimelinePayment,
} from "../types";
import type { PaymentStageAllocation } from "./paymentAllocation";
import {
  addMonths,
  addWeeks,
  formatMonthYear,
  parseMonth,
  parseMonthYearDate,
} from "./date";

type PaymentTimelineInput = {
  applicationMonth: string;
  expectedTop?: string | null;
  flatType: FlatType;
  financing: FinancingType;
  keyFeeLabel: string;
  applicationAllocation: PaymentStageAllocation;
  bookingAllocation: PaymentStageAllocation;
  signingAllocation: PaymentStageAllocation;
  agreementFeeAllocation: PaymentStageAllocation;
  keyAllocation: PaymentStageAllocation;
  keyFeeAllocation: PaymentStageAllocation;
  keyPaymentIsUnassessed?: boolean;
};

export function buildPaymentTimeline({
  applicationMonth,
  expectedTop,
  flatType,
  financing,
  keyFeeLabel,
  applicationAllocation,
  bookingAllocation,
  signingAllocation,
  agreementFeeAllocation,
  keyAllocation,
  keyFeeAllocation,
  keyPaymentIsUnassessed = false,
}: PaymentTimelineInput): TimelineItem[] {
  const start = parseMonth(applicationMonth);
  if (!start) {
    throw new Error("Application month must use the YYYY-MM format.");
  }
  const ballot = addMonths(start, POLICY_CONFIG.defaultOffsets.ballotAfterMonths);
  const booking = addWeeks(
    ballot,
    POLICY_CONFIG.defaultOffsets.bookingAfterBallotWeeks
  );
  const agreement = addMonths(
    booking,
    POLICY_CONFIG.defaultOffsets.agreementAfterBookingMonths
  );
  const fallbackKey = addMonths(
    booking,
    POLICY_CONFIG.defaultOffsets.keyAfterBookingMonths
  );
  const expectedTopDate = parseMonthYearDate(expectedTop);
  const canUseExpectedTop = Boolean(
    expectedTopDate && expectedTopDate.getTime() > agreement.getTime()
  );
  const key = canUseExpectedTop && expectedTopDate ? expectedTopDate : fallbackKey;
  const keyDateBasis = canUseExpectedTop
    ? "expected TOP"
    : expectedTopDate
      ? "default BTO offset because the listed TOP is not after the agreement"
      : "default BTO offset";

  const applicationPayment: TimelinePayment = {
    label: "Application fee",
    ...toTimelinePayment(applicationAllocation),
    fundingLocked: true,
    note:
      applicationAllocation.minimumCashShortfall > 0
        ? "Payable in cash; the entered cash balance does not cover it."
        : "Payable in cash at application.",
  };

  const bookingPayment: TimelinePayment = {
    label: `Option fee (${flatType})`,
    ...toTimelinePayment(bookingAllocation),
    fundingLocked: true,
    note:
      bookingAllocation.minimumCashShortfall > 0
        ? "Payable in cash; the entered cash balance does not cover it."
        : "Payable in cash at booking.",
  };

  const agreementPayment: TimelinePayment = {
    label: "Downpayment at signing",
    ...toTimelinePayment(signingAllocation),
    note:
      signingAllocation.unallocated > 0
        ? "Part of this payment is unallocated until you enter enough CPF OA or cash."
        : "Allocation uses the CPF OA, EHG and cash entered in your assumptions.",
  };

  const keyPayment: TimelinePayment = {
    label: keyPaymentIsUnassessed
      ? "Unassessed settlement at keys"
      : "Estimated buyer payment at keys",
    ...toTimelinePayment(keyAllocation),
    note: keyPaymentIsUnassessed
      ? "The full remaining settlement is shown; the loan and buyer-funded split is not assessed yet."
      : financing === "none"
        ? "No housing loan is included; this is the remaining buyer-funded balance."
        : keyAllocation.unallocated > 0
          ? "The assessed loan is included; part of the remaining buyer payment is still unallocated."
          : "The assessed loan is included; this is the remaining buyer-funded settlement.",
  };

  const agreementFeePayment: TimelinePayment = {
    label: "Buyer’s Stamp Duty estimate",
    ...toTimelinePayment(agreementFeeAllocation),
    note:
      "Deterministic BSD estimate based on the target price; ABSD and legal fees are not included.",
  };

  const ancillaryPayment: TimelinePayment = {
    label: keyFeeLabel,
    ...toTimelinePayment(keyFeeAllocation),
    note:
      keyFeeAllocation.minimumCashShortfall > 0
        ? "The entered cash balance does not cover the cash-only portion; eligible survey, registration and deed-duty amounts may use CPF OA."
        : "Eligible survey, registration and deed-duty amounts are allocated from CPF OA or cash; fire insurance, when shown, is cash-funded.",
  };

  return [
    {
      id: "application",
      label: "Application window",
      date: formatMonthYear(start),
      note: "Submit HFE and BTO application.",
      payment: applicationPayment,
    },
    {
      id: "booking",
      label: "Flat booking",
      date: formatMonthYear(booking),
      note: "Choose a unit and pay the option fee.",
      payment: bookingPayment,
    },
    {
      id: "agreement",
      label: "Agreement for lease",
      date: formatMonthYear(agreement),
      note: "Sign the agreement and make CPF withdrawal.",
      payment: agreementPayment,
    },
    {
      id: "agreement-fees",
      label: "Stamp duty after agreement",
      date: formatMonthYear(agreement),
      note: "Pay BSD within the applicable stamping deadline after signing.",
      payment: agreementFeePayment,
    },
    {
      id: "keys",
      label: "Key collection",
      date: formatMonthYear(key),
      note: `Make final payments and collect keys. Timing is estimated from ${keyDateBasis}; HDB confirms the actual appointment.`,
      payment: keyPayment,
    },
    {
      id: "key-fees",
      label: "Key collection fees",
      date: formatMonthYear(key),
      note: `${keyFeeLabel} are modelled around key collection.`,
      payment: ancillaryPayment,
    },
  ];
}

function toTimelinePayment(
  allocation: PaymentStageAllocation
): Pick<
  TimelinePayment,
  | "total"
  | "cpfOa"
  | "cash"
  | "grant"
  | "unallocated"
  | "minimumCash"
  | "minimumCashShortfall"
> {
  return {
    total: allocation.total,
    cpfOa: allocation.cpfOa,
    cash: allocation.cash,
    grant: allocation.grant,
    unallocated: allocation.unallocated,
    minimumCash: allocation.minimumCash,
    minimumCashShortfall: allocation.minimumCashShortfall,
  };
}
