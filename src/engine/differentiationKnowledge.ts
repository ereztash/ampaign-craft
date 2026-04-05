// ═══════════════════════════════════════════════
// Differentiation Agent — Embedded Knowledge Base (B2B + B2C)
// Cross-domain: Sales Psychology × Behavioral Economics × Consumer Behavior × Brand Theory
// ═══════════════════════════════════════════════

import { HiddenValueType, CompetitorArchetypeId, BuyingCommitteeRoleId, InfluenceNetworkRoleId, MarketMode, B2CCompetitorArchetypeId } from "@/types/differentiation";

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

// ═══════════════════════════════════════════════
// B2C KNOWLEDGE (Consumer Markets)
// ═══════════════════════════════════════════════

// === B2C HIDDEN VALUES (6 new) ===

export const B2C_HIDDEN_VALUES: readonly HiddenValueDef[] = [
  { id: "convenience", he: "נוחות", en: "Convenience",
    probe: { he: "כמה קל לקנות ממך? כמה צעדים עד לרכישה?", en: "How easy is it to buy from you? How many steps to purchase?" },
    signals: ["one-click purchase", "fast delivery", "easy returns", "mobile-first"] },
  { id: "aesthetic", he: "אסתטיקה", en: "Aesthetic",
    probe: { he: "האם המוצר/אריזה/חנות שלך גורמים לאנשים לצלם ולשתף?", en: "Does your product/packaging/store make people photograph and share?" },
    signals: ["instagram-worthy packaging", "brand design language", "unboxing experience"] },
  { id: "belonging", he: "שייכות", en: "Belonging",
    probe: { he: "האם הלקוחות שלך מרגישים חלק מקהילה/שבט?", en: "Do your customers feel part of a community/tribe?" },
    signals: ["community group", "brand hashtag usage", "user meetups", "exclusive membership"] },
  { id: "self_expression", he: "ביטוי עצמי", en: "Self-Expression",
    probe: { he: "מה המוצר שלך אומר על מי שקונה אותו?", en: "What does your product say about the person who buys it?" },
    signals: ["visible brand logo", "customization options", "lifestyle association"] },
  { id: "guilt_free", he: "ללא אשמה", en: "Guilt-Free",
    probe: { he: "האם הלקוח יכול להרגיש טוב עם הרכישה? (אתי, בריא, ירוק)", en: "Can the customer feel good about the purchase? (ethical, healthy, green)" },
    signals: ["sustainability claims", "ethical sourcing", "health benefits", "carbon neutral"] },
  { id: "instant_gratification", he: "סיפוק מיידי", en: "Instant Gratification",
    probe: { he: "כמה מהר הלקוח מרגיש את הערך אחרי הרכישה?", en: "How quickly does the customer feel value after purchase?" },
    signals: ["same-day delivery", "instant download", "immediate results", "quick onboarding"] },
];

// === B2C COMPETITOR ARCHETYPES (5) ===

export interface B2CCompetitorArchetypeDef {
  id: B2CCompetitorArchetypeId;
  he: string;
  en: string;
  description: { he: string; en: string };
  dangerSign: string;
  counterStrategy: string;
}

export const B2C_COMPETITOR_ARCHETYPES: readonly B2CCompetitorArchetypeDef[] = [
  { id: "category_king", he: "מלך הקטגוריה", en: "The Category King",
    description: { he: "שולט בשם הקטגוריה במוח הצרכן", en: "Owns the category name in consumers' minds" },
    dangerSign: "People use their brand name as the category name",
    counterStrategy: "Create a sub-category or redefine the job-to-be-done. Don't compete in their category — create yours." },
  { id: "price_anchor", he: "עוגן המחיר", en: "The Price Anchor",
    description: { he: "האופציה הכי זולה שמגדירה ציפיות מחיר", en: "Cheapest option that sets price expectations" },
    dangerSign: "Customers compare your price to theirs first",
    counterStrategy: "Make the value gap visible. Show total cost of cheap: quality, returns, support. Frame as investment vs expense." },
  { id: "lifestyle_brand", he: "מותג סגנון חיים", en: "The Lifestyle Brand",
    description: { he: "מוכר זהות, לא מוצר", en: "Sells identity, not product" },
    dangerSign: "Customers buy for the logo, not the product",
    counterStrategy: "Out-authentic them. Serve a sub-identity they ignore. Build on substance over image." },
  { id: "platform_aggregator", he: "הפלטפורמה", en: "The Platform/Aggregator",
    description: { he: "מרקטפלייס שממסחר את המוכרים", en: "Marketplace that commoditizes sellers" },
    dangerSign: "Customers find you through them, not directly",
    counterStrategy: "Build direct relationships and owned channels. Create experiences the platform can't replicate." },
  { id: "creator_led", he: "מותג של יוצר", en: "The Creator-Led Brand",
    description: { he: "מותג עם קהל מובנה דרך משפיען/יוצר", en: "Brand with built-in audience via influencer/creator" },
    dangerSign: "Has distribution (followers) you don't",
    counterStrategy: "Emphasize substance over personality. Build community, not following. Show what happens when the creator moves on." },
];

// === B2C INFLUENCE NETWORK ROLES (6) ===

export interface InfluenceNetworkRoleDef {
  id: InfluenceNetworkRoleId;
  he: string;
  en: string;
  primaryConcern: string;
  informationNeed: string;
}

export const INFLUENCE_NETWORK_ROLES: readonly InfluenceNetworkRoleDef[] = [
  { id: "self", he: "הקונה עצמו", en: "Self (Primary Buyer)",
    primaryConcern: "Does this solve my need/desire?",
    informationNeed: "Product page, reviews, trial/demo, price transparency" },
  { id: "household_gatekeeper", he: "שומר הסף הביתי", en: "Household Gatekeeper",
    primaryConcern: "Can we afford this? Is it worth it?",
    informationNeed: "Price justification, value comparison, return policy" },
  { id: "peer_circle", he: "מעגל חברים", en: "Peer Circle",
    primaryConcern: "What will they think of this choice?",
    informationNeed: "Social proof, trending status, peer reviews" },
  { id: "digital_influencer", he: "משפיען דיגיטלי", en: "Digital Influencer",
    primaryConcern: "Is this authentic enough to recommend?",
    informationNeed: "Product quality, brand story, visual appeal, affiliate terms" },
  { id: "algorithm", he: "אלגוריתם", en: "Algorithm",
    primaryConcern: "Is this content engaging enough to surface?",
    informationNeed: "SEO, social signals, engagement rate, relevance scoring" },
  { id: "culture_zeitgeist", he: "רוח התקופה", en: "Culture/Zeitgeist",
    primaryConcern: "Is this culturally relevant right now?",
    informationNeed: "Trend alignment, cultural moment, seasonal relevance" },
];

// === B2C CONTRARY METRICS (5) ===

export const B2C_CONTRARY_METRICS: readonly ContraryMetricDef[] = [
  { name: { he: "שיעור רכישה חוזרת", en: "Repeat Purchase Rate" },
    description: { he: "כמה לקוחות חוזרים לקנות שוב בלי שמבקשים?", en: "How many customers return to buy again without being asked?" },
    target: "30%+", whyContrary: "Most track acquisition. This tracks loyalty proof." },
  { name: { he: "חיפוש מותג אורגני", en: "Organic Brand Search Volume" },
    description: { he: "כמה אנשים מחפשים אותך בשם בגוגל?", en: "How many people search for you by name on Google?" },
    target: "+20%/quarter", whyContrary: "Most track paid reach. This tracks if people remember you." },
  { name: { he: "שיעור שיתוף חברתי", en: "Social Sharing Rate" },
    description: { he: "כמה לקוחות משתפים את המוצר ברשתות בלי שמבקשים?", en: "How many customers share the product on social without being asked?" },
    target: "5%+", whyContrary: "Most track NPS. This tracks unprompted advocacy." },
  { name: { he: "כמות UGC", en: "User-Generated Content Count" },
    description: { he: "כמה תכנים לקוחות יוצרים עליך ספונטנית?", en: "How much content do customers create about you spontaneously?" },
    target: "10+/month", whyContrary: "Most track testimonials they collected. This tracks organic love." },
  { name: { he: "מדד רגישות מחיר", en: "Price Sensitivity Index" },
    description: { he: "האם הלקוחות היו משלמים יותר? כמה יותר?", en: "Would customers pay more? How much more?" },
    target: "+15% willingness", whyContrary: "Most compete on price. This measures brand premium power." },
];

// === B2C NORMALIZING FRAMES ===

export const B2C_NORMALIZING_FRAMES = {
  supply_chain: {
    he: "רוב המותגים בתחום שלך יש להם לפחות חלק אחד בשרשרת האספקה שהם מעדיפים שהלקוחות לא ידעו עליו. מה החלק הזה אצלך?",
    en: "Most brands in your category have at least one part of their supply chain they prefer customers not know about. What is that for you?",
  },
  quality_gap: {
    he: "כל מותג יודע על פער אחד בין מה שהוא מבטיח למה שהלקוח באמת מקבל. מה הפער הזה אצלך?",
    en: "Every brand knows about a gap between what they promise and what the customer actually gets. What is that gap for you?",
  },
  customer_disappointment: {
    he: "מה הביקורת הכי כואבת שקיבלת? זו שאתה יודע שיש בה אמת.",
    en: "What is the most painful review you received? The one you know has some truth in it.",
  },
  price_anxiety: {
    he: "כשאתה רואה את המחיר של המתחרה הזול ביותר — מה אתה מרגיש? לא כעס, אלא חרדה.",
    en: "When you see your cheapest competitor's price — what do you feel? Not anger, but anxiety.",
  },
} as const;

// ═══════════════════════════════════════════════
// MODE-FILTER FUNCTIONS
// ═══════════════════════════════════════════════

export function getHiddenValuesForMode(mode: MarketMode): HiddenValueDef[] {
  const universal = HIDDEN_VALUES.filter((v) =>
    ["legitimacy", "risk", "identity", "cognitive_ease", "status", "narrative"].includes(v.id)
  );
  if (mode === "b2b") return [...universal, ...HIDDEN_VALUES.filter((v) => ["autonomy", "empathy"].includes(v.id))];
  if (mode === "b2c") return [...universal, ...B2C_HIDDEN_VALUES];
  // hybrid: all
  return [...universal, ...HIDDEN_VALUES.filter((v) => ["autonomy", "empathy"].includes(v.id)), ...B2C_HIDDEN_VALUES];
}

export function getCompetitorArchetypesForMode(mode: MarketMode): (CompetitorArchetypeDef | B2CCompetitorArchetypeDef)[] {
  if (mode === "b2b") return [...COMPETITOR_ARCHETYPES];
  if (mode === "b2c") return [...B2C_COMPETITOR_ARCHETYPES];
  return [...COMPETITOR_ARCHETYPES, ...B2C_COMPETITOR_ARCHETYPES];
}

export function getContraryMetricsForMode(mode: MarketMode): ContraryMetricDef[] {
  if (mode === "b2b") return [...CONTRARY_METRICS];
  if (mode === "b2c") return [...B2C_CONTRARY_METRICS];
  return [...CONTRARY_METRICS.slice(0, 3), ...B2C_CONTRARY_METRICS.slice(0, 3)];
}
