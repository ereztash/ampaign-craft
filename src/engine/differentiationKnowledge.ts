// ═══════════════════════════════════════════════
// B2B Differentiation Agent — Embedded Knowledge Base
// Cross-domain: Sales Psychology × Behavioral Economics × Org Theory
// ═══════════════════════════════════════════════

import { HiddenValueType, CompetitorArchetypeId, BuyingCommitteeRoleId } from "@/types/differentiation";

// === HIDDEN VALUES (8 buyer decision drivers) ===

export interface HiddenValueDef {
  id: HiddenValueType;
  he: string;
  en: string;
  probe: { he: string; en: string };
  signals: string[];
}

export const HIDDEN_VALUES: readonly HiddenValueDef[] = [
  { id: "legitimacy", he: "לגיטימיות", en: "Legitimacy",
    probe: { he: "האם הבחירה בך תגרום לי להיראות מוכשר?", en: "Will choosing you make me look competent?" },
    signals: ["references from known brands", "case studies with metrics", "industry certifications"] },
  { id: "risk", he: "סיכון", en: "Risk",
    probe: { he: "האם אני יכול להצדיק את הבחירה הזו אם היא תיכשל?", en: "Can I justify this if it fails?" },
    signals: ["pilot program", "money-back guarantee", "phased rollout", "exit clause"] },
  { id: "identity", he: "זהות", en: "Identity",
    probe: { he: "האם זה מתיישב עם מי שאני רוצה להיות?", en: "Does this align with who I want to be?" },
    signals: ["values alignment", "brand aesthetics match", "cultural fit"] },
  { id: "cognitive_ease", he: "קלות קוגניטיבית", en: "Cognitive Ease",
    probe: { he: "כמה קל להבין ולהסביר את זה?", en: "How easy is this to explain to my boss?" },
    signals: ["one-sentence pitch", "visual framework", "comparison chart"] },
  { id: "autonomy", he: "אוטונומיה", en: "Autonomy",
    probe: { he: "האם אני שומר שליטה או מוסר אותה?", en: "Do I keep control or hand it over?" },
    signals: ["self-service options", "customization", "no vendor lock-in"] },
  { id: "status", he: "סטטוס", en: "Status",
    probe: { he: "האם זה מרומם את המעמד שלי?", en: "Does this elevate my position?" },
    signals: ["exclusive access", "thought leadership association", "innovation signal"] },
  { id: "empathy", he: "אמפתיה", en: "Empathy",
    probe: { he: "האם הם מבינים את המצב האמיתי שלי?", en: "Do they understand my actual situation?" },
    signals: ["industry-specific language", "acknowledged constraints", "realistic timelines"] },
  { id: "narrative", he: "נרטיב", en: "Narrative",
    probe: { he: "האם אני יכול לספר סיפור על למה בחרתי בזה?", en: "Can I tell a story about why I chose this?" },
    signals: ["origin story", "transformation arc", "before/after clarity"] },
] as const;

// === COMPETITOR ARCHETYPES (5 types) ===

export interface CompetitorArchetypeDef {
  id: CompetitorArchetypeId;
  he: string;
  en: string;
  description: { he: string; en: string };
  dangerSign: string;
  counterStrategy: string;
}

export const COMPETITOR_ARCHETYPES: readonly CompetitorArchetypeDef[] = [
  { id: "laser_focused", he: "הלייזר", en: "The Laser",
    description: { he: "מתמחה בנישה צרה ועושה אותה מצוין", en: "Hyper-specialized in one niche" },
    dangerSign: "They own the narrative in one specific area",
    counterStrategy: "Don't compete on their turf. Show the cost of narrow scope — what breaks when the niche assumption fails." },
  { id: "quiet_vendor", he: "הספק השקט", en: "The Quiet Vendor",
    description: { he: "לא מדבר על בידול, מנצח במחיר וביחסים", en: "Wins on price and relationships, not positioning" },
    dangerSign: "Procurement defaults to them because switching feels risky",
    counterStrategy: "Make the hidden cost visible. Calculate total cost of mediocrity over 3 years." },
  { id: "hidden_cost_engineer", he: "מהנדס העלויות הנסתרות", en: "The Hidden Cost Engineer",
    description: { he: "מחיר כניסה נמוך, עלויות נסתרות גבוהות", en: "Low entry price, high hidden costs" },
    dangerSign: "Looks cheaper until month 6",
    counterStrategy: "Build a TCO calculator. Show the 18-month truth." },
  { id: "political_disruptor", he: "המשבש הפוליטי", en: "The Political Disruptor",
    description: { he: "מנצח דרך קשרים פוליטיים, לא דרך מוצר", en: "Wins through political connections, not product" },
    dangerSign: "Has executive-level relationships you don't",
    counterStrategy: "Arm the Technical Evaluator with data that makes the political choice embarrassing." },
  { id: "unexpected_joiner", he: "הנכנס הבלתי צפוי", en: "The Unexpected Market Joiner",
    description: { he: "שחקן מתחום אחר שנכנס לשוק שלך", en: "Player from adjacent market entering yours" },
    dangerSign: "Has resources and distribution you don't",
    counterStrategy: "Emphasize domain depth. Show what they will learn the hard way in 12 months." },
] as const;

// === BUYING COMMITTEE ROLES (7 roles) ===

export interface BuyingCommitteeRoleDef {
  id: BuyingCommitteeRoleId;
  he: string;
  en: string;
  primaryConcern: string;
  informationNeed: string;
  signalType: "market_maker" | "informed_trader" | "noise_trader" | "adversarial";
}

export const BUYING_COMMITTEE_ROLES: readonly BuyingCommitteeRoleDef[] = [
  { id: "champion", he: "אלוף פנימי", en: "Champion",
    primaryConcern: "Will this make ME successful?",
    informationNeed: "Internal pitch materials, ROI framework, risk mitigation talking points",
    signalType: "market_maker" },
  { id: "technical_evaluator", he: "מעריך טכני", en: "Technical Evaluator",
    primaryConcern: "Does this actually work? Can we integrate it?",
    informationNeed: "Architecture docs, API specs, security audit, performance benchmarks",
    signalType: "informed_trader" },
  { id: "economic_buyer", he: "מחליט כלכלי", en: "Economic Buyer",
    primaryConcern: "What's the ROI and payback period?",
    informationNeed: "Business case, TCO analysis, comparable deal outcomes",
    signalType: "informed_trader" },
  { id: "end_user", he: "משתמש קצה", en: "End User",
    primaryConcern: "Will this make my daily work better or worse?",
    informationNeed: "Demo, trial, peer reviews, training scope",
    signalType: "noise_trader" },
  { id: "legal_gatekeeper", he: "שומר סף משפטי", en: "Legal Gatekeeper",
    primaryConcern: "Does this create liability or compliance risk?",
    informationNeed: "DPA, SLA, insurance, compliance certifications",
    signalType: "noise_trader" },
  { id: "executive_sponsor", he: "חסות ניהולית", en: "Executive Sponsor",
    primaryConcern: "Does this align with our strategic direction?",
    informationNeed: "Strategic alignment brief, competitor intelligence, market trends",
    signalType: "market_maker" },
  { id: "saboteur", he: "חבלן", en: "Saboteur",
    primaryConcern: "This threatens my budget/headcount/relevance",
    informationNeed: "NOTHING — must be neutralized through other roles",
    signalType: "adversarial" },
] as const;

// === DIFFERENTIATION SIGNALS ===

export const FAKE_DIFFERENTIATION_SIGNALS: readonly string[] = [
  "Uses adjectives instead of mechanisms ('innovative', 'cutting-edge', 'best-in-class')",
  "Cannot name a specific customer who chose them FOR this differentiator",
  "Competitors say the same thing on their website",
  "No measurable outcome tied to the differentiator",
  "Differentiator disappears when you remove the company name",
  "Based on features, not on outcomes or processes",
  "No tradeoff declared — claims to be best at everything",
  "Cannot explain what they deliberately chose NOT to do",
  "Differentiation is about the founder, not the mechanism",
  "Changes positioning every quarter",
] as const;

export const REAL_DIFFERENTIATION_SIGNALS: readonly string[] = [
  "Can explain the HOW, not just the WHAT",
  "Has a named mechanism or methodology",
  "Willing to declare what they do NOT do",
  "At least one customer story that demonstrates the mechanism in action",
  "A measurable contrary metric they track",
] as const;

// === HYBRID CATEGORIES (10 combinations) ===

export interface HybridCategoryDef {
  name: { he: string; en: string };
  description: string;
}

export const HYBRID_CATEGORIES: readonly HybridCategoryDef[] = [
  { name: { he: "יועץ-מוצר", en: "Consultant-Product" }, description: "Advisory expertise packaged as self-service tool + human layer" },
  { name: { he: "נתונים-נרטיב", en: "Data-Narrative" }, description: "Quantitative analysis delivered as a compelling story, not a dashboard" },
  { name: { he: "אבטחה-חוויה", en: "Security-Experience" }, description: "Security/compliance delivered as seamless UX, not friction" },
  { name: { he: "מסורת-חדשנות", en: "Legacy-Innovation" }, description: "Respects existing systems while introducing new capability" },
  { name: { he: "מקומי-גלובלי", en: "Local-Global" }, description: "Deep local market knowledge with global methodology" },
  { name: { he: "מהירות-עומק", en: "Speed-Depth" }, description: "Fast delivery without sacrificing analytical rigor" },
  { name: { he: "טכני-אנושי", en: "Technical-Human" }, description: "Engineering precision with behavioral science understanding" },
  { name: { he: "שקיפות-ביצועים", en: "Transparency-Performance" }, description: "Full visibility into process without slowing outcomes" },
  { name: { he: "פשטות-מורכבות", en: "Simplicity-Complexity" }, description: "Simple interface handling genuinely complex underlying problems" },
  { name: { he: "מדידה-אינטואיציה", en: "Measurement-Intuition" }, description: "Data-driven decisions that account for unmeasurable human factors" },
] as const;

// === CONTRARY METRICS (5 non-obvious KPIs) ===

export interface ContraryMetricDef {
  name: { he: string; en: string };
  description: { he: string; en: string };
  target: string;
  whyContrary: string;
}

export const CONTRARY_METRICS: readonly ContraryMetricDef[] = [
  { name: { he: "זמן החלטה", en: "Decision Latency" },
    description: { he: "זמן מהמגע הראשון לחתימה. קצר יותר = פוזישנינג חזק יותר", en: "Time from first contact to signed deal. Shorter = stronger positioning." },
    target: "<30 days", whyContrary: "Most track pipeline size. This tracks pipeline SPEED." },
  { name: { he: "הפניות יזומות", en: "Customer-Initiated Introductions" },
    description: { he: "הפניות שקורות בלי שביקשת", en: "Referrals that happen without being asked." },
    target: "3+/quarter", whyContrary: "Most track NPS. This tracks unprompted advocacy." },
  { name: { he: "קצב הרחבת תקציב", en: "Budget Expansion Rate" },
    description: { he: "כמה הלקוח מרחיב הוצאה בלי שנמכר לו?", en: "How much does the customer expand spend without being upsold?" },
    target: "+20%/year", whyContrary: "Most track retention. This tracks voluntary deepening." },
  { name: { he: "שיעור עקירת מתחרה", en: "Competitive Displacement Rate" },
    description: { he: "כמה פעמים לקוחות מחליפים מתחרה באמצע חוזה?", en: "How often do customers replace a competitor with you mid-contract?" },
    target: "15%+", whyContrary: "Most track new logos. This tracks conviction strength." },
  { name: { he: "יעילות הסבר", en: "Explanation Efficiency" },
    description: { he: "כמה שניות לוקח ללקוח להסביר מה אתה עושה למישהו אחר?", en: "How many seconds does it take a customer to explain what you do?" },
    target: "<15 sec", whyContrary: "Most track brand awareness. This tracks brand CLARITY." },
] as const;

// === NORMALIZING FRAMES (shame-reducing probes) ===

export const NORMALIZING_FRAMES = {
  process: {
    he: "רוב החברות בתעשייה שלך יש להן לפחות תהליך אחד שהן מעדיפות שלקוחות לא יראו. מה התהליך הזה אצלך?",
    en: "Most companies in your industry have at least one process they prefer clients not to see. What is that process for you?",
  },
  knowledge: {
    he: "בכל תחום יש פערי ידע שכולם מכירים אבל אף אחד לא מדבר עליהם. מה פער הידע שאתה פוגש הכי הרבה?",
    en: "Every field has knowledge gaps everyone knows about but nobody discusses. What gap do you encounter most?",
  },
  resource: {
    he: "אם היית מקבל תקציב כפול, מה הדבר הראשון שהיית מתקן שהיום אתה מתבייש בו?",
    en: "If you had double the budget, what is the first thing you would fix that you are currently embarrassed about?",
  },
  comparison: {
    he: "כשאתה מסתכל על המתחרים, מה הם עושים שגורם לך לחוש אי-נוחות? לא קנאה — אי-נוחות.",
    en: "When you look at competitors, what do they do that causes you discomfort? Not envy — discomfort.",
  },
} as const;
