// ═══════════════════════════════════════════════
// Churn Prediction & Prevention Engine
// Cross-domain: Behavioral Psychology × SaaS Metrics × Communication Theory
// 3-stage model: Active → Disengaging → Silent
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";

export interface ChurnSignal {
  signal: string;
  severity: "high" | "medium" | "low";
  description: { he: string; en: string };
}

export interface ChurnIntervention {
  stage: number; // 1=active, 2=disengaging, 3=silent
  stageName: { he: string; en: string };
  action: { he: string; en: string };
  channel: string;
  timing: string;
  template: { he: string; en: string };
}

export interface NRRProjection {
  current: number;      // estimated current NRR %
  withIntervention: number; // projected NRR after churn prevention
  improvement: number;  // delta
}

export interface ChurnRiskAssessment {
  riskScore: number; // 0-100 (higher = more risk)
  riskTier: "healthy" | "watch" | "at-risk" | "critical";
  signals: ChurnSignal[];
  interventions: ChurnIntervention[];
  nrrProjection: NRRProjection;
  retentionPlaybook: { he: string; en: string }[];
}

// ═══════════════════════════════════════════════
// RISK SCORING
// ═══════════════════════════════════════════════

const FIELD_CHURN_RATES: Record<string, number> = {
  tech: 0.25,         // 25% annual churn (SaaS average)
  services: 0.30,     // high dependence on relationship
  health: 0.40,       // 60% leave after 1 month
  education: 0.50,    // 5-15% completion rate
  food: 0.35,         // only 30% return
  fashion: 0.45,      // highly seasonal
  tourism: 0.50,      // extreme seasonality
  realEstate: 0.20,   // long-term relationships
  personalBrand: 0.35, // content burnout
  other: 0.30,
};

const NRR_BASELINES: Record<string, number> = {
  tech: 95,
  services: 85,
  health: 75,
  education: 70,
  food: 80,
  fashion: 75,
  tourism: 65,
  realEstate: 90,
  personalBrand: 80,
  other: 80,
};

function calculateRiskScore(formData: FormData): { score: number; signals: ChurnSignal[] } {
  let score = 30; // baseline risk
  const signals: ChurnSignal[] = [];
  const field = formData.businessField || "other";

  // === Industry base risk ===
  const fieldChurn = FIELD_CHURN_RATES[field] || 0.30;
  score += Math.round(fieldChurn * 30); // 0-15 from industry

  if (fieldChurn >= 0.40) {
    signals.push({
      signal: "high_industry_churn",
      severity: "high",
      description: {
        he: `תחום ה${getFieldHe(field)} סובל משיעור נטישה גבוה (${Math.round(fieldChurn * 100)}%) — דורש אסטרטגיית שימור אגרסיבית`,
        en: `The ${field} industry has high churn (${Math.round(fieldChurn * 100)}%) — requires aggressive retention strategy`,
      },
    });
  }

  // === Sales model risk ===
  if (formData.salesModel === "oneTime") {
    score += 15;
    signals.push({
      signal: "no_recurring_revenue",
      severity: "high",
      description: {
        he: "מכירה חד-פעמית ללא הכנסה חוזרת — סיכון גבוה לאובדן LTV",
        en: "One-time sale with no recurring revenue — high LTV loss risk",
      },
    });
  } else if (formData.salesModel === "subscription") {
    score -= 10; // subscription has built-in retention
  }

  // === Channel gaps ===
  const hasEmail = formData.existingChannels.includes("email");
  const hasWhatsapp = formData.existingChannels.includes("whatsapp");

  if (!hasEmail && !hasWhatsapp) {
    score += 10;
    signals.push({
      signal: "no_direct_channels",
      severity: "medium",
      description: {
        he: "אין ערוצי תקשורת ישירים (אימייל/וואטסאפ) — קשה לשמר ללא קשר ישיר",
        en: "No direct communication channels (email/WhatsApp) — hard to retain without direct contact",
      },
    });
  }

  // === Experience level ===
  if (formData.experienceLevel === "beginner") {
    score += 10;
    signals.push({
      signal: "beginner_execution_risk",
      severity: "medium",
      description: {
        he: "רמת ניסיון מתחילה — סיכון שהתוכנית לא תיושם כהלכה, מה שמוביל לנטישת לקוחות",
        en: "Beginner experience level — risk of poor execution leading to customer churn",
      },
    });
  } else if (formData.experienceLevel === "advanced") {
    score -= 5;
  }

  // === Budget constraints ===
  if (formData.budgetRange === "low") {
    score += 8;
    signals.push({
      signal: "low_retention_budget",
      severity: "medium",
      description: {
        he: "תקציב נמוך מגביל אפשרויות שימור — הימנע מתלות בפלטפורמה אחת",
        en: "Low budget limits retention options — avoid single-platform dependency",
      },
    });
  }

  // === Audience type ===
  if (formData.audienceType === "b2c") {
    score += 5; // B2C inherently higher churn
  }

  // === Goal misalignment ===
  if (formData.mainGoal === "awareness") {
    score += 5;
    signals.push({
      signal: "awareness_over_retention",
      severity: "low",
      description: {
        he: "מטרה עיקרית: מודעות — אבל שימור חשוב לא פחות ל-LTV. אל תזניח את השלב הזה",
        en: "Main goal: awareness — but retention is equally important for LTV. Don't neglect this stage",
      },
    });
  }

  // === Low price susceptibility ===
  if (formData.averagePrice < 100 && formData.salesModel !== "subscription") {
    score += 5;
    signals.push({
      signal: "low_switching_cost",
      severity: "low",
      description: {
        he: "מחיר נמוך = עלות מעבר נמוכה. הלקוח יכול לעזוב בקלות",
        en: "Low price = low switching cost. Customer can leave easily",
      },
    });
  }

  return { score: Math.min(Math.max(score, 0), 100), signals };
}

// ═══════════════════════════════════════════════
// INTERVENTION PLAYBOOKS
// ═══════════════════════════════════════════════

function generateInterventions(formData: FormData, riskTier: string): ChurnIntervention[] {
  const channel = formData.existingChannels.includes("whatsapp") ? "whatsapp"
    : formData.existingChannels.includes("email") ? "email" : "email";
  const isSubscription = formData.salesModel === "subscription";
  const field = formData.businessField || "other";

  const interventions: ChurnIntervention[] = [];

  // Stage 1: Active — preventive measures
  interventions.push({
    stage: 1,
    stageName: { he: "פעיל — מניעה", en: "Active — Prevention" },
    action: { he: "בנה הרגל שימוש שבועי עם ערך מצטבר", en: "Build weekly usage habit with cumulative value" },
    channel,
    timing: "weekly",
    template: isSubscription
      ? { he: "היי! השבוע השגת X — הנה המשימה לשבוע הבא שתשפר ב-Y%", en: "Hey! This week you achieved X — here's next week's task to improve by Y%" }
      : { he: "מחכים לך! הנה הצעה ייחודית ללקוחות חוזרים — רק השבוע", en: "We're waiting for you! Here's an exclusive offer for returning customers — this week only" },
  });

  interventions.push({
    stage: 1,
    stageName: { he: "פעיל — מניעה", en: "Active — Prevention" },
    action: { he: "חגוג Milestones ובנה קשר רגשי", en: "Celebrate Milestones and build emotional connection" },
    channel,
    timing: "milestone-triggered",
    template: {
      he: "🎉 מזל טוב! הגעת ל-[Milestone]. אתה ב-Top 10% של הלקוחות שלנו!",
      en: "🎉 Congrats! You hit [Milestone]. You're in the Top 10% of our customers!",
    },
  });

  // Stage 2: Disengaging — re-engagement
  interventions.push({
    stage: 2,
    stageName: { he: "מתנתק — הפעלה מחדש", en: "Disengaging — Re-engagement" },
    action: { he: "שלח 'חסר לנו' + ערך חינמי", en: "Send 'we miss you' + free value" },
    channel,
    timing: "after 14 days inactivity",
    template: {
      he: "היי, שמנו לב שלא היית פעיל/ה — הנה [מתנת ערך חינמית]. חזור/י ותראה/י מה חדש!",
      en: "Hey, we noticed you've been away — here's a [free value gift]. Come back and see what's new!",
    },
  });

  interventions.push({
    stage: 2,
    stageName: { he: "מתנתק — הפעלה מחדש", en: "Disengaging — Re-engagement" },
    action: { he: "הצג 'מה פספסת' + Social Proof", en: "Show 'what you missed' + Social Proof" },
    channel,
    timing: "after 21 days inactivity",
    template: {
      he: "בזמן שהיית בחוץ: 156 לקוחות חדשים הצטרפו, ו-[Feature חדש] הושק. מוכן/ה לחזור?",
      en: "While you were away: 156 new customers joined, and [New Feature] launched. Ready to come back?",
    },
  });

  // Stage 3: Silent — win-back
  interventions.push({
    stage: 3,
    stageName: { he: "שקט — Win-Back", en: "Silent — Win-Back" },
    action: { he: "הצע הנחת חזרה + סקר יציאה", en: "Offer comeback discount + exit survey" },
    channel: "email",
    timing: "after 30 days inactivity",
    template: {
      he: "מתגעגעים! הנה 30% הנחה אם תחזור/י היום. ואם לא — נשמח לשמוע למה עזבת (סקר 30 שניות)",
      en: "We miss you! Here's 30% off if you come back today. If not — we'd love to hear why you left (30-second survey)",
    },
  });

  interventions.push({
    stage: 3,
    stageName: { he: "שקט — Win-Back", en: "Silent — Win-Back" },
    action: { he: "סקר יציאה + הפניה לתחליף (גם אם לא שלנו)", en: "Exit survey + redirect to alternative (even if not ours)" },
    channel: "email",
    timing: "after 45 days inactivity",
    template: {
      he: "אנחנו מבינים שהפתרון שלנו לא התאים. 30 שניות לסקר יעזרו לנו להשתפר. ואם תרצה/י — הנה 3 חלופות שאולי יתאימו יותר",
      en: "We understand our solution wasn't the right fit. A 30-second survey will help us improve. And if you'd like — here are 3 alternatives that might suit you better",
    },
  });

  return interventions;
}

// ═══════════════════════════════════════════════
// NRR PROJECTION
// ═══════════════════════════════════════════════

function projectNRR(formData: FormData, riskScore: number): NRRProjection {
  const field = formData.businessField || "other";
  const baseline = NRR_BASELINES[field] || 80;

  // Risk reduces NRR
  const riskReduction = Math.round(riskScore * 0.15);
  const current = Math.max(baseline - riskReduction, 50);

  // Intervention improvement depends on sales model
  const interventionBoost = formData.salesModel === "subscription" ? 15
    : formData.salesModel === "leads" ? 10 : 8;

  const withIntervention = Math.min(current + interventionBoost, 120); // NRR > 100 = net positive

  return {
    current,
    withIntervention,
    improvement: withIntervention - current,
  };
}

// ═══════════════════════════════════════════════
// RETENTION PLAYBOOK
// ═══════════════════════════════════════════════

function generatePlaybook(formData: FormData, riskTier: string): { he: string; en: string }[] {
  const playbook: { he: string; en: string }[] = [];

  // Universal tips
  playbook.push({
    he: "בנה 'רגע אהה' תוך 24 שעות מהרכישה — הערך הראשון חייב להגיע מהר",
    en: "Build an 'aha moment' within 24 hours of purchase — first value must arrive fast",
  });

  if (formData.salesModel === "subscription") {
    playbook.push(
      { he: "עקוב אחרי Usage Score שבועי — ירידה ב-20% = דגל אדום", en: "Track weekly Usage Score — 20% drop = red flag" },
      { he: "הטמע Milestone Celebrations — חגוג כל הישג כדי לבנות Investment Loop", en: "Implement Milestone Celebrations — celebrate every achievement to build Investment Loop" },
    );
  }

  if (formData.salesModel === "oneTime") {
    playbook.push(
      { he: "בנה תוכנית נאמנות: נקודות → הנחה. זה הופך רכישה בודדת ל-Flywheel", en: "Build a loyalty program: points → discount. This turns a single purchase into a Flywheel" },
      { he: "שלח תזכורת חכמה ל-Reorder לפי מחזור שימוש ממוצע", en: "Send smart Reorder reminder based on average usage cycle" },
    );
  }

  if (riskTier === "critical" || riskTier === "at-risk") {
    playbook.push(
      { he: "דחוף: הטמע סקר NPS חודשי — זהה Detractors לפני שעוזבים", en: "Urgent: implement monthly NPS survey — identify Detractors before they leave" },
      { he: "הצע ערבות תוצאה — מפחית סיכון נתפס ב-70%", en: "Offer a results guarantee — reduces perceived risk by 70%" },
    );
  }

  if (formData.audienceType === "b2b") {
    playbook.push({
      he: "בנה QBR (Quarterly Business Review) — פגישת ערך רבעונית שמחזקת את הקשר",
      en: "Build QBR (Quarterly Business Review) — quarterly value meeting that strengthens the relationship",
    });
  }

  playbook.push({
    he: "הפוך לקוחות מרוצים לשגרירים: 'הפנה חבר וקבל X' — עלות רכישה נמוכה פי 5",
    en: "Turn satisfied customers into advocates: 'Refer a friend and get X' — 5x lower acquisition cost",
  });

  return playbook;
}

// ═══════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════

export function assessChurnRisk(
  formData: FormData,
  ukg?: import("./userKnowledgeGraph").UserKnowledgeGraph,
): ChurnRiskAssessment {
  let { score: riskScore, signals } = calculateRiskScore(formData);

  // Cross-domain: DISC personality adjusts churn model
  if (ukg?.discProfile) {
    const p = ukg.discProfile.primary;
    if (p === "S") { riskScore -= 5; signals.push({ he: "S-profile: נטישה שקטה אך איטית", en: "S-profile: slow but silent churn" }); }
    if (p === "D") { riskScore += 5; signals.push({ he: "D-profile: יעזוב מהר אם לא רואה ROI", en: "D-profile: quick exit without visible ROI" }); }
  }
  // Cross-domain: imported data with declining trend = higher risk
  if (ukg?.derived.urgencySignal === "acute") {
    riskScore += 8;
    signals.push({ he: "נתונים מיובאים מראים ירידה חדה", en: "Imported data shows sharp decline" });
  } else if (ukg?.derived.urgencySignal === "mild") {
    riskScore += 3;
  }

  const riskTier: ChurnRiskAssessment["riskTier"] =
    riskScore >= 70 ? "critical" :
    riskScore >= 50 ? "at-risk" :
    riskScore >= 30 ? "watch" : "healthy";

  const interventions = generateInterventions(formData, riskTier);
  const nrrProjection = projectNRR(formData, riskScore);
  const retentionPlaybook = generatePlaybook(formData, riskTier);

  return {
    riskScore,
    riskTier,
    signals,
    interventions,
    nrrProjection,
    retentionPlaybook,
  };
}

// === HELPER ===
function getFieldHe(field: string): string {
  const names: Record<string, string> = {
    fashion: "אופנה", tech: "טכנולוגיה", food: "מזון", services: "שירותים",
    education: "חינוך", health: "בריאות", realEstate: "נדל\"ן",
    tourism: "תיירות", personalBrand: "מיתוג אישי", other: "עסקים",
  };
  return names[field] || "עסקים";
}
