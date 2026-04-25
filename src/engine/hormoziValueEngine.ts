// ═══════════════════════════════════════════════
// Hormozi Value Equation Engine
// Cross-domain: Behavioral Economics x Sales Psychology x Pricing Theory
// Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";
import { UserKnowledgeGraph, getFieldNameHe, getFieldNameEn } from "./userKnowledgeGraph";
import { captureTrainingPair } from "./trainingDataEngine";

export interface HormoziDimension {
  score: number; // 0-100
  analysis: { he: string; en: string };
  tips: { he: string; en: string }[];
}

export interface HormoziValueResult {
  dreamOutcome: HormoziDimension;
  perceivedLikelihood: HormoziDimension;
  timeDelay: HormoziDimension;
  effortSacrifice: HormoziDimension;
  overallScore: number; // 0-100
  offerGrade: "irresistible" | "strong" | "average" | "weak";
  optimizationPriority: { he: string; en: string };
  valueEquationDisplay: { he: string; en: string };
}

// ═══════════════════════════════════════════════
// INDUSTRY DREAM OUTCOME TEMPLATES
// ═══════════════════════════════════════════════

const DREAM_OUTCOMES: Record<string, { he: string; en: string }> = {
  fashion: { he: "מותג אופנה מוביל שלקוחות מחפשים ורוכשים שוב ושוב", en: "A leading fashion brand that customers seek out and buy repeatedly" },
  tech: { he: "מוצר טכנולוגי שמשנה את כללי המשחק בתעשייה", en: "A tech product that changes the rules of the game in the industry" },
  food: { he: "מותג קולינרי שלקוחות נאמנים לו ומפנים חברים", en: "A culinary brand with loyal customers who refer friends" },
  services: { he: "שירות פרימיום שלקוחות משלמים עליו בשמחה ולא עוזבים", en: "A premium service that clients happily pay for and never leave" },
  education: { he: "תוכנית לימודים שמשנה חיים ומייצרת בוגרים מצליחים", en: "An education program that changes lives and produces successful graduates" },
  health: { he: "פתרון בריאותי שלקוחות רואים בו שינוי אמיתי ומדיד", en: "A health solution where clients see real, measurable change" },
  realEstate: { he: "השקעה נדלנית שמניבה תשואה עקבית ובטוחה", en: "A real estate investment delivering consistent, safe returns" },
  tourism: { he: "חוויה תיירותית בלתי נשכחת שאנשים מספרים עליה לכולם", en: "An unforgettable travel experience people tell everyone about" },
  personalBrand: { he: "מותג אישי מוביל שמוסמך כסמכות בתחומו ומייצר הכנסה פסיבית", en: "A leading personal brand recognized as an authority, generating passive income" },
  other: { he: "עסק משגשג שצומח באופן עקבי ומייצר רווחים יציבים", en: "A thriving business that grows consistently and generates stable profits" },
};

// ═══════════════════════════════════════════════
// SCORING FUNCTIONS
// ═══════════════════════════════════════════════

function scoreDreamOutcome(formData: FormData, graph?: UserKnowledgeGraph | null): HormoziDimension {
  let score = 40; // baseline
  const tips: { he: string; en: string }[] = [];
  const field = formData.businessField || "other";
  const fieldHe = getFieldNameHe(field);
  const fieldEn = getFieldNameEn(field);

  // Product description specificity
  const desc = formData.productDescription || "";
  if (desc.length > 100) {
    score += 15;
  } else if (desc.length > 30) {
    score += 8;
  } else {
    tips.push({
      he: "תאר את התוצאה החלומית בצורה ספציפית — 'שיפור 40% בהמרות תוך 30 יום' ולא 'שיפור בשיווק'",
      en: "Describe the dream outcome specifically — '40% conversion improvement in 30 days' not 'marketing improvement'",
    });
  }

  // Price indicates perceived value
  if (formData.averagePrice > 1000) {
    score += 10; // High ticket = ambitious outcome
  } else if (formData.averagePrice > 200) {
    score += 5;
  }

  // Differentiation amplifies the dream
  if (graph?.differentiation?.mechanismStatement) {
    score += 15;
  } else {
    tips.push({
      he: `הגדר מנגנון ייחודי (Mechanism) — מה הדבר שאתה עושה שונה מכל השאר בתחום ה${fieldHe}?`,
      en: `Define a unique mechanism — what do you do differently from everyone else in ${fieldEn}?`,
    });
  }

  // Clear goal alignment
  if (formData.mainGoal === "sales") score += 8;
  else if (formData.mainGoal === "leads") score += 5;

  // Identity statement strengthens outcome
  if (graph?.derived?.identityStatement?.he && graph.derived.identityStatement.he.length > 10) {
    score += 7;
  }

  const dreamText = DREAM_OUTCOMES[field] || DREAM_OUTCOMES.other;

  if (score < 50) {
    tips.push({
      he: "השתמש בשפת תוצאות, לא בשפת תכונות — 'תגיע ל-X' במקום 'אנחנו מציעים Y'",
      en: "Use outcome language, not feature language — 'achieve X' instead of 'we offer Y'",
    });
  }

  return {
    score: Math.min(score, 100),
    analysis: dreamText,
    tips,
  };
}

function scorePerceivedLikelihood(formData: FormData, graph?: UserKnowledgeGraph | null): HormoziDimension {
  let score = 30; // baseline — trust must be earned
  const tips: { he: string; en: string }[] = [];

  // Experience level = more credibility signals
  if (formData.experienceLevel === "advanced") {
    score += 15;
  } else if (formData.experienceLevel === "intermediate") {
    score += 8;
  } else {
    tips.push({
      he: "בנה הוכחות — Case Studies, ביקורות Google, מספרי לקוחות. 93% מהישראלים סומכים על המלצות אישיות",
      en: "Build proof — Case Studies, Google reviews, client numbers. 93% of Israelis trust personal recommendations",
    });
  }

  // Differentiation provides proof
  if (graph?.differentiation?.competitors && graph.differentiation.competitors.length > 0) {
    score += 10; // Knows competitors = more strategic
  }
  if (graph?.differentiation?.tradeoffs && graph.differentiation.tradeoffs.length > 0) {
    score += 10; // Transparent tradeoffs = higher trust
  } else {
    tips.push({
      he: "הצג את הפשרות (Trade-offs) שלך בגלוי — שקיפות מגבירה אמון ב-50%",
      en: "Show your trade-offs openly — transparency boosts trust by 50%",
    });
  }

  // Existing channels = more touchpoints for proof
  const channels = formData.existingChannels ?? [];
  if (channels.length >= 3) {
    score += 10;
  } else if (channels.length >= 1) {
    score += 5;
  }

  // B2B audiences need more proof
  if (formData.audienceType === "b2b") {
    score -= 5; // Harder to convince, lower baseline
    tips.push({
      he: "ב-B2B, הוסף ROI Epics — 'מ-X ל-Y תוך Z חודשים' עם מספרים ספציפיים",
      en: "In B2B, add ROI Epics — 'from X to Y in Z months' with specific numbers",
    });
  }

  // High price = need more assurance
  if (formData.averagePrice > 500) {
    tips.push({
      he: "מחיר גבוה דורש ערבויות — הוסף 'אחריות תוצאה' או 'ניסיון ללא סיכון'",
      en: "High price requires guarantees — add 'results guarantee' or 'risk-free trial'",
    });
  }

  if (score < 40) {
    tips.push({
      he: "עקרון Proof-Promise-Plan: בנה הוכחות לפני שאתה מבטיח. אל תבטיח מה שאין לך ראיות לכך",
      en: "Proof-Promise-Plan principle: build proof before promising. Don't promise what you can't evidence",
    });
  }

  return {
    score: Math.min(Math.max(score, 0), 100),
    analysis: {
      he: "הסתברות שהלקוח ישיג את התוצאה — מבוססת על הוכחות, אמינות ומנגנוני הבטחה",
      en: "Probability the customer achieves the outcome — based on proof, credibility, and guarantee mechanisms",
    },
    tips,
  };
}

function scoreTimeDelay(formData: FormData): HormoziDimension {
  let score = 50; // neutral baseline
  const tips: { he: string; en: string }[] = [];

  // Subscription = ongoing value delivery
  if (formData.salesModel === "subscription") {
    score += 15; // Continuous value
    tips.push({
      he: "הצג 'רגע אהה' תוך 24 שעות — הערך הראשון חייב להגיע מהר",
      en: "Deliver 'aha moment' within 24 hours — first value must arrive fast",
    });
  }

  // Digital products = faster delivery than physical
  if (formData.businessField === "tech" || formData.businessField === "education") {
    score += 10;
  } else if (formData.businessField === "services" || formData.businessField === "personalBrand") {
    score += 5;
  } else if (formData.businessField === "realEstate") {
    score -= 10; // Inherently slow
    tips.push({
      he: "נדל\"ן = מחזור ארוך. פצל את הערך: תובנות מיידיות → דוח שוק → ליווי אישי",
      en: "Real estate = long cycle. Split value: immediate insights → market report → personal guidance",
    });
  }

  // Low budget = can iterate faster
  if (formData.budgetRange === "low" || formData.budgetRange === "medium") {
    score += 5;
  }

  // B2B inherently slower
  if (formData.audienceType === "b2b") {
    score -= 5;
  }

  tips.push({
    he: "צמצם Time-to-Value: הראה תוצאה ראשונה תוך 72 שעות מהרכישה",
    en: "Minimize Time-to-Value: show first result within 72 hours of purchase",
  });

  if (score < 45) {
    tips.push({
      he: "הצע Tripwire — ספרינט או סדנה קצרה שנותנת ערך מיידי לפני העסקה המלאה",
      en: "Offer a Tripwire — short sprint or workshop delivering immediate value before the full deal",
    });
  }

  return {
    score: Math.min(Math.max(score, 0), 100),
    analysis: {
      he: "כמה זמן עובר בין התשלום לבין קבלת הערך הראשון — קצר יותר = ערך גבוה יותר",
      en: "How long between payment and receiving first value — shorter = higher value",
    },
    tips,
  };
}

function scoreEffortSacrifice(formData: FormData): HormoziDimension {
  let score = 50; // neutral baseline
  const tips: { he: string; en: string }[] = [];

  // Beginner-friendly = less effort required from user
  if (formData.experienceLevel === "beginner") {
    score -= 10; // Higher perceived effort for beginners
    tips.push({
      he: "הפחת עומס קוגניטיבי — הראה רק 3 צעדים ברורים, לא 10",
      en: "Reduce cognitive load — show only 3 clear steps, not 10",
    });
  } else if (formData.experienceLevel === "advanced") {
    score += 10; // Advanced users perceive less effort
  }

  // Tech products = less manual effort
  if (formData.businessField === "tech") {
    score += 10;
    tips.push({
      he: "הדגש אוטומציה — 'המערכת עושה X בשבילך' במקום 'אתה צריך לעשות X'",
      en: "Emphasize automation — 'the system does X for you' instead of 'you need to do X'",
    });
  }

  // Services = client must invest time
  if (formData.businessField === "services" || formData.businessField === "health") {
    score -= 5;
  }

  // Channels complexity
  if ((formData.existingChannels ?? []).length > 4) {
    score -= 5; // Managing many channels = more effort
  }

  // High price = larger sacrifice
  if (formData.averagePrice > 1000) {
    score -= 5;
    tips.push({
      he: "פרוס תשלומים — 'רק ₪X לחודש' מפחית את תחושת ההקרבה",
      en: "Offer payment plans — 'only ₪X/month' reduces perceived sacrifice",
    });
  }

  tips.push({
    he: "העבר פעולות ללקוח באוטומציה — כל דבר שהלקוח לא צריך לעשות = ערך גבוה יותר",
    en: "Automate client tasks — everything the client doesn't need to do = higher value",
  });

  return {
    score: Math.min(Math.max(score, 0), 100),
    analysis: {
      he: "כמה מאמץ והקרבה נדרשים מהלקוח — פחות מאמץ = ערך גבוה יותר",
      en: "How much effort and sacrifice required from the client — less effort = higher value",
    },
    tips,
  };
}

// ═══════════════════════════════════════════════
// MAIN CALCULATION
// ═══════════════════════════════════════════════

export function calculateValueScore(
  formData: FormData,
  knowledgeGraph?: UserKnowledgeGraph | null,
): HormoziValueResult {
  const dreamOutcome = scoreDreamOutcome(formData, knowledgeGraph);
  const perceivedLikelihood = scorePerceivedLikelihood(formData, knowledgeGraph);
  const timeDelay = scoreTimeDelay(formData);
  const effortSacrifice = scoreEffortSacrifice(formData);

  // Value = (Dream × Likelihood) / (Time × Effort)
  // Normalize: numerator and denominator are both 0-100 scales
  // We invert the denominator scores (higher = less delay/effort = better)
  const numerator = (dreamOutcome.score / 100) * (perceivedLikelihood.score / 100);
  const denominatorTime = Math.max(1 - timeDelay.score / 100, 0.1); // invert: high score = low delay
  const denominatorEffort = Math.max(1 - effortSacrifice.score / 100, 0.1);
  const rawValue = numerator / (denominatorTime * denominatorEffort);
  const overallScore = Math.round(Math.min(rawValue * 10, 100)); // scale to 0-100

  const offerGrade: HormoziValueResult["offerGrade"] =
    overallScore >= 80 ? "irresistible" :
    overallScore >= 60 ? "strong" :
    overallScore >= 35 ? "average" : "weak";

  // Determine optimization priority (lowest scoring dimension)
  const dimensions = [
    { key: "dreamOutcome", score: dreamOutcome.score, he: "הגדל את התוצאה החלומית", en: "Increase the Dream Outcome" },
    { key: "perceivedLikelihood", score: perceivedLikelihood.score, he: "הגבר את הסיכוי הנתפס", en: "Increase Perceived Likelihood" },
    { key: "timeDelay", score: timeDelay.score, he: "צמצם את השהיית הזמן", en: "Reduce Time Delay" },
    { key: "effortSacrifice", score: effortSacrifice.score, he: "הפחת מאמץ והקרבה", en: "Reduce Effort & Sacrifice" },
  ];
  dimensions.sort((a, b) => a.score - b.score);
  const priority = dimensions[0];

  const result: HormoziValueResult = {
    dreamOutcome,
    perceivedLikelihood,
    timeDelay,
    effortSacrifice,
    overallScore,
    offerGrade,
    optimizationPriority: { he: priority.he, en: priority.en },
    valueEquationDisplay: {
      he: `ערך = (${dreamOutcome.score} × ${perceivedLikelihood.score}) / (${100 - timeDelay.score} × ${100 - effortSacrifice.score}) = ${overallScore}/100`,
      en: `Value = (${dreamOutcome.score} × ${perceivedLikelihood.score}) / (${100 - timeDelay.score} × ${100 - effortSacrifice.score}) = ${overallScore}/100`,
    },
  };

  void captureTrainingPair("hormozi_value", { formData }, result).catch(() => {});
  return result;
}
