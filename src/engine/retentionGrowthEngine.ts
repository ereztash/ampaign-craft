// ═══════════════════════════════════════════════
// Retention & Growth Engine
// Cross-domain: Hooked Model × Customer Success × Lifecycle Marketing
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";
import { RetentionResult, OnboardingSequence, ReferralBlueprint, ChurnPlaybook, GrowthLoopResult, LoyaltyStrategy, RetentionImpact, RetentionTrigger, OnboardingStep } from "@/types/retention";
import { UserKnowledgeGraph, formatPrice } from "./userKnowledgeGraph";
import { ONBOARDING_SEQUENCES, CHURN_SIGNALS, REFERRAL_TEMPLATES, RETENTION_TRIGGERS } from "./retentionKnowledge";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";
import { RetentionPersonalizationContext } from "./retentionPersonalizationContext";

export const ENGINE_MANIFEST = {
  name: "retentionGrowthEngine",
  reads: ["USER-form-*", "USER-knowledgeGraph-*"],
  writes: ["USER-retention-*"],
  stage: "design",
  isLive: true,
  parameters: ["Retention growth"],
} as const;

// ═══ MAIN GENERATOR ═══

export function generateRetentionStrategy(
  formData: FormData,
  graph: UserKnowledgeGraph,
  blackboardCtx?: BlackboardWriteContext,
  ctx?: RetentionPersonalizationContext,
): RetentionResult {
  const businessType = detectBusinessType(formData);

  const result: RetentionResult = {
    onboarding: designOnboardingSequence(businessType, graph, ctx),
    triggerMap: buildRetentionTriggerMap(graph),
    referralBlueprint: createReferralBlueprint(graph, ctx),
    churnPlaybook: generateChurnPlaybook(graph, ctx),
    growthLoop: identifyGrowthLoop(formData, graph),
    loyaltyStrategy: designLoyaltyProgram(formData, graph),
    projectedImpact: calculateRetentionImpact(formData, graph, ctx),
  };

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("USER", "retention", blackboardCtx.planId ?? blackboardCtx.userId),
      stage: "design",
      payload: {
        businessType,
        onboardingSteps: result.onboarding.steps.length,
        triggerCount: result.triggerMap.length,
      },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return result;
}

// ═══ BUSINESS TYPE DETECTION ═══

function detectBusinessType(formData: FormData): "ecommerce" | "saas" | "services" | "creator" {
  if (formData.salesModel === "subscription" && (formData.businessField === "tech" || formData.audienceType === "b2b")) return "saas";
  if (formData.businessField === "personalBrand" || formData.businessField === "education") return "creator";
  if (formData.audienceType === "b2b" || formData.businessField === "services") return "services";
  return "ecommerce";
}

// ═══ ONBOARDING SEQUENCE ═══

function fillTokens(
  text: string,
  product: string,
  benefit: string,
  reward: string,
  ahaAction: string,
): string {
  return text
    .replace(/\{מוצר\}|\{product\}/g, product)
    .replace(/\{benefit\}|\{תועלת\}/g, benefit)
    .replace(/\{reward\}|\{פרס\}/g, reward)
    .replace(/\{ahaAction\}/g, ahaAction);
}

function personaliseSteps(
  steps: OnboardingStep[],
  ctx: RetentionPersonalizationContext,
): OnboardingStep[] {
  const product   = ctx.productName;
  const benefit   = ctx.coreBenefit.en;   // used for en templates
  const benefitHe = ctx.coreBenefit.he;   // used for he templates
  const reward    = `₪${ctx.referralReward.amount}`;
  const ahaEn     = ctx.ahaAction.en;
  const ahaHe     = ctx.ahaAction.he;

  return steps.map((step) => ({
    ...step,
    template: {
      he: fillTokens(step.template.he, product, benefitHe, reward, ahaHe),
      en: fillTokens(step.template.en, product, benefit,   reward, ahaEn),
    },
  }));
}

function designOnboardingSequence(
  type: ReturnType<typeof detectBusinessType>,
  graph: UserKnowledgeGraph,
  ctx?: RetentionPersonalizationContext,
): OnboardingSequence {
  const rawSteps = ONBOARDING_SEQUENCES[type] || ONBOARDING_SEQUENCES.ecommerce;
  const steps    = ctx ? personaliseSteps(rawSteps, ctx) : rawSteps;

  // Use ctx-derived AHA metric when available (from dream outcome axis)
  const ahaMetrics: Record<string, { he: string; en: string }> = {
    ecommerce: ctx?.ahaAction ?? { he: "הלקוח השתמש במוצר + לא החזיר", en: "Customer used product + didn't return" },
    saas:      ctx?.ahaAction ?? { he: "הלקוח השלים את הפעולה המרכזית הראשונה", en: "Customer completed first core action" },
    services:  ctx?.ahaAction ?? { he: "הלקוח ראה תוצאה ראשונה מדידה", en: "Customer saw first measurable result" },
    creator:   ctx?.ahaAction ?? { he: "הלקוח השתתף בדיון בקהילה", en: "Customer participated in community discussion" },
  };

  // Time-to-value: use ctx-derived days when available, fall back to category defaults
  const ttv = ctx?.onboardingDays;
  const timeToValueMap: Record<string, string> = {
    ecommerce: ttv ? `${ttv} day${ttv === 1 ? "" : "s"}` : "1-3 days",
    saas:      ttv ? `${ttv} day${ttv === 1 ? "" : "s"}` : "24 hours",
    services:  ttv ? `${ttv} day${ttv === 1 ? "" : "s"}` : "7 days",
    creator:   ttv ? `${ttv} day${ttv === 1 ? "" : "s"}` : "3 days",
  };

  return {
    type,
    steps,
    ahaMetric:   ahaMetrics[type],
    timeToValue: timeToValueMap[type],
  };
}

// ═══ RETENTION TRIGGER MAP ═══

function buildRetentionTriggerMap(_graph: UserKnowledgeGraph): RetentionTrigger[] {
  return RETENTION_TRIGGERS;
}

// ═══ REFERRAL BLUEPRINT ═══

function createReferralBlueprint(
  graph: UserKnowledgeGraph,
  ctx?: RetentionPersonalizationContext,
): ReferralBlueprint {
  // Subscription → two-sided, one-time → tiered, services → one-sided
  const model = graph.business.salesModel === "subscription" ? "two_sided"
    : graph.business.salesModel === "leads" || graph.business.audience === "b2b" ? "one_sided"
    : "tiered";

  const template  = REFERRAL_TEMPLATES.find((t) => t.model === model) || REFERRAL_TEMPLATES[0];
  const product   = ctx?.productName ?? "המוצר";
  const benefit   = ctx?.coreBenefit.en ?? "the benefit";
  const benefitHe = ctx?.coreBenefit.he ?? "התועלת";

  // Use context-derived reward if available, otherwise fall back to template default
  const rewardHe = ctx ? `₪${ctx.referralReward.amount} לשניכם` : template.reward.he;
  const rewardEn = ctx ? `₪${ctx.referralReward.amount} each` : template.reward.en;
  const rewardStr = ctx ? `₪${ctx.referralReward.amount}` : "₪50";

  return {
    model,
    label:    template.label,
    mechanics: template.mechanics,
    reward:   { he: rewardHe, en: rewardEn },
    template: {
      he: fillTokens(template.whatsappTemplate.he, product, benefitHe, rewardStr, ""),
      en: fillTokens(template.whatsappTemplate.en, product, benefit,   rewardStr, ""),
    },
    bestTiming: { he: "7-14 ימים אחרי רכישה (שיא השביעות רצון)", en: "7-14 days after purchase (peak satisfaction)" },
  };
}

// ═══ CHURN PLAYBOOK ═══

function generateChurnPlaybook(
  graph: UserKnowledgeGraph,
  ctx?: RetentionPersonalizationContext,
): ChurnPlaybook {
  const price = formatPrice(graph.business.price);

  // Win-back Day 0: empathy — open conversation, do NOT sell
  const day0HeBase = `היי {שם}, חסר לנו! 😢\nשמתי לב שלא היית פעיל/ה בזמן האחרון.\nמה קרה? אני כאן אם צריך עזרה.`;
  const day0EnBase = `Hey {name}, we miss you! 😢\nNoticed you haven't been active recently.\nWhat happened? I'm here if you need help.`;

  // Win-back Day 3: show the value they came for (use ctx win-back frame)
  const day3He = ctx
    ? `היי {שם}, הכנו לך משהו:\n${ctx.winBackFrame.he}\nזה בדיוק מה שחיפשת. חוזר/ת?`
    : `היי {שם}, הכנו לך משהו:\n{newFeature}\nזה בדיוק מה שביקשת. חוזר/ת?`;
  const day3En = ctx
    ? `Hey {name}, we prepared something:\n${ctx.winBackFrame.en}\nExactly what you were looking for. Coming back?`
    : `Hey {name}, we made something for you:\n{newFeature}\nExactly what you asked for. Coming back?`;

  const winbackSequence = [
    { day: 0, name: { he: "הודעת חסר לנו", en: "We Miss You" }, channel: "whatsapp" as const, emoji: "😢",
      template: { he: day0HeBase, en: day0EnBase },
      goal: { he: "פתח שיחה, אל תמכור", en: "Open conversation, don't sell" } },
    { day: 3, name: { he: "הצעת ערך", en: "Value Offer" }, channel: "email" as const, emoji: "🎁",
      template: { he: day3He, en: day3En },
      goal: { he: "הראה ערך חדש שלא הכירו", en: "Show new value they didn't know" } },
    { day: 7, name: { he: "הצעה מיוחדת", en: "Special Offer" }, channel: "whatsapp" as const, emoji: "💰",
      template: { he: `{שם}, הצעה אחרונה:\n50% הנחה לחודש — רק ${price} במקום ${price}×2.\nנגמר ביום שישי.`, en: `{name}, final offer:\n50% off for a month — just ${price} instead of ${price}×2.\nExpires Friday.` },
      goal: { he: "scarcity + discount = last chance", en: "scarcity + discount = last chance" } },
  ];

  // When Hormozi score is too low, prepend an "offer repair" advisory
  const offerFixSignal = ctx?.offerFixNeeded
    ? [{
        signal: { he: "ציון ערך Hormozi < 4 — הבעיה בהצעה, לא בשימור", en: "Hormozi value score < 4 — the problem is the offer, not retention" },
        risk: "critical" as const,
        intervention: {
          he: "תקן את ציר הערך לפני שתשקיע בשימור: הגדל Dream Outcome או הפחת Effort/Time",
          en: "Fix the value axis before investing in retention: increase Dream Outcome or reduce Effort/Time",
        },
        channel: "internal",
      }]
    : [];

  return {
    signals: [...offerFixSignal, ...CHURN_SIGNALS],
    winbackSequence,
    saveOffers: [
      { he: "הקפאת מנוי (חודש חינם בלי לבטל)", en: "Subscription pause (free month without canceling)" },
      { he: "דאונגרייד לתוכנית זולה יותר", en: "Downgrade to a cheaper plan" },
      { he: "שיחת retention אישית (10 דקות)", en: "Personal retention call (10 minutes)" },
    ],
  };
}

// ═══ GROWTH LOOP ═══

function identifyGrowthLoop(formData: FormData, graph: UserKnowledgeGraph): GrowthLoopResult {
  const loops: Record<string, GrowthLoopResult> = {
    viral: {
      type: "viral", label: { he: "לופ ויראלי", en: "Viral Loop" },
      description: { he: "משתמש מזמין חברים → חברים הופכים למשתמשים → הם מזמינים חברים", en: "User invites friends → friends become users → they invite friends" },
      steps: [
        { he: "1. משתמש חדש מקבל ערך", en: "1. New user gets value" },
        { he: "2. מתמרצים לשתף (reward)", en: "2. Incentivized to share (reward)" },
        { he: "3. חברים מצטרפים", en: "3. Friends join" },
        { he: "4. חוזר על עצמו", en: "4. Cycle repeats" },
      ],
      kFactor: "K > 1.0 = viral growth",
    },
    content: {
      type: "content", label: { he: "לופ תוכן", en: "Content Loop" },
      description: { he: "מייצר תוכן → מושך תעבורה → תעבורה הופכת ללקוחות → לקוחות מייצרים UGC", en: "Create content → attract traffic → traffic becomes customers → customers create UGC" },
      steps: [
        { he: "1. צור תוכן מקורי (בלוג, וידאו, פודקאסט)", en: "1. Create original content (blog, video, podcast)" },
        { he: "2. תוכן מביא תעבורה אורגנית", en: "2. Content drives organic traffic" },
        { he: "3. תעבורה מומרת ללידים/לקוחות", en: "3. Traffic converts to leads/customers" },
        { he: "4. לקוחות מייצרים UGC/ביקורות", en: "4. Customers create UGC/reviews" },
      ],
      kFactor: "SEO + UGC compounding",
    },
    community: {
      type: "community", label: { he: "לופ קהילתי", en: "Community Loop" },
      description: { he: "קהילה → ערך → חברים חדשים → קהילה גדלה → עוד ערך", en: "Community → value → new members → community grows → more value" },
      steps: [
        { he: "1. בנה קהילה סביב הנושא (לא המוצר)", en: "1. Build community around the topic (not product)" },
        { he: "2. חברים מקבלים ערך מהקהילה", en: "2. Members get value from community" },
        { he: "3. חברים מזמינים אחרים", en: "3. Members invite others" },
        { he: "4. קהילה גדלה → יותר ערך → יותר חברים", en: "4. Community grows → more value → more members" },
      ],
      kFactor: "Network effects: n² value",
    },
    paid: {
      type: "paid", label: { he: "לופ ממומן", en: "Paid Loop" },
      description: { he: "משקיע בפרסום → מקבל לקוחות → revenue → משקיע עוד", en: "Invest in ads → acquire customers → revenue → reinvest" },
      steps: [
        { he: "1. השקע תקציב בפרסום", en: "1. Invest budget in ads" },
        { he: "2. רכוש לקוחות ב-CAC < LTV", en: "2. Acquire customers at CAC < LTV" },
        { he: "3. Revenue מלקוחות", en: "3. Revenue from customers" },
        { he: "4. השקע מחדש (payback < 3 months)", en: "4. Reinvest (payback < 3 months)" },
      ],
      kFactor: "LTV:CAC ratio > 3:1",
    },
  };

  // Select best loop
  if (formData.businessField === "personalBrand" || formData.businessField === "education") return loops.community;
  if (formData.salesModel === "subscription") return loops.content;
  if (formData.audienceType === "b2c" && formData.budgetRange !== "low") return loops.viral;
  return loops.paid;
}

// ═══ LOYALTY PROGRAM ═══

function designLoyaltyProgram(formData: FormData, graph: UserKnowledgeGraph): LoyaltyStrategy {
  if (formData.salesModel === "subscription") {
    return {
      type: "tiers",
      label: { he: "תוכנית נאמנות מדורגת", en: "Tiered Loyalty Program" },
      tiers: [
        { name: { he: "Silver", en: "Silver" }, threshold: "3 months", benefit: { he: "5% הנחה + גישה לתוכן בלעדי", en: "5% off + exclusive content access" } },
        { name: { he: "Gold", en: "Gold" }, threshold: "6 months", benefit: { he: "10% הנחה + שיחת אסטרטגיה רבעונית", en: "10% off + quarterly strategy call" } },
        { name: { he: "Platinum", en: "Platinum" }, threshold: "12 months", benefit: { he: "20% הנחה + קהילת VIP + early access", en: "20% off + VIP community + early access" } },
      ],
      recommendation: { he: "תוכנית מדורגת מגדילה LTV ב-40-60% — היא מתגמלת נאמנות ויוצרת lock-in", en: "Tiered program increases LTV by 40-60% — rewards loyalty and creates lock-in" },
    };
  }

  return {
    type: "points",
    label: { he: "תוכנית נקודות", en: "Points Program" },
    recommendation: { he: "כל ₪1 = נקודה. 100 נקודות = ₪10 הנחה. פשוט, ברור, אפקטיבי", en: "Every ₪1 = 1 point. 100 points = ₪10 off. Simple, clear, effective" },
  };
}

// ═══ RETENTION IMPACT ═══

function calculateRetentionImpact(
  formData: FormData,
  graph: UserKnowledgeGraph,
  ctx?: RetentionPersonalizationContext,
): RetentionImpact {
  const price = formData.averagePrice || 100;
  const isSubscription = formData.salesModel === "subscription";

  // Base churn boosted by effort-level risk (high effort → higher base churn)
  const riskBoost = ctx ? ctx.churnRiskFactor : 0.15; // default medium
  const baseChurnRaw = isSubscription ? 8 : 30;
  const baseChurn = Math.round(baseChurnRaw * (1 + riskBoost));

  const reduction = isSubscription ? 35 : 20; // from implementing retention strategy
  const newChurn = Math.round(baseChurn * (1 - reduction / 100));
  const ltvMultiplier = isSubscription ? 1 / (newChurn / 100) / (1 / (baseChurn / 100)) : 1 + (reduction / 100);
  const additionalMonthly = Math.round(price * ltvMultiplier * 0.3);

  return {
    currentEstimatedChurn: baseChurn,
    projectedChurnReduction: reduction,
    ltvMultiplier: Math.round(ltvMultiplier * 10) / 10,
    additionalRevenue: {
      he: `~${formatPrice(additionalMonthly)} הכנסה נוספת/חודש מלקוחות קיימים`,
      en: `~${formatPrice(additionalMonthly)} additional monthly revenue from existing customers`,
    },
  };
}
