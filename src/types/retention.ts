// ═══════════════════════════════════════════════
// Retention & Growth — Type Definitions
// Cross-domain: Hooked Model × Customer Success × Lifecycle Marketing
// ═══════════════════════════════════════════════

import type { BilingualText } from "./i18n";
export type { BilingualText } from "./i18n";

export interface RetentionResult {
  onboarding: OnboardingSequence;
  triggerMap: RetentionTrigger[];
  referralBlueprint: ReferralBlueprint;
  churnPlaybook: ChurnPlaybook;
  growthLoop: GrowthLoopResult;
  loyaltyStrategy: LoyaltyStrategy;
  projectedImpact: RetentionImpact;
}

export interface OnboardingStep {
  day: number;
  name: BilingualText;
  channel: "email" | "whatsapp" | "push" | "in_app";
  template: BilingualText;
  goal: BilingualText;
  emoji: string;
}

export interface OnboardingSequence {
  type: "ecommerce" | "saas" | "services" | "creator";
  steps: OnboardingStep[];
  ahaMetric: BilingualText;
  timeToValue: string;
}

export interface RetentionTrigger {
  trigger: BilingualText;
  timing: BilingualText;
  channel: string;
  action: BilingualText;
  emoji: string;
}

export interface ReferralBlueprint {
  model: "two_sided" | "one_sided" | "tiered";
  label: BilingualText;
  mechanics: BilingualText;
  reward: BilingualText;
  template: BilingualText;
  bestTiming: BilingualText;
}

export interface ChurnSignal {
  signal: BilingualText;
  risk: "critical" | "high" | "medium";
  intervention: BilingualText;
  channel: string;
}

export interface ChurnPlaybook {
  signals: ChurnSignal[];
  winbackSequence: OnboardingStep[];
  saveOffers: BilingualText[];
}

export interface GrowthLoopResult {
  type: "viral" | "content" | "paid" | "community";
  label: BilingualText;
  description: BilingualText;
  steps: BilingualText[];
  kFactor: string;
}

export interface LoyaltyStrategy {
  type: "points" | "tiers" | "cashback" | "experiential";
  label: BilingualText;
  tiers?: { name: BilingualText; threshold: string; benefit: BilingualText }[];
  recommendation: BilingualText;
}

export interface RetentionImpact {
  currentEstimatedChurn: number;
  projectedChurnReduction: number;
  ltvMultiplier: number;
  additionalRevenue: BilingualText;
}
