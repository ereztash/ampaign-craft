// ═══════════════════════════════════════════════
// B2B Differentiation Agent — Phase Definitions
// 5 phases with questions, AI enrichment flags
// ═══════════════════════════════════════════════

import { PhaseConfig, PhaseId, PhaseQuestion, DifferentiationFormData } from "@/types/differentiation";

// === PHASE 1: SURFACE LAYER ===

const PHASE_1_QUESTIONS: PhaseQuestion[] = [
  { id: "businessName", type: "text", required: true,
    label: { he: "שם העסק", en: "Business Name" },
    placeholder: { he: "שם החברה שלך", en: "Your company name" } },
  { id: "industry", type: "text", required: true,
    label: { he: "תעשייה / תחום", en: "Industry / Domain" },
    placeholder: { he: "לדוגמה: SaaS, ייעוץ ניהולי, אבטחת סייבר", en: "e.g. SaaS, Management Consulting, Cybersecurity" } },
  { id: "targetMarket", type: "select", required: true,
    label: { he: "שוק יעד", en: "Target Market" },
    options: [
      { value: "b2b", label: { he: "B2B כללי", en: "General B2B" } },
      { value: "b2b_enterprise", label: { he: "B2B Enterprise", en: "B2B Enterprise" } },
      { value: "b2b_smb", label: { he: "B2B SMB", en: "B2B SMB" } },
      { value: "b2b_gov", label: { he: "B2B ממשלתי", en: "B2B Government" } },
    ] },
  { id: "companySize", type: "select", required: true,
    label: { he: "גודל החברה שלך", en: "Your Company Size" },
    options: [
      { value: "solo", label: { he: "עצמאי", en: "Solo" } },
      { value: "2-10", label: { he: "2-10 עובדים", en: "2-10 employees" } },
      { value: "11-50", label: { he: "11-50 עובדים", en: "11-50 employees" } },
      { value: "51-200", label: { he: "51-200 עובדים", en: "51-200 employees" } },
      { value: "200+", label: { he: "200+ עובדים", en: "200+ employees" } },
    ] },
  { id: "currentPositioning", type: "textarea", required: true,
    label: { he: "מה הבידול שלך היום?", en: "What is your current differentiation?" },
    placeholder: { he: "איך אתה מתאר את מה שמבדל אותך ממתחרים? (2-3 משפטים)", en: "How do you describe what makes you different from competitors? (2-3 sentences)" },
    helperText: { he: "כתוב את מה שאתה אומר ללקוחות — לא מה שאתה רוצה שזה יהיה", en: "Write what you actually tell customers — not what you wish it was" } },
  { id: "topCompetitors", type: "competitor-list", required: true, maxItems: 3,
    label: { he: "3 המתחרים המובילים שלך", en: "Your Top 3 Competitors" },
    placeholder: { he: "שם המתחרה", en: "Competitor name" } },
  { id: "priceRange", type: "select", required: true,
    label: { he: "מיצוב מחיר", en: "Price Positioning" },
    options: [
      { value: "budget", label: { he: "תקציבי (הכי זול בשוק)", en: "Budget (cheapest in market)" } },
      { value: "mid", label: { he: "אמצע שוק", en: "Mid-market" } },
      { value: "premium", label: { he: "פרימיום", en: "Premium" } },
      { value: "enterprise", label: { he: "Enterprise (custom pricing)", en: "Enterprise (custom pricing)" } },
    ] },
];

// === PHASE 2: CONTRADICTION-LOSS ===

const PHASE_2_QUESTIONS: PhaseQuestion[] = [
  { id: "claimExamples", type: "claim-evidence-pairs", required: true,
    label: { he: "הוכח את הטענות שלך", en: "Prove Your Claims" },
    helperText: { he: "לכל טענת בידול — תן ראיה. לקוח ספציפי, מספר, תוצאה. אם אין — זה בסדר, נזהה את הפערים.", en: "For each differentiation claim — provide evidence. A specific client, number, result. If you can't — that's OK, we'll identify the gaps." } },
  { id: "customerQuote", type: "textarea", required: true,
    label: { he: "ציטוט לקוח", en: "Customer Quote" },
    placeholder: { he: "צטט לקוח שבחר בך בגלל הבידול שציינת", en: "Quote a customer who chose you because of the differentiation you stated" },
    helperText: { he: "אם אין לך ציטוט ספציפי — כתוב מה לקוחות אומרים באופן כללי", en: "If you don't have a specific quote — write what customers generally say" } },
  { id: "lostDealReason", type: "textarea", required: true,
    label: { he: "למה הפסדת את הדיל האחרון?", en: "Why did you lose the last deal?" },
    placeholder: { he: "מה הסיבה שהלקוח האחרון שאיבדת בחר במתחרה?", en: "What reason did the last customer you lost give for choosing a competitor?" } },
  { id: "competitorOverlap", type: "textarea", required: true,
    label: { he: "מה המתחרים אומרים שנשמע כמוך?", en: "What do competitors say that sounds like you?" },
    placeholder: { he: "הסתכל על האתר של המתחרה — מה שם שנשמע בדיוק כמו מה שאתה אומר?", en: "Look at your competitor's website — what there sounds exactly like what you say?" } },
];

// === PHASE 3: HIDDEN LAYER ===

const PHASE_3_QUESTIONS: PhaseQuestion[] = [
  { id: "ashamedPain_process", type: "textarea", required: true,
    label: { he: "תהליך נסתר", en: "Hidden Process" },
    normalizingFrame: { he: "רוב החברות בתעשייה שלך יש להן לפחות תהליך אחד שהן מעדיפות שלקוחות לא יראו.", en: "Most companies in your industry have at least one process they prefer clients not to see." },
    placeholder: { he: "מה התהליך הזה אצלך?", en: "What is that process for you?" } },
  { id: "ashamedPain_knowledge", type: "textarea", required: true,
    label: { he: "פער ידע", en: "Knowledge Gap" },
    normalizingFrame: { he: "בכל תחום יש פערי ידע שכולם מכירים אבל אף אחד לא מדבר עליהם.", en: "Every field has knowledge gaps everyone knows about but nobody discusses." },
    placeholder: { he: "מה פער הידע שאתה פוגש הכי הרבה?", en: "What gap do you encounter most?" } },
  { id: "ashamedPain_resource", type: "textarea", required: true,
    label: { he: "מה היית מתקן?", en: "What would you fix?" },
    normalizingFrame: { he: "אם היית מקבל תקציב כפול, מה הדבר הראשון שהיית מתקן?", en: "If you had double the budget, what's the first thing you'd fix?" },
    placeholder: { he: "הדבר שהיום אתה מתבייש בו...", en: "The thing you're currently embarrassed about..." } },
  { id: "ashamedPain_comparison", type: "textarea", required: true,
    label: { he: "אי-נוחות מול מתחרים", en: "Competitor Discomfort" },
    normalizingFrame: { he: "כשאתה מסתכל על המתחרים, מה הם עושים שגורם לך לחוש אי-נוחות? לא קנאה — אי-נוחות.", en: "When you look at competitors, what causes you discomfort? Not envy — discomfort." },
    placeholder: { he: "מה גורם לך לאי-נוחות?", en: "What causes your discomfort?" } },
  { id: "hiddenValues", type: "slider", required: true,
    label: { he: "8 ערכים נסתרים — דרג כל אחד 1-5", en: "8 Hidden Values — Rate each 1-5" },
    helperText: { he: "כמה חשוב כל ערך ללקוחות שלך (לא מה הם אומרים — מה שבאמת משפיע על ההחלטה)", en: "How important is each value to your buyers (not what they say — what actually drives the decision)" } },
  { id: "internalFriction", type: "textarea", required: false,
    label: { he: "חיכוך פנימי", en: "Internal Friction" },
    placeholder: { he: "איזה תהליך פנימי לעולם לא היית מראה ללקוח?", en: "What internal process would you never show a client?" } },
];

// === PHASE 4: MARKET MAPPING ===

const PHASE_4_QUESTIONS: PhaseQuestion[] = [
  { id: "competitorArchetypes", type: "multi-select", required: true,
    label: { he: "סווג את המתחרים שלך", en: "Classify Your Competitors" },
    helperText: { he: "לכל מתחרה שציינת — בחר את הארכיטיפ המתאים", en: "For each competitor you listed — choose the matching archetype" },
    options: [
      { value: "laser_focused", label: { he: "🎯 הלייזר — מתמחה בנישה צרה", en: "🎯 The Laser — hyper-specialized" } },
      { value: "quiet_vendor", label: { he: "🤫 הספק השקט — מנצח במחיר וביחסים", en: "🤫 Quiet Vendor — wins on price/relationships" } },
      { value: "hidden_cost_engineer", label: { he: "💸 מהנדס עלויות נסתרות — זול בכניסה", en: "💸 Hidden Cost Engineer — cheap entry" } },
      { value: "political_disruptor", label: { he: "🏛️ המשבש הפוליטי — מנצח דרך קשרים", en: "🏛️ Political Disruptor — wins via connections" } },
      { value: "unexpected_joiner", label: { he: "🚀 הנכנס הבלתי צפוי — מתחום אחר", en: "🚀 Unexpected Joiner — from adjacent market" } },
    ] },
  { id: "buyingCommittee", type: "multi-select", required: true,
    label: { he: "מי בוועדת הקנייה?", en: "Who's on the Buying Committee?" },
    helperText: { he: "סמן את התפקידים שמעורבים בהחלטת הרכישה אצל הלקוחות שלך", en: "Mark the roles involved in your customers' purchase decision" },
    options: [
      { value: "champion", label: { he: "🏆 אלוף פנימי", en: "🏆 Champion" } },
      { value: "technical_evaluator", label: { he: "🔧 מעריך טכני", en: "🔧 Technical Evaluator" } },
      { value: "economic_buyer", label: { he: "💰 מחליט כלכלי", en: "💰 Economic Buyer" } },
      { value: "end_user", label: { he: "👤 משתמש קצה", en: "👤 End User" } },
      { value: "legal_gatekeeper", label: { he: "⚖️ שומר סף משפטי", en: "⚖️ Legal Gatekeeper" } },
      { value: "executive_sponsor", label: { he: "🎖️ חסות ניהולית", en: "🎖️ Executive Sponsor" } },
      { value: "saboteur", label: { he: "🚫 חבלן (מישהו שנגדכם)", en: "🚫 Saboteur (someone against you)" } },
    ] },
  { id: "decisionLatency", type: "select", required: true,
    label: { he: "כמה זמן לוקח ללקוחות להחליט?", en: "How long does it take clients to decide?" },
    options: [
      { value: "days", label: { he: "ימים", en: "Days" } },
      { value: "weeks", label: { he: "שבועות", en: "Weeks" } },
      { value: "months", label: { he: "חודשים", en: "Months" } },
      { value: "quarters", label: { he: "רבעונים", en: "Quarters" } },
    ] },
];

// === PHASE 5: SYNTHESIS (no user questions — AI generates) ===

const PHASE_5_QUESTIONS: PhaseQuestion[] = []; // AI-only phase

// === PHASES ARRAY ===

export const PHASES: PhaseConfig[] = [
  {
    id: "surface", number: 1, color: "#3B82F6", icon: "Layers",
    title: { he: "שכבת פנים", en: "Surface Layer" },
    description: { he: "מה אתה אומר שמבדל אותך? נתחיל ממה שנראה בחוץ.", en: "What do you say differentiates you? Let's start with the visible layer." },
    questions: PHASE_1_QUESTIONS, aiEnrichment: false,
  },
  {
    id: "contradiction", number: 2, color: "#F59E0B", icon: "SearchCheck",
    title: { he: "מבחן הסתירה", en: "Contradiction Test" },
    description: { he: "בוא נבדוק — כמה מהטענות שלך עומדות בפני ראיות?", en: "Let's test — how many of your claims survive evidence?" },
    questions: PHASE_2_QUESTIONS, aiEnrichment: true,
  },
  {
    id: "hidden", number: 3, color: "#8B5CF6", icon: "Eye",
    title: { he: "השכבה הנסתרת", en: "Hidden Layer" },
    description: { he: "מה שמפריע לך הכי הרבה — זה בדיוק מה שמבדל אותך", en: "What bothers you the most — that's exactly what differentiates you" },
    questions: PHASE_3_QUESTIONS, aiEnrichment: true,
  },
  {
    id: "mapping", number: 4, color: "#10B981", icon: "Map",
    title: { he: "מיפוי שוק", en: "Market Mapping" },
    description: { he: "מי המתחרים ומי מחליט? נבנה את מפת הקרב", en: "Who are the competitors and who decides? Let's build the battle map" },
    questions: PHASE_4_QUESTIONS, aiEnrichment: true,
  },
  {
    id: "synthesis", number: 5, color: "#B87333", icon: "Sparkles",
    title: { he: "סינתזה", en: "Synthesis" },
    description: { he: "מכל מה שגילינו — ה-AI בונה את הבידול האמיתי שלך", en: "From everything we discovered — AI builds your real differentiation" },
    questions: PHASE_5_QUESTIONS, aiEnrichment: true,
  },
];

export function getPhaseById(id: PhaseId): PhaseConfig {
  return PHASES.find((p) => p.id === id) || PHASES[0];
}

export function getQuestionsForPhase(phaseId: PhaseId, _formData: DifferentiationFormData): PhaseQuestion[] {
  const phase = getPhaseById(phaseId);
  return phase.questions;
}
