import type { UnifiedProfile } from "@/types/profile";
import type { BusinessField } from "@/types/funnel";

export const ENGINE_MANIFEST = {
  name: "businessFingerprintEngine",
  reads: ["USER-profile-*"],
  writes: ["USER-fingerprint-*"],
  stage: "discover" as const,
  isLive: true,
  parameters: ["Business DNA fingerprint"],
} as const;

export type BusinessArchetype =
  | "premium-b2b-saas"
  | "b2b-professional-services"
  | "b2b-enterprise"
  | "local-b2c-service"
  | "b2c-ecommerce"
  | "b2c-subscription"
  | "creator-economy"
  | "marketplace"
  | "high-ticket-b2c"
  | "general";

export interface FingerprintDimensions {
  priceComplexity: number;
  salesCycleLength: number;
  competitiveIntensity: number;
  customerLifetimeValue: number;
  acquisitionComplexity: number;
  brandDependency: number;
}

export interface FingerprintUX {
  terminology: "b2b" | "b2c" | "creator";
  complexity: "simple" | "standard" | "advanced";
  framingPreference: "loss" | "gain" | "balanced";
  emphasisTabs: string[];
  simplifiedTabs: string[];
}

export interface BusinessFingerprint {
  archetype: BusinessArchetype;
  marketMode: "b2b" | "b2c" | "hybrid";
  growthStage: "pre-launch" | "early" | "growth" | "mature";
  dimensions: FingerprintDimensions;
  ux: FingerprintUX;
}

const ARCHETYPE_RULES: { match: (p: UnifiedProfile) => boolean; archetype: BusinessArchetype }[] = [
  { match: p => p.businessField === "tech" && p.audienceType === "b2b" && p.salesModel === "subscription", archetype: "premium-b2b-saas" },
  { match: p => p.businessField === "tech" && p.audienceType === "b2b", archetype: "b2b-enterprise" },
  { match: p => p.businessField === "services" && p.audienceType === "b2b", archetype: "b2b-professional-services" },
  { match: p => p.audienceType === "b2b" && p.pricePositioning >= 70, archetype: "b2b-enterprise" },
  { match: p => p.businessField === "personalBrand", archetype: "creator-economy" },
  { match: p => p.audienceType === "b2c" && p.salesModel === "subscription", archetype: "b2c-subscription" },
  { match: p => p.businessField === "fashion" || p.businessField === "food", archetype: "b2c-ecommerce" },
  { match: p => p.audienceType === "b2c" && p.pricePositioning >= 70, archetype: "high-ticket-b2c" },
  { match: p => (p.businessField === "health" || p.businessField === "services") && p.audienceType === "b2c", archetype: "local-b2c-service" },
];

function detectArchetype(p: UnifiedProfile): BusinessArchetype {
  for (const rule of ARCHETYPE_RULES) {
    if (rule.match(p)) return rule.archetype;
  }
  return "general";
}

function detectMarketMode(p: UnifiedProfile): "b2b" | "b2c" | "hybrid" {
  if (p.audienceType === "both") return "hybrid";
  return p.audienceType === "b2b" ? "b2b" : "b2c";
}

function detectGrowthStage(p: UnifiedProfile): BusinessFingerprint["growthStage"] {
  const score = (p.marketMaturity * 0.4) + (p.teamSize * 0.3) + (p.budgetCapacity * 0.3);
  if (score < 20) return "pre-launch";
  if (score < 40) return "early";
  if (score < 70) return "growth";
  return "mature";
}

function computeDimensions(p: UnifiedProfile): FingerprintDimensions {
  const isB2B = p.audienceType === "b2b";

  return {
    priceComplexity: clamp((p.pricePositioning * 0.6) + (isB2B ? 20 : 0) + (p.salesModel === "subscription" ? 10 : 0)),
    salesCycleLength: clamp(isB2B ? 40 + p.pricePositioning * 0.4 : 10 + p.pricePositioning * 0.2),
    competitiveIntensity: clamp(p.competitiveIntensity),
    customerLifetimeValue: clamp(
      p.salesModel === "subscription" ? 60 + p.pricePositioning * 0.3 :
      isB2B ? 40 + p.pricePositioning * 0.4 :
      20 + p.pricePositioning * 0.3
    ),
    acquisitionComplexity: clamp(
      (isB2B ? 30 : 0) + p.pricePositioning * 0.3 + p.competitiveIntensity * 0.3
    ),
    brandDependency: clamp(
      p.businessField === "personalBrand" ? 90 :
      p.businessField === "fashion" ? 70 :
      isB2B ? 30 + p.teamSize * 0.2 :
      40 + p.marketMaturity * 0.2
    ),
  };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v))) / 100;
}

function deriveUX(p: UnifiedProfile, archetype: BusinessArchetype, dims: FingerprintDimensions): FingerprintUX {
  const terminology: FingerprintUX["terminology"] =
    archetype === "creator-economy" ? "creator" :
    p.audienceType === "b2b" ? "b2b" : "b2c";

  const first = p.valuePriorities[0];
  const complexity: FingerprintUX["complexity"] =
    first === "innovation" || p.experienceLevel === "advanced" ? "advanced" :
    first === "quality" || p.experienceLevel === "intermediate" ? "standard" : "simple";

  const framingPreference: FingerprintUX["framingPreference"] =
    dims.competitiveIntensity > 0.7 || p.mainGoal === "loyalty" ? "loss" :
    p.mainGoal === "awareness" || archetype === "creator-economy" ? "gain" : "balanced";

  const emphasisTabs = deriveEmphasisTabs(p, archetype);
  const simplifiedTabs = complexity === "simple"
    ? ["analytics", "branddna", "stylome", "pricing", "retention"]
    : complexity === "standard" ? ["analytics"] : [];

  return { terminology, complexity, framingPreference, emphasisTabs, simplifiedTabs };
}

function deriveEmphasisTabs(p: UnifiedProfile, archetype: BusinessArchetype): string[] {
  const tabs: string[] = ["strategy"];

  if (p.mainGoal === "sales" || p.mainGoal === "leads") tabs.push("sales", "planning");
  if (p.mainGoal === "awareness") tabs.push("content");
  if (p.mainGoal === "loyalty" || p.salesModel === "subscription") tabs.push("retention");
  if (archetype === "creator-economy" || p.businessField === "personalBrand") tabs.push("branddna", "content");
  if (archetype === "premium-b2b-saas" || archetype === "b2b-enterprise") tabs.push("pricing", "sales");

  return [...new Set(tabs)];
}

export function computeFingerprint(profile: UnifiedProfile): BusinessFingerprint {
  const archetype = detectArchetype(profile);
  const marketMode = detectMarketMode(profile);
  const growthStage = detectGrowthStage(profile);
  const dimensions = computeDimensions(profile);
  const ux = deriveUX(profile, archetype, dimensions);

  return { archetype, marketMode, growthStage, dimensions, ux };
}

export const DIMENSION_LABELS: Record<keyof FingerprintDimensions, { he: string; en: string }> = {
  priceComplexity: { he: "מורכבות מחיר", en: "Price Complexity" },
  salesCycleLength: { he: "אורך מחזור מכירה", en: "Sales Cycle" },
  competitiveIntensity: { he: "עוצמת תחרות", en: "Competition" },
  customerLifetimeValue: { he: "ערך לקוח", en: "Customer LTV" },
  acquisitionComplexity: { he: "מורכבות רכישה", en: "Acquisition" },
  brandDependency: { he: "תלות מותג", en: "Brand Dependency" },
};

export const ARCHETYPE_LABELS: Record<BusinessArchetype, { he: string; en: string }> = {
  "premium-b2b-saas": { he: "SaaS B2B פרימיום", en: "Premium B2B SaaS" },
  "b2b-professional-services": { he: "שירותים מקצועיים B2B", en: "B2B Professional Services" },
  "b2b-enterprise": { he: "ארגוני B2B", en: "B2B Enterprise" },
  "local-b2c-service": { he: "שירות מקומי B2C", en: "Local B2C Service" },
  "b2c-ecommerce": { he: "מסחר אלקטרוני B2C", en: "B2C E-commerce" },
  "b2c-subscription": { he: "מנוי B2C", en: "B2C Subscription" },
  "creator-economy": { he: "כלכלת יוצרים", en: "Creator Economy" },
  "marketplace": { he: "שוק / פלטפורמה", en: "Marketplace" },
  "high-ticket-b2c": { he: "B2C פרימיום", en: "High-Ticket B2C" },
  "general": { he: "כללי", en: "General" },
};
