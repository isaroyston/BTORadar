import { POLICY_CONFIG } from "../policies/policyConfig";
import type { FlatType, TimelineItem, TimelinePayment } from "../types";
import type { StageFunding } from "./cpfProjection";
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
  signingAmount: number;
  signingCpf: number;
  minCashSigning: number;
  keyAmount: number;
  keyCpf: number;
  optionFee: number;
  surveyFee: number;
  fireInsurance: number;
  // Funding worked out from CPF built up by each date; absent until the budget is known.
  signingFunding?: StageFunding;
  keyFunding?: StageFunding;
};

export function buildPaymentTimeline({
  applicationMonth,
  expectedTop,
  flatType,
  signingAmount,
  signingCpf,
  minCashSigning,
  keyAmount,
  keyCpf,
  optionFee,
  surveyFee,
  fireInsurance,
  signingFunding,
  keyFunding,
}: PaymentTimelineInput): TimelineItem[] {
  const start = parseMonth(applicationMonth);
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
  const key = expectedTopDate ?? fallbackKey;
  const keyDateBasis = expectedTopDate ? "expected TOP" : "default BTO offset";

  const applicationPayment: TimelinePayment = {
    label: "Application fee",
    total: POLICY_CONFIG.fees.applicationFee,
    cpfOa: 0,
    cash: POLICY_CONFIG.fees.applicationFee,
    note: "Payable in cash at application.",
  };

  const bookingPayment: TimelinePayment = {
    label: `Option fee (${flatType})`,
    total: optionFee,
    cpfOa: 0,
    cash: optionFee,
    note: "Typically payable in cash at booking.",
  };

  const agreementPayment: TimelinePayment = signingFunding
    ? {
        label: "Downpayment at signing",
        total: signingAmount,
        grant: signingFunding.grant,
        cpfOa: signingFunding.cpf,
        cash: signingFunding.cash,
        shortfall: signingFunding.uncovered,
        note: "Your grant is credited to CPF before signing, so it pays this first.",
      }
    : {
        label: "Downpayment at signing",
        total: signingAmount,
        cpfOa: signingCpf,
        cash: minCashSigning,
        note: "CPF OA usage depends on available OA balance.",
      };

  const keyPayment: TimelinePayment = keyFunding
    ? {
        label: "Downpayment at keys",
        total: keyAmount,
        grant: keyFunding.grant,
        cpfOa: keyFunding.cpf,
        cash: keyFunding.cash,
        shortfall: keyFunding.uncovered,
        note: "Paid mostly from CPF you build up while the flat is built.",
      }
    : {
        label: "Downpayment at keys",
        total: keyAmount,
        cpfOa: keyCpf,
        cash: 0,
        note: "CPF OA usage depends on available OA balance.",
      };

  const ancillaryPayment: TimelinePayment = {
    label: "Survey and fire insurance",
    total: surveyFee + fireInsurance,
    cpfOa: 0,
    cash: surveyFee + fireInsurance,
  };

  return [
    {
      label: "Application window",
      date: formatMonthYear(start),
      note: "Submit HFE and BTO application.",
      payment: applicationPayment,
    },
    {
      label: "Flat booking",
      date: formatMonthYear(booking),
      note: "Choose a unit and pay the option fee.",
      payment: bookingPayment,
    },
    {
      label: "Agreement for lease",
      date: formatMonthYear(agreement),
      note: "Sign the agreement and make CPF withdrawal.",
      payment: agreementPayment,
    },
    {
      label: "Key collection",
      date: formatMonthYear(key),
      note: `Make final payments and collect keys. Date follows ${keyDateBasis}.`,
      payment: keyPayment,
    },
    {
      label: "Post-keys fees",
      date: formatMonthYear(key),
      note: "One-off survey and fire insurance fees.",
      payment: ancillaryPayment,
    },
  ];
}
