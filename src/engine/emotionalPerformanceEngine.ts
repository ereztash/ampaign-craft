// ═══════════════════════════════════════════════
// Emotional Performance Score (EPS) Engine
// The signature MOAT analytic: synthesizes 4 behavioral
// signals into a single 0-100 emotional health score.
// ═══════════════════════════════════════════════

import type { CopyQAResult } from "./copyQAEngine";
import type { BrandVectorResult } from "./brandVectorEngine";
import type { DISCProfile } from "./discProfileEngine";
import type { StylomeProfile } from "./stylomeEngine";

export type EmotionType = "cortisol" | "oxytocin" | "dopamine";

export interface EmotionalBalance {
  cortisol: number; // 0-100
  oxytocin: number; // 0-100
  dopamine: number; // 0-100
}

export interface ChannelEPS {
  channel: string;
  score: number;
  dominantEmotion: EmotionType;
}

export interface EPSResult {
  score: number; // 0-100
  emotionalBalance: EmotionalBalance;
  dominantEmotion: EmotionType;
  discAlignment: number; // 0-100
  channelBreakdown: ChannelEPS[];
  recommendations: { he: string; en: string }[];
  components: {
    copyQuality: number;     // 0-100, weight 30%
    brandAlignment: number;  // 0-100, weight 25%
    discAlignment: number;   // 0-100, weight 25%
    stylomeAuthenticity: number; // 0-100, weight 20%
  };
  trend?: { previousScore: number; delta: number };
}

// ───────────────────────────────────────────────
// Scoring helpers
// ───────────────────────────────────────────────

function pickDominant(balance: EmotionalBalance): EmotionType {
  if (balance.cortisol >= balance.oxytocin && balance.cortisol >= balance.dopamine) return "cortisol";
  if (balance.oxytocin >= balance.dopamine) return "oxytocin";
  return "dopamine";
}

function scoreDISCAlignment(
  disc: DISCProfile | undefined,
  balance: EmotionalBalance,
): number {
  if (!disc) return 50;

  // D profiles thrive on cortisol-forward urgency and dopamine-forward progression.
  // I profiles thrive on oxytocin (community) + dopamine (novelty).
  // S profiles thrive on oxytocin dominance.
  // C profiles thrive on a balanced, data-backed mix leaning dopamine/oxytocin low-arousal.
  switch (disc.primary) {
    case "D":
      return Math.round(balance.cortisol * 0.4 + balance.dopamine * 0.4 + balance.oxytocin * 0.2);
    case "I":
      return Math.round(balance.dopamine * 0.5 + balance.oxytocin * 0.4 + balance.cortisol * 0.1);
    case "S":
      return Math.round(balance.oxytocin * 0.6 + balance.dopamine * 0.25 + balance.cortisol * 0.15);
    case "C":
      return Math.round(balance.dopamine * 0.45 + balance.oxytocin * 0.35 + balance.cortisol * 0.2);
    default:
      return 50;
  }
}

function scoreStylomeAuthenticity(stylome: StylomeProfile | undefined): number {
  if (!stylome) return 50;
  // Use burstiness + perplexity as human-authenticity proxies.
  const burst = stylome.metrics.burstiness ?? 50;
  const surprise = stylome.metrics.perplexityEstimate ?? 50;
  return Math.round(burst * 0.5 + surprise * 0.5);
}

function scoreCopyQuality(copyQA: CopyQAResult | undefined): number {
  if (!copyQA) return 50;
  return Math.max(0, Math.min(100, copyQA.score));
}

function scoreBrandAlignment(brand: BrandVectorResult | undefined): number {
  if (!brand) return 50;
  return Math.max(0, Math.min(100, brand.funnelAlignment));
}

function extractChannelBreakdown(
  copyQA: CopyQAResult | undefined,
  balance: EmotionalBalance,
): ChannelEPS[] {
  // Synthetic per-channel scoring until real multi-channel copy is available.
  const base = copyQA?.score ?? 50;
  const dominant = pickDominant(balance);
  return [
    { channel: "WhatsApp", score: Math.max(0, Math.min(100, Math.round(base * 0.9 + 10))), dominantEmotion: dominant },
    { channel: "Facebook", score: Math.max(0, Math.min(100, Math.round(base * 0.85 + 5))), dominantEmotion: dominant },
    { channel: "Instagram", score: Math.max(0, Math.min(100, Math.round(base * 0.95))), dominantEmotion: dominant },
    { channel: "Email", score: Math.max(0, Math.min(100, Math.round(base * 0.88 + 3))), dominantEmotion: dominant },
  ];
}

function buildRecommendations(
  balance: EmotionalBalance,
  dominant: EmotionType,
  copyQA: CopyQAResult | undefined,
  brand: BrandVectorResult | undefined,
): { he: string; en: string }[] {
  const recs: { he: string; en: string }[] = [];

  // Imbalance checks
  if (balance.cortisol > 60) {
    recs.push({
      he: "קורטיזול גבוה מדי — ירד ל-40% ע\"י הוספת אמון וסיפור אישי",
      en: "Cortisol too high — drop to 40% by adding trust and personal stories",
    });
  }
  if (balance.dopamine < 20) {
    recs.push({
      he: "מעט מדי דופמין — הוסף חדשנות, גילוי, ותגמול",
      en: "Dopamine too low — add novelty, discovery, and reward",
    });
  }
  if (balance.oxytocin < 20) {
    recs.push({
      he: "אמון נמוך — הוסף עדויות לקוחות, קהילה, ומחויבות",
      en: "Trust is low — add client testimonials, community, and commitment",
    });
  }

  // Copy QA red flags
  if (copyQA) {
    for (const risk of copyQA.risks.slice(0, 2)) {
      if (risk.severity === "high") recs.push(risk.fix);
    }
  }

  // Brand mismatch surfaced through EPS
  if (brand?.mismatch) recs.push(brand.mismatch);

  if (recs.length === 0) {
    recs.push({
      he: `איזון ${dominant} חזק — שמור על הטון הזה לאורך כל המשפך`,
      en: `Strong ${dominant} balance — keep this tone consistent across the funnel`,
    });
  }

  return recs.slice(0, 5);
}

// ───────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────

export function calculateEPS(
  copyQA?: CopyQAResult,
  brandVector?: BrandVectorResult,
  discProfile?: DISCProfile,
  stylome?: StylomeProfile,
  previousScore?: number,
): EPSResult {
  // Pull balance from brand vector if provided, otherwise neutral 33/33/34
  const balance: EmotionalBalance = brandVector
    ? {
        cortisol: brandVector.vectorDistribution.cortisol,
        oxytocin: brandVector.vectorDistribution.oxytocin,
        dopamine: brandVector.vectorDistribution.dopamine,
      }
    : { cortisol: 33, oxytocin: 33, dopamine: 34 };

  const dominant = pickDominant(balance);

  const copyQuality = scoreCopyQuality(copyQA);
  const brandAlignment = scoreBrandAlignment(brandVector);
  const discAlignment = scoreDISCAlignment(discProfile, balance);
  const stylomeAuthenticity = scoreStylomeAuthenticity(stylome);

  // Weighted composite
  const score = Math.round(
    copyQuality * 0.3 +
    brandAlignment * 0.25 +
    discAlignment * 0.25 +
    stylomeAuthenticity * 0.2,
  );

  const channelBreakdown = extractChannelBreakdown(copyQA, balance);
  const recommendations = buildRecommendations(balance, dominant, copyQA, brandVector);

  const result: EPSResult = {
    score: Math.max(0, Math.min(100, score)),
    emotionalBalance: balance,
    dominantEmotion: dominant,
    discAlignment,
    channelBreakdown,
    recommendations,
    components: {
      copyQuality,
      brandAlignment,
      discAlignment,
      stylomeAuthenticity,
    },
  };

  if (typeof previousScore === "number") {
    result.trend = {
      previousScore,
      delta: result.score - previousScore,
    };
  }

  return result;
}

/**
 * Verdict label for a given EPS score.
 */
export function getEPSVerdict(score: number): { he: string; en: string } {
  if (score >= 85) return { he: "מצוין — המשפך מסונכרן רגשית", en: "Excellent — funnel is emotionally aligned" };
  if (score >= 70) return { he: "טוב — יש מקום לכיוונון עדין", en: "Good — room for fine-tuning" };
  if (score >= 55) return { he: "בינוני — דרוש איזון רגשי", en: "Average — emotional balance needed" };
  if (score >= 40) return { he: "חלש — סיכון לנטישה", en: "Weak — churn risk" };
  return { he: "קריטי — שכתב את המשפך", en: "Critical — rewrite the funnel" };
}
