// ═══════════════════════════════════════════════
// Pricing Intelligence Engine
// Cross-domain: Behavioral Economics × SaaS Pricing × Offer Architecture
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";
import {
  PricingIntelligenceResult, PricingModelRecommendation, PricingModelType,
  TierRecommendation, RecommendedTier, OfferStackRecommendation,
  GuaranteeRecommendation, PriceFramingScript, CompetitivePositionResult,
  SubscriptionEconomicsResult, BilingualText,
} from "@/types/pricing";
import { UserKnowledgeGraph, formatPrice, getFieldNameHe, getFieldNameEn } from "./userKnowledgeGraph";
import {
  applyCharmPricing, TIER_PATTERNS, PRICE_SENSITIVITY, LTV_CAC_BENCHMARKS,
  GUARANTEE_TYPES, ANNUAL_DISCOUNT, OFFER_BONUS_TEMPLATES, calculateJND,
  PRICE_FRAMING_TEMPLATES,
} from "./pricingKnowledge";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";

export const ENGINE_MANIFEST = {
  name: "pricingIntelligenceEngine",
  reads: ["USER-form-*", "USER-knowledgeGraph-*"],
  writes: ["USER-pricing-*"],
  stage: "design",
  isLive: true,
  parameters: ["Pricing intelligence"],
} as const;

// ═══ MAIN GENERATOR ═══

export function generatePricingIntelligence(
  formData: FormData,
  graph: UserKnowledgeGraph,
  blackboardCtx?: BlackboardWriteContext,
): PricingIntelligenceResult {
  const input = extractInput(formData, graph);
  const model = recommendPricingModel(input);
  const tiers = generateTierStructure(input, model);
  const offerStack = buildOfferStack(input, graph);
  const guarantee = designGuarantee(input, graph);
  const scripts = generatePriceFramingScripts(input, graph);
  const position = analyzeCompetitivePosition(input);
  const subEconomics = input.salesModel === "subscription" ? calculateSubscriptionEconomics(input) : null;
  const nextSteps = generateNextSteps(input, model, tiers);

  const result: PricingIntelligenceResult = {
    pricingModel: model,
    tierStructure: tiers,
    offerStack,
    guarantee,
    priceFramingScripts: scripts,
    competitivePosition: position,
    subscriptionEconomics: subEconomics,
    nextSteps,
  };

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("USER", "pricing", blackboardCtx.planId ?? blackboardCtx.userId),
      stage: "design",
      payload: {
        pricingModelType: model.model,
        tierCount: tiers.tiers.length,
      },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return result;
}

function extractInput(formData: FormData, graph: UserKnowledgeGraph) {
  return {
    industry: formData.businessField || "other",
    audience: (formData.audienceType || "b2c") as "b2c" | "b2b" | "both",
    currentPrice: formData.averagePrice || 0,
    salesModel: (formData.salesModel || "oneTime") as "oneTime" | "subscription" | "leads",
    differentiationStrength: graph.differentiation ? 70 : 30,
    experienceLevel: formData.experienceLevel || "intermediate",
    goal: formData.mainGoal || "sales",
    productDescription: formData.productDescription || "",
  };
}

// ═══ PRICING MODEL ═══

function recommendPricingModel(input: ReturnType<typeof extractInput>): PricingModelRecommendation {
  let model: PricingModelType = "competitive";

  if (input.differentiationStrength > 60 && input.audience === "b2b") model = "value_based";
  else if (input.salesModel === "subscription" && input.audience !== "b2b") model = "freemium";
  else if (input.industry === "personalBrand" || input.industry === "education") model = "premium";
  else if (input.industry === "fashion" || input.industry === "food") model = "competitive";
  else if (input.differentiationStrength > 50) model = "value_based";

  const sensitivity = PRICE_SENSITIVITY.find((p) => p.field === input.industry) || PRICE_SENSITIVITY[9];
  const isB2B = input.audience === "b2b";
  const basePrice = input.currentPrice || 100;
  const charm = applyCharmPricing(basePrice, isB2B);

  const labels: Record<PricingModelType, BilingualText> = {
    value_based: { he: "תמחור מבוסס ערך", en: "Value-Based Pricing" },
    competitive: { he: "תמחור תחרותי", en: "Competitive Pricing" },
    freemium: { he: "Freemium + Pro", en: "Freemium + Pro" },
    penetration: { he: "תמחור חדירה", en: "Penetration Pricing" },
    premium: { he: "תמחור פרימיום", en: "Premium Pricing" },
  };

  const rationales: Record<PricingModelType, BilingualText> = {
    value_based: { he: "הבידול שלך חזק מספיק — תמחר לפי הערך שאתה מביא, לא לפי מה שהמתחרים גובים", en: "Your differentiation is strong — price by value delivered, not competitor rates" },
    competitive: { he: "בשוק תחרותי, מחיר צריך להיות בטווח השוק עם יתרון ברור", en: "In a competitive market, price must be in market range with a clear advantage" },
    freemium: { he: "תן ערך בחינם כדי לבנות הרגל — ואז מכור את הפרימיום", en: "Give value for free to build habits — then sell the premium" },
    penetration: { he: "מחיר נמוך לחדירה מהירה — ואז העלאה הדרגתית", en: "Low price for fast penetration — then gradual increase" },
    premium: { he: "המוצר שלך הוא ידע/חוויה — תמחר כ-transformation, לא כ-information", en: "Your product is knowledge/experience — price as transformation, not information" },
  };

  return {
    model,
    label: labels[model],
    rationale: rationales[model],
    valueMetric: getValueMetric(input),
    recommendedRange: { low: applyCharmPricing(basePrice * 0.7, isB2B), mid: charm, high: applyCharmPricing(basePrice * 1.5, isB2B) },
    charmPricePoints: [applyCharmPricing(basePrice * 0.8, isB2B), charm, applyCharmPricing(basePrice * 1.3, isB2B)],
    anchorPrice: applyCharmPricing(basePrice * 2.5, isB2B),
  };
}

function getValueMetric(input: ReturnType<typeof extractInput>): BilingualText {
  if (input.salesModel === "subscription") return { he: "למשתמש / לחודש", en: "Per user / month" };
  if (input.audience === "b2b") return { he: "לפרויקט / לעסקה", en: "Per project / deal" };
  if (input.industry === "education") return { he: "לקורס / לתוכנית", en: "Per course / program" };
  return { he: "ליחידה", en: "Per unit" };
}

// ═══ TIER STRUCTURE ═══

function generateTierStructure(input: ReturnType<typeof extractInput>, model: PricingModelRecommendation): TierRecommendation {
  const pattern = input.salesModel === "subscription" ? "good_better_best" : model.model === "freemium" ? "freemium_pro" : input.currentPrice > 2000 ? "single_tier" : "good_better_best";
  const tierPattern = TIER_PATTERNS.find((p) => p.bestFor.includes(input.industry)) || TIER_PATTERNS[0];
  const base = model.recommendedRange.low;
  const isB2B = input.audience === "b2b";

  const tiers: RecommendedTier[] = tierPattern.ratios.map((ratio, i) => {
    const price = applyCharmPricing(base * ratio, isB2B);
    const annualPrice = applyCharmPricing(price * (1 - ANNUAL_DISCOUNT.recommended / 100), isB2B);
    const names: BilingualText[] = [
      { he: "בסיסי", en: "Basic" },
      { he: "מקצועי", en: "Professional" },
      { he: "עסקי", en: "Business" },
    ];
    const segments: BilingualText[] = [
      { he: "מתחילים שרוצים לנסות", en: "Beginners wanting to try" },
      { he: "עסקים פעילים שרוצים לצמוח", en: "Active businesses wanting to grow" },
      { he: "עסקים רציניים שרוצים את הכל", en: "Serious businesses wanting everything" },
    ];

    return {
      name: names[i],
      price,
      annualPrice,
      annualDiscount: ANNUAL_DISCOUNT.recommended,
      features: generateTierFeatures(i, input),
      targetSegment: segments[i],
      isDecoy: i === 0, // first tier = decoy
      isPrimary: i === 1, // middle tier = target
    };
  });

  return { pattern: pattern as TierRecommendation["pattern"], tiers, decoyTierIndex: 0, highlightedTierIndex: 1 };
}

function generateTierFeatures(tierIndex: number, input: ReturnType<typeof extractInput>): BilingualText[] {
  const allFeatures: BilingualText[] = [
    { he: "גישה בסיסית למוצר", en: "Basic product access" },
    { he: "תמיכה באימייל", en: "Email support" },
    { he: "דוחות בסיסיים", en: "Basic reports" },
    { he: "גישה מלאה לכל הפיצ'רים", en: "Full feature access" },
    { he: "תמיכה בוואטסאפ (עד 24ש')", en: "WhatsApp support (24h)" },
    { he: "דוחות מתקדמים + אנליטיקס", en: "Advanced reports + analytics" },
    { he: "שיחת אסטרטגיה חודשית", en: "Monthly strategy call" },
    { he: "גישה לקהילת VIP", en: "VIP community access" },
    { he: "התאמה אישית מלאה", en: "Full customization" },
    { he: "מנהל לקוח ייעודי", en: "Dedicated account manager" },
  ];

  const counts = [3, 6, 10];
  return allFeatures.slice(0, counts[tierIndex]);
}

// ═══ OFFER STACK (Hormozi Value Equation) ═══

function buildOfferStack(input: ReturnType<typeof extractInput>, graph: UserKnowledgeGraph): OfferStackRecommendation {
  const price = input.currentPrice || 100;
  const bonuses = OFFER_BONUS_TEMPLATES.slice(0, 4).map((b) => ({
    name: b.name,
    anchoredValue: Math.round(price * b.valueMultiplier),
    type: b.type,
    description: b.description,
  }));

  const totalPerceivedValue = bonuses.reduce((s, b) => s + b.anchoredValue, price * 2);

  // Hormozi Value Equation
  const dreamOutcome = input.differentiationStrength > 50 ? 8 : 6;
  const perceivedLikelihood = graph.differentiation ? 8 : 5;
  const timeDelay = input.salesModel === "subscription" ? 3 : 5;
  const effortSacrifice = 4;
  const totalScore = (dreamOutcome * perceivedLikelihood) / (timeDelay * effortSacrifice);

  return {
    coreOffer: { he: input.productDescription || "המוצר/שירות המרכזי", en: input.productDescription || "Core product/service" },
    bonuses,
    totalPerceivedValue,
    actualPrice: price,
    valueToPrice: Math.round(totalPerceivedValue / price * 10) / 10,
    valueEquation: { dreamOutcome, perceivedLikelihood, timeDelay, effortSacrifice, totalScore: Math.round(totalScore * 10) / 10 },
  };
}

// ═══ GUARANTEE ═══

function designGuarantee(input: ReturnType<typeof extractInput>, _graph: UserKnowledgeGraph): GuaranteeRecommendation {
  const match = GUARANTEE_TYPES.find((g) => g.bestFor.includes(input.industry)) || GUARANTEE_TYPES[0];
  return {
    type: match.type,
    label: match.label,
    duration: match.type === "try_before_buy" ? "14 days" : "30 days",
    script: match.template,
    trustScore: match.trustScore,
  };
}

// ═══ PRICE FRAMING SCRIPTS ═══

function generatePriceFramingScripts(input: ReturnType<typeof extractInput>, graph: UserKnowledgeGraph): PriceFramingScript[] {
  const price = input.currentPrice || 100;
  const daily = Math.round(price / 30);
  const fieldHe = getFieldNameHe(input.industry);
  const product = input.productDescription?.slice(0, 40) || fieldHe;
  const monthlyWaste = formatPrice(Math.round(price * 0.4));

  return PRICE_FRAMING_TEMPLATES.map((t) => ({
    context: t.context,
    label: t.label,
    script: {
      he: t.template.he
        .replace("{price}", formatPrice(price))
        .replace("{daily}", formatPrice(daily))
        .replace("{totalValue}", formatPrice(price * 5))
        .replace("{monthlyWaste}", monthlyWaste)
        .replace("{product}", product)
        .replace("{solution}", product)
        .replace("{saving}", monthlyWaste)
        .replace("{paybackDays}", String(Math.round(30 * price / (price * 0.4))))
        .replace("{guarantee}", GUARANTEE_TYPES[0].template.he)
        .replace("{name}", "{שם}")
        .replace("{socialProof}", "200+")
        .replace("{cta}", "התחל עכשיו")
        .replace("{offerStack}", "מוצר + 4 בונוסים"),
      en: t.template.en
        .replace("{price}", formatPrice(price))
        .replace("{daily}", formatPrice(daily))
        .replace("{totalValue}", formatPrice(price * 5))
        .replace("{monthlyWaste}", monthlyWaste)
        .replace("{product}", product)
        .replace("{solution}", product)
        .replace("{saving}", monthlyWaste)
        .replace("{paybackDays}", String(Math.round(30 * price / (price * 0.4))))
        .replace("{guarantee}", GUARANTEE_TYPES[0].template.en)
        .replace("{name}", "{name}")
        .replace("{socialProof}", "200+")
        .replace("{cta}", "Start Now")
        .replace("{offerStack}", "Product + 4 bonuses"),
    },
    principle: t.principle,
  }));
}

// ═══ COMPETITIVE POSITION ═══

function analyzeCompetitivePosition(input: ReturnType<typeof extractInput>): CompetitivePositionResult {
  const sensitivity = PRICE_SENSITIVITY.find((p) => p.field === input.industry) || PRICE_SENSITIVITY[9];
  const position = input.differentiationStrength > 60 ? "premium"
    : input.differentiationStrength > 40 ? "market_rate"
    : sensitivity.sensitivity === "very_high" ? "below_market" : "market_rate";

  const labels: Record<string, BilingualText> = {
    below_market: { he: "מתחת לשוק", en: "Below Market" },
    market_rate: { he: "בתוך השוק", en: "Market Rate" },
    premium: { he: "פרימיום", en: "Premium" },
    luxury: { he: "יוקרה", en: "Luxury" },
  };

  return {
    position: position as CompetitivePositionResult["position"],
    label: labels[position],
    gap: { he: `טווח מחירים בתעשייה: ${sensitivity.typicalRange.he}`, en: `Industry price range: ${sensitivity.typicalRange.en}` },
    justification: sensitivity.notes,
  };
}

// ═══ SUBSCRIPTION ECONOMICS ═══

function calculateSubscriptionEconomics(input: ReturnType<typeof extractInput>): SubscriptionEconomicsResult {
  const benchmark = LTV_CAC_BENCHMARKS[input.industry] || LTV_CAC_BENCHMARKS.other;
  const monthlyPrice = input.currentPrice || 99;
  const avgLifespan = 12 / (benchmark.paybackMonths || 6) * 12; // rough estimate
  const projectedLTV = monthlyPrice * Math.min(avgLifespan, 36);
  const recommendedCAC = projectedLTV / benchmark.ratio;
  const ratio = projectedLTV / Math.max(recommendedCAC, 1);
  const health = ratio >= 3 ? "healthy" : ratio >= 1.5 ? "at_risk" : "unsustainable";

  return {
    projectedLTV,
    recommendedCAC: Math.round(recommendedCAC),
    ltvCacRatio: Math.round(ratio * 10) / 10,
    health,
    annualDiscount: ANNUAL_DISCOUNT.recommended,
    recommendation: health === "healthy"
      ? { he: `יחס LTV:CAC בריא (${ratio.toFixed(1)}:1). המשך במודל הנוכחי`, en: `Healthy LTV:CAC (${ratio.toFixed(1)}:1). Continue current model` }
      : { he: `יחס LTV:CAC נמוך (${ratio.toFixed(1)}:1). שקול העלאת מחיר או הפחתת CAC`, en: `Low LTV:CAC (${ratio.toFixed(1)}:1). Consider raising price or reducing CAC` },
  };
}

// ═══ NEXT STEPS ═══

function generateNextSteps(input: ReturnType<typeof extractInput>, model: PricingModelRecommendation, tiers: TierRecommendation): { priority: "high" | "medium"; action: BilingualText; timeframe: string }[] {
  const steps: { priority: "high" | "medium"; action: BilingualText; timeframe: string }[] = [];

  steps.push({
    priority: "high",
    action: { he: `בנה דף תמחור עם 3 Tiers: ${tiers.tiers.map((t) => `${t.name.he} ₪${t.price}`).join(" / ")}`, en: `Build pricing page with 3 tiers: ${tiers.tiers.map((t) => `${t.name.en} ₪${t.price}`).join(" / ")}` },
    timeframe: "7 days",
  });

  steps.push({
    priority: "high",
    action: { he: "הוסף אחריות לדף המכירה — זה מעלה המרות ב-20-30%", en: "Add guarantee to sales page — increases conversions 20-30%" },
    timeframe: "3 days",
  });

  if (input.salesModel === "subscription") {
    steps.push({
      priority: "medium",
      action: { he: "הפעל מנוי שנתי עם 17% הנחה (2 חודשים חינם)", en: "Launch annual plan with 17% discount (2 months free)" },
      timeframe: "14 days",
    });
  }

  steps.push({
    priority: "medium",
    action: { he: "בנה Offer Stack עם 3-4 בונוסים שמגדילים ערך נתפס ×5", en: "Build offer stack with 3-4 bonuses that 5× perceived value" },
    timeframe: "14 days",
  });

  return steps;
}
