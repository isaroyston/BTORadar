import type { BtoFlatVariant } from "./policies/policyConfig";

export type TabKey = "overview" | "plan" | "bto" | "sources";
export type FinancingType = "hdb" | "bank" | "none";
export type SchemeType = "normal" | "staggered" | "dia";
export type EhgMode = "unassessed" | "family-estimate" | "confirmed" | "none";
export type FlatType = BtoFlatVariant["type"];
export type BtoScoreMode = "buyer-fit";
export type BtoScorePreset = "balanced" | "budget" | "commute" | "faster-top" | "custom";

export type BtoScoreConfidence = "Strong data" | "Partial data" | "Limited data";

export type BtoScoreComponentKey =
  | "affordability"
  | "commute"
  | "centrality"
  | "wait"
  | "supply";

export type BtoScoreComponent = {
  key: BtoScoreComponentKey;
  label: string;
  score: number;
  weight: number;
  reason: string;
};

export type BtoDecisionScore = {
  total: number | null;
  mode: BtoScoreMode;
  preset: BtoScorePreset;
  label: string;
  confidence: BtoScoreConfidence;
  coverage: number;
  components: BtoScoreComponent[];
  missingFields: string[];
  reasons: string[];
};

export type TimelinePayment = {
  label: string;
  total: number;
  cpfOa: number;
  cash: number;
  grant?: number;
  unallocated?: number;
  minimumCash?: number;
  minimumCashShortfall?: number;
  fundingLocked?: boolean;
  note?: string;
};

export type TimelinePaymentOverride = {
  total: number;
  cpf: number;
  cash: number;
};

export type TimelineItem = {
  id:
    | "application"
    | "booking"
    | "agreement"
    | "agreement-fees"
    | "keys"
    | "key-fees";
  label: string;
  date: string;
  note: string;
  payment?: TimelinePayment;
};
