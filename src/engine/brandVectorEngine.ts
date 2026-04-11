// ═══════════════════════════════════════════════
// Brand-Neuro Matching Engine
// Cross-domain: Branding × Psychology × Neuroscience
// ═══════════════════════════════════════════════

import { FormData, FunnelResult } from "@/types/funnel";
import { captureTrainingPair } from "./trainingDataEngine";

export const ENGINE_MANIFEST = {
  name: "brandVectorEngine",
  reads: ["CAMPAIGN-funnel-*"],
  writes: ["USER-brand-vector-*"],
  stage: "diagnose" as const,
  isLive: true,
  parameters: ["Brand vector analysis"],
} as const;

export type BrandVector = "cortisol" | "oxytocin" | "dopamine";

export interface BrandVectorResult {
  primaryVector: BrandVector;
  vectorDistribution: { cortisol: number; oxytocin: number; dopamine: number }; // percentages, sum = 100
  brandLabel: { he: string; en: string };
  funnelAlignment: number; // 0-100 (how aligned funnel is with brand)
  mismatch: { he: string; en: string } | null;
  rebalanceTips: { he: string; en: string }[];
}

const VECTOR_LABELS: Record<BrandVector, { he: string; en: string }> = {
  cortisol: { he: "מותג דחיפות (Cortisol-Forward)", en: "Urgency Brand (Cortisol-Forward)" },
  oxytocin: { he: "מותג אמון (Oxytocin-Forward)", en: "Trust Brand (Oxytocin-Forward)" },
  dopamine: { he: "מותג צמיחה (Dopamine-Forward)", en: "Growth Brand (Dopamine-Forward)" },
};

export function analyzeBrandVector(result: FunnelResult): BrandVectorResult {
  const formData = result.formData;

  // Detect primary brand vector from form data
  const dist = detectDistribution(formData);
  const primary = dist.cortisol >= dist.oxytocin && dist.cortisol >= dist.dopamine ? "cortisol"
    : dist.oxytocin >= dist.dopamine ? "oxytocin" : "dopamine";

  // Analyze funnel alignment
  const funnelDist = analyzeFunnelDistribution(result);
  const alignment = calculateAlignment(dist, funnelDist);

  // Detect mismatch
  const mismatch = alignment < 60 ? detectMismatch(primary, funnelDist) : null;

  const output: BrandVectorResult = {
    primaryVector: primary,
    vectorDistribution: dist,
    brandLabel: VECTOR_LABELS[primary],
    funnelAlignment: alignment,
    mismatch,
    rebalanceTips: getRebalanceTips(primary, funnelDist, alignment),
  };

  // Fire-and-forget training capture
  void captureTrainingPair("brand_vector", { formData }, output).catch(() => {});

  return output;
}

function detectDistribution(formData: FormData): { cortisol: number; oxytocin: number; dopamine: number } {
  let cortisol = 20, oxytocin = 40, dopamine = 40; // defaults: balanced trust-growth

  // Industry adjustments
  if (formData.businessField === "health" || formData.businessField === "services") {
    oxytocin += 20; cortisol -= 10; // trust-heavy
  }
  if (formData.businessField === "tech" || formData.businessField === "education") {
    dopamine += 15; cortisol -= 5; // growth-heavy
  }
  if (formData.businessField === "fashion" || formData.businessField === "food") {
    cortisol += 15; dopamine += 5; oxytocin -= 10; // urgency + reward
  }
  if (formData.businessField === "realEstate") {
    cortisol += 20; oxytocin += 10; dopamine -= 15; // scarcity + trust
  }

  // Goal adjustments
  if (formData.mainGoal === "sales") { cortisol += 10; dopamine += 5; }
  if (formData.mainGoal === "loyalty") { oxytocin += 15; cortisol -= 10; }
  if (formData.mainGoal === "awareness") { dopamine += 10; oxytocin += 5; }

  // Audience adjustments
  if (formData.audienceType === "b2b") { oxytocin += 10; cortisol -= 5; }

  // Normalize to 100
  const total = cortisol + oxytocin + dopamine;
  return {
    cortisol: Math.round((cortisol / total) * 100),
    oxytocin: Math.round((oxytocin / total) * 100),
    dopamine: Math.round((dopamine / total) * 100),
  };
}

function analyzeFunnelDistribution(result: FunnelResult): { cortisol: number; oxytocin: number; dopamine: number } {
  // Analyze stages for vector distribution
  let cortisol = 0, oxytocin = 0, dopamine = 0;

  for (const stage of result.stages) {
    if (stage.id === "awareness") { dopamine += 30; oxytocin += 10; }
    if (stage.id === "engagement") { oxytocin += 30; dopamine += 10; }
    if (stage.id === "leads") { cortisol += 20; oxytocin += 15; }
    if (stage.id === "conversion") { cortisol += 35; dopamine += 10; }
    if (stage.id === "retention") { oxytocin += 25; dopamine += 15; }
  }

  const total = cortisol + oxytocin + dopamine;
  return {
    cortisol: Math.round((cortisol / total) * 100),
    oxytocin: Math.round((oxytocin / total) * 100),
    dopamine: Math.round((dopamine / total) * 100),
  };
}

function calculateAlignment(brand: { cortisol: number; oxytocin: number; dopamine: number }, funnel: { cortisol: number; oxytocin: number; dopamine: number }): number {
  const diff = Math.abs(brand.cortisol - funnel.cortisol) + Math.abs(brand.oxytocin - funnel.oxytocin) + Math.abs(brand.dopamine - funnel.dopamine);
  return Math.max(0, Math.round(100 - diff));
}

function detectMismatch(primary: BrandVector, funnelDist: { cortisol: number; oxytocin: number; dopamine: number }): { he: string; en: string } | null {
  if (primary === "oxytocin" && funnelDist.cortisol > 40) {
    return { he: "המותג שלך בנוי על אמון, אבל המשפך אגרסיבי מדי (60%+ קורטיזול). סיכון: reactance", en: "Your brand is trust-based, but the funnel is too aggressive (60%+ cortisol). Risk: reactance" };
  }
  if (primary === "dopamine" && funnelDist.oxytocin > 50) {
    return { he: "המותג שלך בנוי על חדשנות, אבל המשפך שמרני מדי. חסר: FOMO, גלויות, ניסוי", en: "Your brand is innovation-based, but the funnel is too conservative. Missing: FOMO, boldness, experimentation" };
  }
  if (primary === "cortisol" && funnelDist.oxytocin > 50) {
    return { he: "המותג שלך בנוי על דחיפות, אבל המשפך רך מדי. חסר: scarcity, deadlines, urgency", en: "Your brand is urgency-based, but the funnel is too soft. Missing: scarcity, deadlines, urgency" };
  }
  return null;
}

function getRebalanceTips(primary: BrandVector, funnelDist: { cortisol: number; oxytocin: number; dopamine: number }, alignment: number): { he: string; en: string }[] {
  if (alignment >= 80) {
    return [{ he: "המותג והמשפך מסונכרנים מצוין! שמור על האיזון הזה", en: "Brand and funnel are excellently synced! Maintain this balance" }];
  }

  const tips: { he: string; en: string }[] = [];
  if (primary === "oxytocin" && funnelDist.cortisol > 30) {
    tips.push({ he: "החלף 'מהרו!' ב-'הצטרפו למשפחה'. אמון > דחיפות למותג שלך", en: "Replace 'Hurry!' with 'Join the family'. Trust > urgency for your brand" });
    tips.push({ he: "הוסף עדויות לקוחות לכל שלב במשפך", en: "Add client testimonials to every funnel stage" });
  }
  if (primary === "dopamine" && funnelDist.cortisol > 30) {
    tips.push({ he: "הדגש 'מה חדש' ו-'מה תגלה' במקום 'מה תפסיד'", en: "Emphasize 'what's new' and 'what you'll discover' instead of 'what you'll lose'" });
    tips.push({ he: "הוסף גיימיפיקציה: progress bar, badges, unlockable content", en: "Add gamification: progress bar, badges, unlockable content" });
  }
  if (primary === "cortisol" && funnelDist.oxytocin > 40) {
    tips.push({ he: "הוסף countdown timers ו-'X מקומות נותרו' לכל CTA", en: "Add countdown timers and 'X spots remaining' to every CTA" });
    tips.push({ he: "השתמש ב-negative reverse: 'אולי זה לא בשבילך' — מפעיל reactance חיובי", en: "Use negative reverse: 'Maybe this isn't for you' — triggers positive reactance" });
  }

  if (tips.length === 0) {
    tips.push({ he: "שפר את ההתאמה בין המותג למשפך — בדוק שהטון עקבי", en: "Improve brand-funnel alignment — ensure consistent tone" });
  }

  return tips;
}
