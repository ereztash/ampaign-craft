// ═══════════════════════════════════════════════
// User Knowledge Graph — Central Intelligence Layer
// Cross-references ALL user data sources into one unified structure
// that feeds every personalization module
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";
import { DifferentiationResult, MechanismStatement, TradeoffDeclaration, HiddenValueScore, CompetitorArchetype, BuyingCommitteeRoleId } from "@/types/differentiation";
import { DISCProfile, inferDISCProfile } from "./discProfileEngine";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";

export const ENGINE_MANIFEST = {
  name: "userKnowledgeGraph",
  reads: ["USER-form-*", "BUSINESS-differentiation-*"],
  writes: ["USER-knowledgeGraph-*"],
  stage: "diagnose",
  isLive: true,
  parameters: ["User knowledge graph"],
} as const;

// === TYPES ===

export interface StylomeVoice {
  register: "formal" | "casual" | "mixed";
  dugriScore: number; // 0-1
  cognitiveStyle: "concrete" | "abstract" | "balanced";
  emotionalIntensity: "low" | "medium" | "high";
  codeMixingIndex: number; // 0-100
}

export interface UserBehavior {
  visitCount: number;
  streak: number;
  mastery: number; // 0-100
  segment: string;
  stageOfChange: "precontemplation" | "contemplation" | "preparation" | "action" | "maintenance";
}

// Cross-domain input: extracted signals from AI Coach chat history
export interface ChatInsights {
  mentionedObjections: string[];
  expressedPainPoints: string[];
  requestedTopics: string[];
  engagementLevel: "low" | "medium" | "high";
  goalClarity: number; // 0-100
  readinessSignal: "ready" | "exploring" | "stuck";
}

// Cross-domain input: signals from imported CSV/Excel data
export interface ImportedDataSignals {
  datasetType: "campaign_performance" | "budget_tracking" | "leads" | "content_performance" | "custom";
  overallDirection: "improving" | "declining" | "stable";
  confidence: number; // 0-1
  metricHighlights: { metric: string; direction: "up" | "down"; changePct: number }[];
  rowCount: number;
}

// Cross-domain input: signals from Meta Ads connection
export interface MetaSignals {
  connected: boolean;
  spend: number;
  cpl: number;
  ctr: number;
  cvr: number;
  trendDirection: "improving" | "declining" | "stable";
}

export interface DifferentiationContext {
  mechanismStatement: MechanismStatement | null;
  competitors: string[];
  tradeoffs: TradeoffDeclaration[];
  hiddenValues: HiddenValueScore[];
  competitorArchetypes: CompetitorArchetype[];
  committeeRoles: BuyingCommitteeRoleId[];
}

export interface RealMetrics {
  avgCPL: number | null;
  avgCTR: number | null;
  avgCVR: number | null;
  trendDirection: "improving" | "declining" | "stable" | null;
}

export interface DerivedInsights {
  framingPreference: "loss" | "gain" | "balanced";
  complexityLevel: "simple" | "standard" | "advanced";
  identityStatement: { he: string; en: string };
  topPainPoint: { he: string; en: string };
  industryPainPoints: { he: string; en: string }[];
  priceContext: { formatted: string; isHighTicket: boolean; monthlyEquivalent: string };
  // Cross-domain derived fields (populated when additional inputs are available)
  discAwareFraming: "roi" | "social" | "stability" | "precision";
  discCommunicationStyle: "system1" | "system2" | "balanced";
  dataConfidence: "no_data" | "sparse" | "moderate" | "rich";
  urgencySignal: "none" | "mild" | "acute";
  voiceCalibration: "formal" | "dugri" | "mixed";
  chatDerivedPain: { he: string; en: string } | null;
  realMetrics: RealMetrics;
  coldStartMode: boolean;
}

export interface UserKnowledgeGraph {
  business: {
    field: string;
    product: string;
    price: number;
    audience: string;
    ageRange: [number, number];
    budget: string;
    goal: string;
    channels: string[];
    experience: string;
    salesModel: string;
  };
  differentiation: DifferentiationContext | null;
  voice: StylomeVoice | null;
  behavior: UserBehavior;
  derived: DerivedInsights;
  discProfile: DISCProfile | null;
  chatInsights: ChatInsights | null;
  importedData: ImportedDataSignals | null;
  metaSignals: MetaSignals | null;
}

// === INDUSTRY KNOWLEDGE ===

const INDUSTRY_PAIN_POINTS: Record<string, { he: string; en: string }[]> = {
  fashion: [
    { he: "צילומי מוצר שלא מוכרים", en: "Product photos that don't convert" },
    { he: "תחרות מחירים מול שיין/עלי", en: "Price competition vs Shein/Ali" },
    { he: "החזרות גבוהות (25-40%)", en: "High returns (25-40%)" },
    { he: "עונתיות — מכירות נופלות בין עונות", en: "Seasonality — sales drop between seasons" },
  ],
  tech: [
    { he: "מחזור מכירה ארוך (3-12 חודשים)", en: "Long sales cycle (3-12 months)" },
    { he: "קושי להסביר ערך טכני למחליטים לא טכניים", en: "Difficulty explaining technical value to non-technical buyers" },
    { he: "CAC גבוה — עולה ₪500-5,000 לליד", en: "High CAC — ₪500-5,000 per lead" },
    { he: "Churn — לקוחות עוזבים אחרי 6 חודשים", en: "Churn — customers leave after 6 months" },
  ],
  food: [
    { he: "מרווח נמוך (15-25%)", en: "Low margins (15-25%)" },
    { he: "תלות במיקום ובמזג אוויר", en: "Location and weather dependency" },
    { he: "תחרות על UGC ותמונות אוכל", en: "Competition for UGC and food photos" },
    { he: "שימור לקוחות — חזרה רק 30% מהלקוחות", en: "Retention — only 30% return" },
  ],
  services: [
    { he: "קושי לכמת ערך (לא מוצר פיזי)", en: "Difficulty quantifying value (not physical product)" },
    { he: "תלות באמון אישי — בלי פגישה אין סגירה", en: "Trust dependency — no close without meeting" },
    { he: "scalability מוגבל — שעות = הכנסה", en: "Limited scalability — hours = revenue" },
    { he: "אין הבדלה — כולם אומרים 'שירות אישי'", en: "No differentiation — everyone says 'personal service'" },
  ],
  education: [
    { he: "completion rate נמוך (5-15% בקורסים דיגיטליים)", en: "Low completion rate (5-15% in digital courses)" },
    { he: "תחרות מול תוכן חינמי ב-YouTube", en: "Competition vs free YouTube content" },
    { he: "קושי להוכיח ROI ללומד", en: "Difficulty proving ROI to learner" },
    { he: "עונתיות — ספטמבר > יולי", en: "Seasonality — September > July" },
  ],
  health: [
    { he: "רגולציה — לא ניתן להבטיח תוצאות", en: "Regulation — can't promise results" },
    { he: "אמון נמוך במודעות — צריך social proof חזק", en: "Low ad trust — needs strong social proof" },
    { he: "מחזור החלטה רגשי, לא רציונלי", en: "Emotional decision cycle, not rational" },
    { he: "שימור — 60% עוזבים אחרי חודש", en: "Retention — 60% leave after one month" },
  ],
  realEstate: [
    { he: "ליד יקר מאוד (₪100-500)", en: "Very expensive leads (₪100-500)" },
    { he: "מחזור מכירה ארוך (חודשים)", en: "Long sales cycle (months)" },
    { he: "תלות בשוק מאקרו (ריבית, מלחמה)", en: "Macro market dependency (interest rates, conflict)" },
    { he: "אמינות — הרבה 'מומחים' מזויפים בשוק", en: "Credibility — many fake 'experts' in market" },
  ],
  tourism: [
    { he: "עונתיות קיצונית (קיץ vs חורף)", en: "Extreme seasonality (summer vs winter)" },
    { he: "תחרות גלובלית — Booking, Airbnb", en: "Global competition — Booking, Airbnb" },
    { he: "ביקורות שליליות הורסות", en: "Negative reviews are devastating" },
    { he: "מחיר משתנה — dynamic pricing מורכב", en: "Price fluctuation — complex dynamic pricing" },
  ],
  personalBrand: [
    { he: "פגיעות — החשיפה האישית מפחידה", en: "Vulnerability — personal exposure is scary" },
    { he: "קשה לתמחר 'ידע'", en: "Hard to price 'knowledge'" },
    { he: "burnout מתוכן — כמה פעמים בשבוע לפרסם?", en: "Content burnout — how often to post?" },
    { he: "תלות בפלטפורמה אחת (אינסטגרם / טיקטוק)", en: "Platform dependency (Instagram / TikTok)" },
  ],
  other: [
    { he: "קושי לזהות את קהל היעד המדויק", en: "Difficulty identifying exact target audience" },
    { he: "תקציב שיווק מוגבל ולא יודע איפה לשים אותו", en: "Limited marketing budget, unsure where to allocate" },
    { he: "אין benchmark — לא יודע אם התוצאות טובות", en: "No benchmark — unsure if results are good" },
    { he: "תחרות גוברת — חדשים נכנסים כל הזמן", en: "Growing competition — new entrants constantly" },
  ],
};

const IDENTITY_TEMPLATES: Record<string, { he: string; en: string }> = {
  fashion: { he: "מותג אופנה ישראלי שמדבר ל{audience}", en: "Israeli fashion brand speaking to {audience}" },
  tech: { he: "חברת טכנולוגיה שפותרת {painPoint}", en: "Tech company solving {painPoint}" },
  food: { he: "עסק קולינרי שמביא {value}", en: "Culinary business delivering {value}" },
  services: { he: "נותן שירות מקצועי שמתמחה ב{product}", en: "Professional service specializing in {product}" },
  education: { he: "מחנך/ת שמלמד/ת {product}", en: "Educator teaching {product}" },
  health: { he: "מומחה/ית בריאות שעוזר/ת ל{audience}", en: "Health expert helping {audience}" },
  realEstate: { he: "איש/ת נדל\"ן שמתמקד/ת ב{audience}", en: "Real estate professional focused on {audience}" },
  tourism: { he: "עסק תיירות שמציע {product}", en: "Tourism business offering {product}" },
  personalBrand: { he: "מותג אישי בתחום ה{product}", en: "Personal brand in {product}" },
  other: { he: "עסק שמציע {product} ל{audience}", en: "Business offering {product} to {audience}" },
};

// === DEFAULTS ===

export const DEFAULT_FORM_DATA: FormData = {
  businessField: "",
  audienceType: "b2c",
  ageRange: [25, 55],
  interests: "",
  productDescription: "",
  averagePrice: 0,
  salesModel: "oneTime",
  budgetRange: "medium",
  mainGoal: "sales",
  existingChannels: [],
  experienceLevel: "beginner",
};

export function buildDefaultKnowledgeGraph() {
  return buildUserKnowledgeGraph(DEFAULT_FORM_DATA);
}

// === BUILDER ===

export interface CrossDomainInputs {
  chatInsights?: ChatInsights | null;
  importedData?: ImportedDataSignals | null;
  metaSignals?: MetaSignals | null;
}

export function buildUserKnowledgeGraph(
  formData: FormData,
  differentiationResult?: DifferentiationResult | null,
  stylomeVoice?: StylomeVoice | null,
  userBehavior?: Partial<UserBehavior>,
  blackboardCtx?: BlackboardWriteContext,
  crossDomain?: CrossDomainInputs,
): UserKnowledgeGraph {
  const field = formData.businessField || "other";
  const price = formData.averagePrice || 0;

  // Build differentiation context
  const differentiation: DifferentiationContext | null = differentiationResult
    ? {
        mechanismStatement: differentiationResult.mechanismStatement,
        competitors: differentiationResult.formData.topCompetitors.filter(Boolean),
        tradeoffs: differentiationResult.tradeoffDeclarations,
        hiddenValues: differentiationResult.hiddenValueProfile,
        competitorArchetypes: differentiationResult.competitorMap,
        committeeRoles: differentiationResult.committeeNarratives.map((n) => n.role),
      }
    : null;

  // Build behavior
  const behavior: UserBehavior = {
    visitCount: userBehavior?.visitCount ?? 1,
    streak: userBehavior?.streak ?? 0,
    mastery: userBehavior?.mastery ?? 0,
    segment: userBehavior?.segment ?? "new-beginner",
    stageOfChange: detectStageOfChange(userBehavior),
  };

  // Build derived insights (cross-domain inputs feed into the 7 new derived fields)
  const derived = buildDerivedInsights(
    formData, differentiation, stylomeVoice, behavior,
    crossDomain?.chatInsights, crossDomain?.importedData, crossDomain?.metaSignals,
  );

  const graph: UserKnowledgeGraph = {
    business: {
      field,
      product: formData.productDescription || "",
      price,
      audience: formData.audienceType || "b2c",
      ageRange: formData.ageRange || [25, 55],
      budget: formData.budgetRange || "medium",
      goal: formData.mainGoal || "sales",
      channels: formData.existingChannels || [],
      experience: formData.experienceLevel || "intermediate",
      salesModel: formData.salesModel || "oneTime",
    },
    differentiation,
    voice: stylomeVoice || null,
    behavior,
    derived,
    discProfile: null,
    chatInsights: crossDomain?.chatInsights ?? null,
    importedData: crossDomain?.importedData ?? null,
    metaSignals: crossDomain?.metaSignals ?? null,
  };

  // Infer DISC profile using the full graph context
  graph.discProfile = inferDISCProfile(formData, graph);

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("USER", "knowledgeGraph", blackboardCtx.planId ?? blackboardCtx.userId),
      stage: "diagnose",
      payload: { graph },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return graph;
}

// === DERIVED INSIGHTS ===

function buildDerivedInsights(
  formData: FormData,
  diff: DifferentiationContext | null,
  voice: StylomeVoice | null,
  behavior: UserBehavior,
  chat?: ChatInsights | null,
  imported?: ImportedDataSignals | null,
  meta?: MetaSignals | null,
): DerivedInsights {
  const field = formData.businessField || "other";
  const price = formData.averagePrice || 0;
  const audience = formData.audienceType || "b2c";

  // Framing preference: loss vs gain
  const framingPreference = deriveFramingPreference(formData, voice, behavior);

  // Complexity level
  const complexityLevel = formData.experienceLevel === "beginner" ? "simple"
    : formData.experienceLevel === "advanced" ? "advanced" : "standard";

  // Identity statement
  const identityStatement = buildIdentityStatement(formData, diff);

  // Top pain point
  const topPainPoint = diff?.tradeoffs?.[0]
    ? { he: diff.tradeoffs[0].weakness, en: diff.tradeoffs[0].weakness }
    : (INDUSTRY_PAIN_POINTS[field]?.[0] || INDUSTRY_PAIN_POINTS.other[0]);

  // Industry pain points
  const industryPainPoints = INDUSTRY_PAIN_POINTS[field] || INDUSTRY_PAIN_POINTS.other;

  // Price context
  const priceContext = {
    formatted: `₪${price.toLocaleString()}`,
    isHighTicket: (audience === "b2b" && price > 2000) || (audience === "b2c" && price > 500),
    monthlyEquivalent: formData.salesModel === "subscription" ? `₪${price}/חודש` : `₪${price}`,
  };

  return {
    framingPreference,
    complexityLevel,
    identityStatement,
    topPainPoint,
    industryPainPoints,
    priceContext,
    // Cross-domain derived fields
    discAwareFraming: deriveDiscFraming(formData),
    discCommunicationStyle: deriveDiscCommStyle(formData, voice),
    dataConfidence: deriveDataConfidence(imported, meta),
    urgencySignal: deriveUrgencySignal(imported),
    voiceCalibration: deriveVoiceCalibration(voice, formData),
    chatDerivedPain: deriveChatPain(chat),
    realMetrics: deriveRealMetrics(imported, meta),
    coldStartMode: deriveColdStartMode(behavior, voice, chat, imported, meta),
  };
}

function deriveFramingPreference(
  formData: FormData,
  voice: StylomeVoice | null,
  behavior: UserBehavior,
): "loss" | "gain" | "balanced" {
  let lossScore = 0;

  // Dugri people respond to loss framing
  if (voice && voice.dugriScore > 0.6) lossScore += 2;
  // Low budget = risk-averse = loss framing
  if (formData.budgetRange === "low") lossScore += 1;
  // Beginners fear loss more
  if (formData.experienceLevel === "beginner") lossScore += 1;
  // Health/services — risk-averse industries
  if (formData.businessField === "health" || formData.businessField === "services") lossScore += 1;

  // Advanced + high budget = gain framing
  if (formData.experienceLevel === "advanced") lossScore -= 1;
  if (formData.budgetRange === "high" || formData.budgetRange === "veryHigh") lossScore -= 1;
  // Tech/personalBrand — growth-oriented
  if (formData.businessField === "tech" || formData.businessField === "personalBrand") lossScore -= 1;

  if (lossScore >= 2) return "loss";
  if (lossScore <= -1) return "gain";
  return "balanced";
}

function buildIdentityStatement(
  formData: FormData,
  diff: DifferentiationContext | null,
): { he: string; en: string } {
  // If differentiation mechanism exists, use it
  if (diff?.mechanismStatement?.oneLiner?.he) {
    return diff.mechanismStatement.oneLiner;
  }

  // Build from template
  const field = formData.businessField || "other";
  const template = IDENTITY_TEMPLATES[field] || IDENTITY_TEMPLATES.other;
  const product = formData.productDescription?.slice(0, 50) || field;
  const audience = formData.audienceType === "b2b" ? "עסקים" : formData.audienceType === "both" ? "עסקים וצרכנים" : "צרכנים";
  const audienceEn = formData.audienceType === "b2b" ? "businesses" : formData.audienceType === "both" ? "businesses and consumers" : "consumers";

  return {
    he: template.he.replace("{audience}", audience).replace("{product}", product).replace("{painPoint}", INDUSTRY_PAIN_POINTS[field]?.[0]?.he || "בעיות").replace("{value}", "ערך"),
    en: template.en.replace("{audience}", audienceEn).replace("{product}", product).replace("{painPoint}", INDUSTRY_PAIN_POINTS[field]?.[0]?.en || "problems").replace("{value}", "value"),
  };
}

function detectStageOfChange(behavior?: Partial<UserBehavior>): UserBehavior["stageOfChange"] {
  if (!behavior) return "contemplation";
  const { visitCount = 1, streak = 0, mastery = 0 } = behavior;
  if (mastery > 60 && streak >= 4) return "maintenance";
  if (mastery > 30 || streak >= 2) return "action";
  if (visitCount >= 3) return "preparation";
  if (visitCount >= 2) return "contemplation";
  return "precontemplation";
}

// === HELPERS FOR CONSUMERS ===

export function getFieldNameHe(field: string): string {
  const names: Record<string, string> = {
    fashion: "אופנה", tech: "טכנולוגיה", food: "מזון", services: "שירותים",
    education: "חינוך", health: "בריאות", realEstate: "נדל\"ן",
    tourism: "תיירות", personalBrand: "מיתוג אישי", other: "עסקים",
  };
  return names[field] || "עסקים";
}

export function getFieldNameEn(field: string): string {
  const names: Record<string, string> = {
    fashion: "fashion", tech: "tech", food: "food & beverage", services: "services",
    education: "education", health: "health & wellness", realEstate: "real estate",
    tourism: "tourism", personalBrand: "personal brand", other: "business",
  };
  return names[field] || "business";
}

export function formatPrice(price: number): string {
  return `₪${price.toLocaleString()}`;
}

// ═══════════════════════════════════════════════
// Chat Insight Extraction (keyword-based, no LLM)
// ═══════════════════════════════════════════════

const OBJECTION_PATTERNS = [
  /too expensive|יקר מדי|price is high|מחיר גבוה|can't afford|אין תקציב/i,
  /not sure|לא בטוח|don't know if|לא יודע אם|maybe later|אולי אחר כך/i,
  /competitor|מתחרים|alternative|אלטרנטיבה|someone else|מישהו אחר/i,
  /doesn't work|לא עובד|not working|no results|אין תוצאות/i,
  /too complex|מסובך מדי|confusing|מבלבל|overwhelming/i,
];
const PAIN_PATTERNS = [
  /my customers? (?:are|don't|leave|complain)|הלקוחות שלי/i,
  /the problem is|הבעיה היא|struggling with|מתקשה עם/i,
  /losing money|מפסיד כסף|wasting budget|מבזבז תקציב/i,
  /low conversion|המרה נמוכה|high churn|נטישה גבוהה/i,
];
const TOPIC_KEYWORDS: Record<string, RegExp> = {
  pricing: /pricing|תמחור|price|מחיר/i,
  whatsapp: /whatsapp|וואטסאפ/i,
  seo: /seo|קידום אורגני|google|גוגל/i,
  facebook: /facebook|meta|פייסבוק|מטא|ads|מודעות/i,
  retention: /retention|שימור|churn|נטישה|loyalty|נאמנות/i,
  sales: /sales|מכירות|pipeline|closing|סגירה/i,
  content: /content|תוכן|copy|קופי|headline|כותרת/i,
};
const READY_PATTERNS = /\b(start|implement|ready|begin|let's go|מתחיל|מוכן|בוא נתחיל)\b/i;
const EXPLORING_PATTERNS = /\b(maybe|thinking|consider|אולי|חושב|שוקל)\b/i;
const STUCK_PATTERNS = /\b(confused|stuck|don't know|help|מבולבל|תקוע|לא יודע|עזרה)\b/i;
const GOAL_KEYWORDS = /goal|target|objective|want to|need to|מטרה|יעד|רוצה|צריך/i;

export function extractChatInsights(
  messages: { role: string; content: string }[],
): ChatInsights {
  const userMessages = messages.filter((m) => m.role === "user");
  const userText = userMessages.map((m) => m.content);

  const mentionedObjections: string[] = [];
  const expressedPainPoints: string[] = [];
  const requestedTopics: string[] = [];

  for (const text of userText) {
    for (const pattern of OBJECTION_PATTERNS) {
      const match = text.match(pattern);
      if (match && !mentionedObjections.includes(match[0])) {
        mentionedObjections.push(match[0]);
      }
    }
    for (const pattern of PAIN_PATTERNS) {
      const match = text.match(pattern);
      if (match && !expressedPainPoints.includes(match[0])) {
        expressedPainPoints.push(match[0]);
      }
    }
    for (const [topic, re] of Object.entries(TOPIC_KEYWORDS)) {
      if (re.test(text) && !requestedTopics.includes(topic)) {
        requestedTopics.push(topic);
      }
    }
  }

  const msgCount = userMessages.length;
  const engagementLevel: ChatInsights["engagementLevel"] =
    msgCount < 3 ? "low" : msgCount < 10 ? "medium" : "high";

  const goalMentions = userText.filter((t) => GOAL_KEYWORDS.test(t)).length;
  const goalClarity = msgCount > 0 ? Math.min(100, Math.round((goalMentions / msgCount) * 100)) : 0;

  let readinessSignal: ChatInsights["readinessSignal"] = "exploring";
  const lastMessages = userText.slice(-3).join(" ");
  if (READY_PATTERNS.test(lastMessages)) readinessSignal = "ready";
  else if (STUCK_PATTERNS.test(lastMessages)) readinessSignal = "stuck";
  else if (EXPLORING_PATTERNS.test(lastMessages)) readinessSignal = "exploring";

  return {
    mentionedObjections,
    expressedPainPoints,
    requestedTopics,
    engagementLevel,
    goalClarity,
    readinessSignal,
  };
}

// ═══════════════════════════════════════════════
// Helper Loaders (read from localStorage / context)
// ═══════════════════════════════════════════════

export function loadChatInsights(): ChatInsights | null {
  try {
    const raw = localStorage.getItem("funnelforge-coach-messages");
    if (!raw) return null;
    const messages = JSON.parse(raw) as { role: string; content: string }[];
    if (!Array.isArray(messages) || messages.length === 0) return null;
    return extractChatInsights(messages);
  } catch {
    return null;
  }
}

export function loadImportedDataSignals(): ImportedDataSignals | null {
  try {
    const raw = localStorage.getItem("funnelforge-data-sources");
    if (!raw) return null;
    const state = JSON.parse(raw);
    const manual = state?.sources?.find((s: { id: string }) => s.id === "manual_import");
    if (!manual || manual.status !== "connected" || !manual.recordCount) return null;
    return {
      datasetType: "custom",
      overallDirection: "stable",
      confidence: manual.recordCount > 30 ? 0.8 : manual.recordCount > 10 ? 0.6 : 0.3,
      metricHighlights: [],
      rowCount: manual.recordCount,
    };
  } catch {
    return null;
  }
}

export function loadMetaSignals(): MetaSignals | null {
  try {
    const raw = localStorage.getItem("funnelforge-meta-monitor");
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state?.connected || !state?.insights) return null;
    const ins = state.insights;
    return {
      connected: true,
      spend: parseFloat(ins.spend) || 0,
      cpl: parseFloat(ins.cpc) || 0,
      ctr: parseFloat(ins.ctr) || 0,
      cvr: 0,
      trendDirection: "stable",
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════
// Cross-Domain Derivation Helpers
// Each function is pure and returns a safe default when its
// primary input is absent, so every existing code path is unaffected.
// ═══════════════════════════════════════════════

function deriveDiscFraming(
  formData: FormData,
): DerivedInsights["discAwareFraming"] {
  // D-types respond to ROI framing, I to social proof, S to stability, C to precision.
  // Without a DISC quiz we approximate from proxy signals in FormData.
  const goal = formData.mainGoal;
  const exp = formData.experienceLevel;
  if (goal === "revenue" || exp === "advanced") return "roi";
  if (goal === "awareness" || goal === "engagement") return "social";
  if (goal === "retention") return "stability";
  if (goal === "leads" && formData.audienceType === "b2b") return "precision";
  return "social"; // safe default for b2c beginners
}

function deriveDiscCommStyle(
  formData: FormData,
  voice: StylomeVoice | null,
): DerivedInsights["discCommunicationStyle"] {
  // Stylome dugri override: highly direct writing → system1 (gut reactions)
  if (voice && voice.dugriScore > 0.7) return "system1";
  if (voice && voice.register === "formal") return "system2";
  // Proxy from FormData: advanced B2B → system2, beginner B2C → system1
  if (formData.experienceLevel === "advanced" && formData.audienceType === "b2b") return "system2";
  if (formData.experienceLevel === "beginner") return "system1";
  return "balanced";
}

function deriveDataConfidence(
  imported: ImportedDataSignals | null | undefined,
  meta: MetaSignals | null | undefined,
): DerivedInsights["dataConfidence"] {
  let sources = 0;
  if (imported && imported.rowCount > 0) sources++;
  if (meta?.connected) sources++;
  // FormData always exists, so a 3rd source is implicit
  if (sources === 0) return "no_data";
  if (sources === 1 && (imported?.rowCount ?? 0) < 30) return "sparse";
  if (sources >= 2) return "rich";
  return "moderate";
}

function deriveUrgencySignal(
  imported: ImportedDataSignals | null | undefined,
): DerivedInsights["urgencySignal"] {
  if (!imported) return "none";
  const declining = imported.metricHighlights.filter(
    (m) => m.direction === "down" && Math.abs(m.changePct) > 10,
  );
  if (imported.overallDirection === "declining" && declining.length >= 2) return "acute";
  if (imported.overallDirection === "declining" || declining.length >= 1) return "mild";
  return "none";
}

function deriveVoiceCalibration(
  voice: StylomeVoice | null | undefined,
  formData: FormData,
): DerivedInsights["voiceCalibration"] {
  if (voice) return voice.register === "casual" ? "dugri" : voice.register;
  // Without voice sample, approximate from business context
  if (formData.businessField === "tech" || formData.audienceType === "b2b") return "formal";
  if (formData.businessField === "personalBrand" || formData.businessField === "food") return "dugri";
  return "mixed";
}

function deriveChatPain(
  chat: ChatInsights | null | undefined,
): DerivedInsights["chatDerivedPain"] {
  if (!chat?.mentionedObjections?.length) return null;
  const first = chat.mentionedObjections[0];
  return { he: first, en: first }; // chat may be in either language
}

function deriveRealMetrics(
  imported: ImportedDataSignals | null | undefined,
  meta: MetaSignals | null | undefined,
): RealMetrics {
  // Prefer Meta (live API) over CSV (static upload)
  const avgCPL = meta?.connected ? meta.cpl : importedMetric(imported, "cpl") ?? null;
  const avgCTR = meta?.connected ? meta.ctr : importedMetric(imported, "ctr") ?? null;
  const avgCVR = meta?.connected ? meta.cvr : importedMetric(imported, "cvr") ?? null;
  const trendDirection = meta?.connected
    ? meta.trendDirection
    : imported?.overallDirection ?? null;
  return { avgCPL, avgCTR, avgCVR, trendDirection };
}

function importedMetric(
  imported: ImportedDataSignals | null | undefined,
  keyword: string,
): number | null {
  if (!imported) return null;
  const match = imported.metricHighlights.find(
    (m) => m.metric.toLowerCase().includes(keyword),
  );
  return match ? match.changePct : null;
}

function deriveColdStartMode(
  behavior: UserBehavior,
  voice: StylomeVoice | null | undefined,
  chat: ChatInsights | null | undefined,
  imported: ImportedDataSignals | null | undefined,
  meta: MetaSignals | null | undefined,
): boolean {
  // Cold start = new user with minimal data enrichment
  const isNew = behavior.visitCount <= 2;
  const noExternalData = !voice && !chat && !imported && !meta?.connected;
  return isNew && noExternalData;
}
