// ═══════════════════════════════════════════════
// B2B Differentiation Agent — Core Engine
// Pure functions for scoring, profiling, and local synthesis
// AI-dependent parts filled by Edge Function
// ═══════════════════════════════════════════════

import {
  DifferentiationFormData, DifferentiationResult, ClaimExample, GapItem,
  HiddenValueScore, ContraryMetric, HybridCategory, MechanismStatement,
  TradeoffDeclaration, NextStep, AshamedPainInsight, CompetitorArchetype,
  BuyingCommitteeRole, AiPhase2Result, AiPhase3Result, AiPhase4Result, AiPhase5Result,
} from "@/types/differentiation";
import { CONTRARY_METRICS, HYBRID_CATEGORIES, getContraryMetricsForMode } from "./differentiationKnowledge";
import { detectMarketMode } from "@/types/differentiation";

// ═══ CLAIM VERIFICATION ═══

export function scoreClaimVerification(claims: ClaimExample[]): number {
  if (claims.length === 0) return 0;
  const verified = claims.filter((c) => c.verified).length;
  const weak = claims.filter((c) => !c.verified && c.evidence.length > 0).length;
  // Verified = 100%, weak = 40%, empty = 0%
  return Math.round(((verified * 100 + weak * 40) / claims.length));
}

export function buildGapAnalysis(claims: ClaimExample[]): GapItem[] {
  return claims.map((c) => {
    if (c.verified) {
      return { claim: c.claim, status: "verified" as const, recommendation: { he: "טענה מאומתת — השתמש בה בביטחון", en: "Verified claim — use it confidently" } };
    }
    if (c.evidence.length > 0) {
      return { claim: c.claim, status: "weak" as const, recommendation: { he: "ראיה חלשה — חזק עם case study ספציפי ומספרים", en: "Weak evidence — strengthen with a specific case study and numbers" } };
    }
    return { claim: c.claim, status: "empty" as const, recommendation: { he: "אין ראיה — הפסק להשתמש בטענה הזו או בנה ראיה תוך 30 יום", en: "No evidence — stop using this claim or build evidence within 30 days" } };
  });
}

// ═══ HIDDEN VALUE PROFILE ═══

export function buildHiddenValueProfile(scores: HiddenValueScore[]): HiddenValueScore[] {
  return [...scores].sort((a, b) => b.score - a.score);
}

export function getTopHiddenValues(scores: HiddenValueScore[], count: number = 3): HiddenValueScore[] {
  return buildHiddenValueProfile(scores).slice(0, count);
}

// ═══ DIFFERENTIATION STRENGTH ═══

export function calculateDifferentiationStrength(
  claimScore: number,
  hiddenValues: HiddenValueScore[],
  hasTradeoffs: boolean,
  hasMechanism: boolean,
): number {
  let strength = 0;

  // Claim verification: 30% weight
  strength += claimScore * 0.3;

  // Hidden value clarity: 20% weight (top 3 values > 3.5 avg = strong)
  const top3Avg = getTopHiddenValues(hiddenValues).reduce((s, v) => s + v.score, 0) / Math.max(getTopHiddenValues(hiddenValues).length, 1);
  strength += (top3Avg / 5) * 20;

  // Tradeoffs declared: 20% weight
  if (hasTradeoffs) strength += 20;

  // Mechanism (not adjectives): 30% weight
  if (hasMechanism) strength += 30;

  return Math.round(Math.min(100, Math.max(0, strength)));
}

// ═══ CONTRARY METRICS SELECTION ═══

export function selectContraryMetrics(formData: DifferentiationFormData): ContraryMetric[] {
  const mode = detectMarketMode(formData.targetMarket);
  const metrics = [...getContraryMetricsForMode(mode)];

  // Prioritize based on context
  const prioritized: ContraryMetric[] = [];

  // Decision Latency always relevant for B2B
  prioritized.push(metrics[0]);

  // Customer-Initiated Introductions if premium
  if (formData.priceRange === "premium" || formData.priceRange === "enterprise") {
    prioritized.push(metrics[1]);
  }

  // Budget Expansion Rate for subscription-like B2B
  if (formData.targetMarket === "b2b_enterprise") {
    prioritized.push(metrics[2]);
  }

  // Competitive Displacement if highly competitive
  if (formData.topCompetitors.length >= 3) {
    prioritized.push(metrics[3]);
  }

  // Explanation Efficiency always useful
  prioritized.push(metrics[4]);

  // Return top 3, no duplicates
  const seen = new Set<string>();
  return prioritized.filter((m) => {
    if (seen.has(m.name.en)) return false;
    seen.add(m.name.en);
    return true;
  }).slice(0, 3);
}

// ═══ HYBRID CATEGORY SUGGESTION ═══

export function suggestHybridCategory(formData: DifferentiationFormData): HybridCategory {
  const industry = formData.industry.toLowerCase();
  const positioning = formData.currentPositioning.toLowerCase();

  // Heuristic matching
  if (industry.includes("consult") || industry.includes("ייעוץ")) {
    return { ...HYBRID_CATEGORIES[0], existingCategories: ["Consulting", "Product"], whitespace: "Advisory expertise with product scalability" };
  }
  if (industry.includes("data") || industry.includes("analytics") || industry.includes("נתונים")) {
    return { ...HYBRID_CATEGORIES[1], existingCategories: ["Data Analytics", "Storytelling"], whitespace: "Data insights delivered as narrative" };
  }
  if (industry.includes("security") || industry.includes("cyber") || industry.includes("אבטח")) {
    return { ...HYBRID_CATEGORIES[2], existingCategories: ["Security", "UX"], whitespace: "Security without friction" };
  }
  if (positioning.includes("local") || positioning.includes("ישראל") || positioning.includes("מקומי")) {
    return { ...HYBRID_CATEGORIES[4], existingCategories: ["Local Market", "Global Method"], whitespace: "Local depth with global scale" };
  }
  if (industry.includes("tech") || industry.includes("saas") || industry.includes("טכנו")) {
    return { ...HYBRID_CATEGORIES[6], existingCategories: ["Technical", "Human"], whitespace: "Engineering precision with human understanding" };
  }

  // Default: Simplicity-Complexity
  return { ...HYBRID_CATEGORIES[8], existingCategories: ["Simple Interface", "Complex Problem"], whitespace: "Accessibility for complex domains" };
}

// ═══ MAIN GENERATOR ═══

export interface AiResults {
  phase2?: AiPhase2Result;
  phase3?: AiPhase3Result;
  phase4?: AiPhase4Result;
  phase5?: AiPhase5Result;
}

export function generateDifferentiation(formData: DifferentiationFormData, aiResults: AiResults = {}): DifferentiationResult {
  // Use AI results if available, fallback to local computation
  const verifiedClaims = aiResults.phase2?.verifiedClaims || formData.claimExamples;
  const gapAnalysis = aiResults.phase2?.gapAnalysis || buildGapAnalysis(formData.claimExamples);
  const claimScore = scoreClaimVerification(verifiedClaims);

  const hiddenValueProfile = buildHiddenValueProfile(formData.hiddenValues);
  const ashamedPainInsights: AshamedPainInsight[] = aiResults.phase3?.ashamedPainInsights || [];

  const competitorMap: CompetitorArchetype[] = aiResults.phase4?.competitorMap || formData.competitorArchetypes;
  const committeeNarratives: BuyingCommitteeRole[] = aiResults.phase4?.committeeNarratives || formData.buyingCommitteeMap;

  const contraryMetrics = aiResults.phase5?.contraryMetrics || selectContraryMetrics(formData);
  const hybridCategory = aiResults.phase5?.hybridCategory || suggestHybridCategory(formData);
  const tradeoffDeclarations = aiResults.phase5?.tradeoffDeclarations || formData.confirmedTradeoffs;

  const hasMechanism = !!aiResults.phase5?.mechanismStatement?.mechanism;
  const hasTradeoffs = tradeoffDeclarations.length > 0;
  const differentiationStrength = calculateDifferentiationStrength(claimScore, hiddenValueProfile, hasTradeoffs, hasMechanism);

  const mechanismStatement: MechanismStatement = aiResults.phase5?.mechanismStatement || {
    oneLiner: { he: "", en: "" }, mechanism: "", proof: "", antiStatement: "", perRole: {},
  };

  const executiveSummary = aiResults.phase5?.executiveSummary || {
    he: `${formData.businessName}: ציון בידול ${differentiationStrength}/100. ${claimScore >= 70 ? "טענות מאומתות חזקות." : "יש פערים בראיות — נדרש חיזוק."}`,
    en: `${formData.businessName}: Differentiation score ${differentiationStrength}/100. ${claimScore >= 70 ? "Strong verified claims." : "Evidence gaps exist — strengthening needed."}`,
  };

  const nextSteps: NextStep[] = aiResults.phase5?.nextSteps || generateDefaultNextSteps(claimScore, differentiationStrength);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    formData,
    claimVerificationScore: claimScore,
    differentiationStrength,
    verifiedClaims,
    gapAnalysis,
    hiddenValueProfile,
    ashamedPainInsights,
    competitorMap,
    committeeNarratives,
    mechanismStatement,
    tradeoffDeclarations,
    hybridCategory,
    contraryMetrics,
    executiveSummary,
    nextSteps,
  };
}

function generateDefaultNextSteps(claimScore: number, strength: number): NextStep[] {
  const steps: NextStep[] = [];

  if (claimScore < 60) {
    steps.push({
      priority: "high",
      action: { he: "בנה 3 case studies עם מספרים ספציפיים כדי לאמת את טענות הבידול", en: "Build 3 case studies with specific numbers to verify differentiation claims" },
      timeframe: "30 days",
    });
  }

  if (strength < 50) {
    steps.push({
      priority: "high",
      action: { he: "הגדר mechanism statement ברור: 'אנחנו עושים X דרך Y, מה שאומר Z'", en: "Define a clear mechanism statement: 'We do X through Y, which means Z'" },
      timeframe: "14 days",
    });
  }

  steps.push({
    priority: "medium",
    action: { he: "הכן narrative מותאם לכל תפקיד בוועדת הקנייה", en: "Prepare a tailored narrative for each buying committee role" },
    timeframe: "30 days",
  });

  steps.push({
    priority: "medium",
    action: { he: "התחל למדוד לפחות 2 contrary metrics", en: "Start measuring at least 2 contrary metrics" },
    timeframe: "60 days",
  });

  return steps;
}
