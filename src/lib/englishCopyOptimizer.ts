// ═══════════════════════════════════════════════
// English Neurolinguistics Layer
// Cross-domain: Linguistics × Culture × Neuroscience
// Mirror of hebrewCopyOptimizer for English-speaking markets
// ═══════════════════════════════════════════════

import { calculateBurstiness, analyzeRegisterShifts } from "@/engine/perplexityBurstiness";

export interface EnglishCopyRule {
  id: string;
  name: { he: string; en: string };
  description: { he: string; en: string };
  example: { he: string; en: string };
  category: "specificity" | "power" | "emotion" | "credibility" | "action" | "scarcity" | "benefit" | "readability" | "stylometry";
  emoji: string;
}

export interface EnglishCopyScore {
  total: number; // 0-100
  breakdown: { rule: string; score: number; tip: { he: string; en: string } }[];
}

// ───────────────────────────────────────────────
// Lexicons (English-specific)
// ───────────────────────────────────────────────

const POWER_WORDS = [
  "free", "new", "instant", "proven", "guaranteed", "exclusive", "limited",
  "secret", "breakthrough", "revolutionary", "discover", "unlock", "master",
  "transform", "boost", "skyrocket", "effortless", "ultimate", "premium",
];

const EMOTIONAL_WORDS = [
  "love", "fear", "trust", "safe", "confident", "proud", "excited",
  "hope", "dream", "success", "freedom", "control", "peace", "joy",
  "frustrated", "worried", "tired", "stuck", "overwhelmed",
];

const CREDIBILITY_MARKERS = [
  "study", "research", "data", "proven", "tested", "certified", "award",
  "clients", "customers", "reviews", "rating", "featured in", "trusted by",
  "years of experience", "expert", "phd", "case study", "results",
];

const CTA_WORDS = [
  "get", "start", "try", "join", "claim", "download", "book", "buy",
  "grab", "unlock", "discover", "learn", "register", "sign up", "click",
  "see how", "find out", "take control", "begin",
];

const WEAK_OPENERS = [
  "we are pleased", "we would like", "in this article", "today we will",
  "as you know", "it is important", "i want to", "i think",
];

// Common English words for perplexity filtering (language-agnostic version of hebrew set)
const COMMON_ENGLISH_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "so", "of", "to", "in",
  "on", "at", "by", "for", "with", "from", "as", "into", "about", "over",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "this", "that", "these", "those",
  "not", "no", "yes", "all", "any", "some", "one", "two", "three", "many", "much",
  "more", "most", "other", "such", "than", "then", "when", "where", "why", "how",
  "what", "who", "which", "can", "just", "like", "up", "down", "out", "now",
  "get", "got", "make", "made", "take", "took", "go", "went", "come", "came",
  "see", "saw", "know", "knew", "think", "thought", "say", "said", "tell", "told",
  "give", "gave", "find", "found", "use", "used", "work", "worked", "want", "wanted",
  "need", "needed", "try", "tried", "put", "call", "ask", "asked", "feel", "felt",
  "become", "became", "leave", "left", "let", "mean", "keep", "hold", "bring", "begin",
  "good", "bad", "big", "small", "new", "old", "first", "last", "long", "short",
  "high", "low", "right", "wrong", "same", "different", "few", "own", "real",
  "very", "well", "really", "only", "also", "even", "still", "back", "here", "there",
  "thing", "things", "way", "time", "year", "day", "people", "man", "woman", "child",
  "world", "life", "hand", "part", "place", "case", "week", "company", "system", "group",
]);

// ───────────────────────────────────────────────
// Rules catalog
// ───────────────────────────────────────────────

const ENGLISH_RULES: EnglishCopyRule[] = [
  {
    id: "specificity", category: "specificity", emoji: "🎯",
    name: { he: "ספציפיות אמריקאית", en: "American Specificity" },
    description: { he: "קהל אנגלו מעריך מספרים מדויקים ותוצאות ניתנות למדידה", en: "English-speaking audiences value exact numbers and measurable results" },
    example: { he: "❌ 'helps many businesses' → ✅ 'helped 2,847 SaaS companies scale to $10M ARR'", en: "❌ 'helps many businesses' → ✅ 'helped 2,847 SaaS companies scale to $10M ARR'" },
  },
  {
    id: "power_words", category: "power", emoji: "⚡",
    name: { he: "מילות כוח", en: "Power Words" },
    description: { he: "מילים כמו free, new, instant, proven מעלות CTR ב-20-30%", en: "Words like free, new, instant, proven boost CTR by 20-30%" },
    example: { he: "✅ 'Unlock your free instant access to the proven method'", en: "✅ 'Unlock your free instant access to the proven method'" },
  },
  {
    id: "emotional_arc", category: "emotion", emoji: "🎭",
    name: { he: "קשת רגשית", en: "Emotional Arc" },
    description: { he: "טקסט אמריקאי אפקטיבי נע בין pain → hope → action", en: "Effective American copy moves from pain → hope → action" },
    example: { he: "✅ 'Tired of wasting ad budget? Imagine predictable ROI. Get the blueprint.'", en: "✅ 'Tired of wasting ad budget? Imagine predictable ROI. Get the blueprint.'" },
  },
  {
    id: "credibility_markers", category: "credibility", emoji: "🏆",
    name: { he: "סימני אמינות", en: "Credibility Markers" },
    description: { he: "US/UK מאמינים למחקר, מקרי מבחן, ומיקומים ב-media. סמכות = המרה", en: "US/UK audiences trust research, case studies, media placements. Authority = conversion" },
    example: { he: "✅ 'Featured in Forbes. 4.9★ on Trustpilot (3,400 reviews). Stanford-backed research.'", en: "✅ 'Featured in Forbes. 4.9★ on Trustpilot (3,400 reviews). Stanford-backed research.'" },
  },
  {
    id: "action_cta", category: "action", emoji: "🚀",
    name: { he: "CTA מבוסס פעולה", en: "Action-Oriented CTA" },
    description: { he: "CTA אנגלי חזק מתחיל בפועל פעולה: Get, Start, Claim, Unlock", en: "Strong English CTAs begin with action verbs: Get, Start, Claim, Unlock" },
    example: { he: "❌ 'Learn More' → ✅ 'Claim Your Free Audit' / 'Start My 14-Day Trial'", en: "❌ 'Learn More' → ✅ 'Claim Your Free Audit' / 'Start My 14-Day Trial'" },
  },
  {
    id: "scarcity_authentic", category: "scarcity", emoji: "⏳",
    name: { he: "scarcity אותנטי", en: "Authentic Scarcity" },
    description: { he: "קהל אנגלו חשדני ל-FOMO מזויף. מגבלות אמיתיות עובדות — deadlines, seats, stock", en: "English audiences are skeptical of fake FOMO. Real constraints work — deadlines, seats, stock" },
    example: { he: "❌ 'LIMITED TIME ONLY!!!' → ✅ 'Only 12 spots left. Closes Friday 11:59 PM ET.'", en: "❌ 'LIMITED TIME ONLY!!!' → ✅ 'Only 12 spots left. Closes Friday 11:59 PM ET.'" },
  },
  {
    id: "benefit_framing", category: "benefit", emoji: "💎",
    name: { he: "מסגור תועלות", en: "Benefit Framing" },
    description: { he: "Features tell, benefits sell. תמיד תרגם פיצ'רים לתוצאה אישית", en: "Features tell, benefits sell. Always translate features into personal outcomes" },
    example: { he: "❌ 'AI-powered analytics' → ✅ 'Know exactly which ad spend brings ROI — in 3 clicks'", en: "❌ 'AI-powered analytics' → ✅ 'Know exactly which ad spend brings ROI — in 3 clicks'" },
  },
  {
    id: "readability", category: "readability", emoji: "📖",
    name: { he: "קריאות כיתה 6-8", en: "Grade 6-8 Readability" },
    description: { he: "Flesch-Kincaid 6-8 הוא ה-sweet spot לקופי אמריקאי. מילים קצרות, משפטים קצרים, אפס ז'רגון", en: "Flesch-Kincaid grade 6-8 is the sweet spot for American copy. Short words, short sentences, no jargon" },
    example: { he: "❌ 'leverage synergistic solutions' → ✅ 'use tools that work together'", en: "❌ 'leverage synergistic solutions' → ✅ 'use tools that work together'" },
  },
  // ═══════════════════════════════════════════════
  // SOTA² Stylometry Rules
  // ═══════════════════════════════════════════════
  {
    id: "burstiness", category: "stylometry", emoji: "📊",
    name: { he: "תנודתיות משפטים", en: "Sentence Burstiness" },
    description: { he: "טקסט אנושי מאופיין בשונות גבוהה באורכי משפטים — קצרים ופאנצ'יים לצד מורכבים", en: "Human text has high variance in sentence lengths — short punchy sentences alongside complex ones" },
    example: { he: "✅ 'Stop. Think about it. Because what I'm about to share will completely change how you view marketing.'", en: "✅ 'Stop. Think about it. Because what I'm about to share will completely change how you view marketing.'" },
  },
  {
    id: "lexical_surprise", category: "stylometry", emoji: "🎲",
    name: { he: "הפתעה לשונית", en: "Lexical Surprise" },
    description: { he: "בני אדם בוחרים מילים לא צפויות. AI נוטה למילים סטטיסטית 'בטוחות'", en: "Humans pick unexpected words. AI gravitates to statistically 'safe' vocabulary" },
    example: { he: "❌ 'a great solution' → ✅ 'a cheat code for this operational headache'", en: "❌ 'a great solution' → ✅ 'a cheat code for this operational headache'" },
  },
  {
    id: "register_consistency", category: "stylometry", emoji: "🎭",
    name: { he: "עקביות רגיסטר", en: "Register Consistency" },
    description: { he: "שמור רגיסטר עקבי עם מעברי טון טבעיים — רשמי ואז ישיר", en: "Keep register consistent with natural tone shifts — formal followed by direct" },
    example: { he: "✅ 'Research shows a 47% conversion lift. Bottom line? It works.'", en: "✅ 'Research shows a 47% conversion lift. Bottom line? It works.'" },
  },
  {
    id: "weak_openers", category: "stylometry", emoji: "🚫",
    name: { he: "פתיחים חלשים", en: "Weak Openers" },
    description: { he: "הימנע מ-'we are pleased', 'in this article', 'as you know' — מאבדים קוראים תוך שנייה", en: "Avoid 'we are pleased', 'in this article', 'as you know' — loses readers in one second" },
    example: { he: "❌ 'In this article, we will discuss' → ✅ 'Here's the truth about...'", en: "❌ 'In this article, we will discuss' → ✅ 'Here's the truth about...'" },
  },
];

/**
 * Return all English copy optimization rules
 */
export function getEnglishCopyRules(): EnglishCopyRule[] {
  return ENGLISH_RULES;
}

// ───────────────────────────────────────────────
// English-specific perplexity (rare-word ratio)
// ───────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function englishRareWordRatio(text: string): number {
  const words = tokenize(text)
    .map((w) => w.replace(/[^a-zA-Z]/g, "").toLowerCase())
    .filter((w) => w.length > 1);
  if (words.length === 0) return 0;
  const rare = words.filter((w) => !COMMON_ENGLISH_WORDS.has(w));
  return rare.length / words.length;
}

function englishBigramUniqueness(text: string): number {
  const words = tokenize(text)
    .map((w) => w.replace(/[^a-zA-Z]/g, "").toLowerCase())
    .filter((w) => w.length > 0);
  if (words.length < 2) return 0;
  const seen = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const bi = `${words[i]} ${words[i + 1]}`;
    seen.set(bi, (seen.get(bi) ?? 0) + 1);
  }
  return seen.size / (words.length - 1);
}

function englishLexicalSurprise(text: string): number {
  const rare = englishRareWordRatio(text);
  const uniq = englishBigramUniqueness(text);
  return Math.round(Math.min(rare / 0.6, 1) * 50 + Math.min(uniq / 0.95, 1) * 50);
}

// ───────────────────────────────────────────────
// Main scorer
// ───────────────────────────────────────────────

export function scoreEnglishCopy(text: string): EnglishCopyScore {
  const breakdown: EnglishCopyScore["breakdown"] = [];
  let total = 0;
  const lower = text.toLowerCase();
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);

  // Specificity — numbers present
  const hasNumbers = /\d/.test(text);
  const specScore = hasNumbers ? 12 : 4;
  breakdown.push({
    rule: "specificity", score: specScore,
    tip: {
      he: hasNumbers ? "מספרים ספציפיים — אמינות חזקה!" : "הוסף מספרים קונקרטיים (₪, %, ROI, user count)",
      en: hasNumbers ? "Specific numbers — strong credibility!" : "Add concrete numbers ($, %, ROI, user count)",
    },
  });
  total += specScore;

  // Power words
  const powerCount = POWER_WORDS.filter((w) => lower.includes(w)).length;
  const powerScore = powerCount >= 3 ? 12 : powerCount >= 1 ? 8 : 3;
  breakdown.push({
    rule: "power_words", score: powerScore,
    tip: {
      he: powerCount >= 3 ? "שימוש מעולה במילות כוח!" : "הוסף מילות כוח: free, new, proven, instant, exclusive",
      en: powerCount >= 3 ? "Great use of power words!" : "Add power words: free, new, proven, instant, exclusive",
    },
  });
  total += powerScore;

  // Emotional arc
  const emoCount = EMOTIONAL_WORDS.filter((w) => lower.includes(w)).length;
  const emoScore = emoCount >= 2 ? 10 : emoCount >= 1 ? 6 : 2;
  breakdown.push({
    rule: "emotional_arc", score: emoScore,
    tip: {
      he: emoCount >= 2 ? "קשת רגשית פעילה!" : "הוסף רגש — pain, hope, freedom, control",
      en: emoCount >= 2 ? "Active emotional arc!" : "Add emotion — pain, hope, freedom, control",
    },
  });
  total += emoScore;

  // Credibility markers
  const credCount = CREDIBILITY_MARKERS.filter((w) => lower.includes(w)).length;
  const credScore = credCount >= 2 ? 12 : credCount >= 1 ? 7 : 3;
  breakdown.push({
    rule: "credibility_markers", score: credScore,
    tip: {
      he: credCount >= 2 ? "סמכות ואמינות חזקות!" : "הוסף: clients, reviews, research, featured in...",
      en: credCount >= 2 ? "Strong authority & credibility!" : "Add: clients, reviews, research, featured in...",
    },
  });
  total += credScore;

  // Action CTA
  const hasCTA = CTA_WORDS.some((w) => lower.includes(w));
  const ctaScore = hasCTA ? 12 : 3;
  breakdown.push({
    rule: "action_cta", score: ctaScore,
    tip: {
      he: hasCTA ? "CTA מבוסס פעולה!" : "הוסף CTA: Get / Start / Claim / Unlock",
      en: hasCTA ? "Action-oriented CTA!" : "Add CTA: Get / Start / Claim / Unlock",
    },
  });
  total += ctaScore;

  // Authentic scarcity (not fake FOMO)
  const realScarcity = /(only \d+|spots? left|closes?|deadline|expires?|until \w+day)/i.test(text);
  const fakeScarcity = /!!!|HURRY|ACT NOW|LIMITED TIME ONLY/.test(text);
  const scarcityScore = realScarcity && !fakeScarcity ? 10 : fakeScarcity ? 2 : 5;
  breakdown.push({
    rule: "scarcity_authentic", score: scarcityScore,
    tip: {
      he: fakeScarcity ? "FOMO מזויף פוגע באמינות — השתמש במגבלות אמיתיות" : realScarcity ? "scarcity אותנטי!" : "שקול מגבלה אמיתית (spots, deadline)",
      en: fakeScarcity ? "Fake FOMO hurts credibility — use real constraints" : realScarcity ? "Authentic scarcity!" : "Consider a real constraint (spots, deadline)",
    },
  });
  total += scarcityScore;

  // Benefit framing — "you" ratio as proxy
  const youCount = (lower.match(/\byou(r|rs)?\b/g) || []).length;
  const wordCount = tokenize(text).length;
  const youRatio = wordCount > 0 ? youCount / wordCount : 0;
  const benefitScore = youRatio >= 0.04 ? 10 : youRatio >= 0.02 ? 6 : 2;
  breakdown.push({
    rule: "benefit_framing", score: benefitScore,
    tip: {
      he: youRatio >= 0.04 ? "ממוקד בקורא!" : "החלף 'we/our' ב-'you/your' — מסגר תועלות לקורא",
      en: youRatio >= 0.04 ? "Reader-focused!" : "Replace 'we/our' with 'you/your' — frame benefits for the reader",
    },
  });
  total += benefitScore;

  // Readability — avg words per sentence
  const avgWords = sentences.length > 0
    ? sentences.reduce((s, sent) => s + tokenize(sent).length, 0) / sentences.length
    : 0;
  const readScore = avgWords > 0 && avgWords <= 18 ? 10 : avgWords <= 25 ? 6 : 2;
  breakdown.push({
    rule: "readability", score: readScore,
    tip: {
      he: avgWords <= 18 ? "קריאות מצוינת!" : "קצר את המשפטים — מטרה: 10-15 מילים ממוצע",
      en: avgWords <= 18 ? "Excellent readability!" : "Shorten sentences — target 10-15 words average",
    },
  });
  total += readScore;

  // Weak openers penalty
  const hasWeakOpener = WEAK_OPENERS.some((w) => lower.includes(w));
  const openerScore = hasWeakOpener ? 1 : 6;
  breakdown.push({
    rule: "weak_openers", score: openerScore,
    tip: {
      he: hasWeakOpener ? "הסר פתיחים חלשים ('we are pleased', 'in this article')" : "פתיחה חזקה!",
      en: hasWeakOpener ? "Remove weak openers ('we are pleased', 'in this article')" : "Strong opener!",
    },
  });
  total += openerScore;

  // ═══════════════════════════════════════════════
  // SOTA² Stylometry Scoring (language-agnostic + english-specific)
  // ═══════════════════════════════════════════════

  // Burstiness (language-agnostic)
  const burst = calculateBurstiness(text);
  const burstScore = burst.overallBurstiness >= 50 ? 8 : burst.overallBurstiness >= 30 ? 5 : 2;
  breakdown.push({
    rule: "burstiness", score: burstScore,
    tip: {
      he: burst.overallBurstiness >= 50 ? "תנודתיות טבעית!" : "חלק בין משפטים קצרים וארוכים — 3-8 מילים לצד 20+",
      en: burst.overallBurstiness >= 50 ? "Natural burstiness!" : "Alternate short and long sentences — 3-8 words next to 20+",
    },
  });
  total += burstScore;

  // English lexical surprise
  const surprise = englishLexicalSurprise(text);
  const surpriseScore = surprise >= 50 ? 8 : surprise >= 30 ? 5 : 2;
  breakdown.push({
    rule: "lexical_surprise", score: surpriseScore,
    tip: {
      he: surprise >= 50 ? "מגוון לקסיקלי עשיר!" : "הוסף מילים פחות צפויות וביטויים ייחודיים",
      en: surprise >= 50 ? "Rich lexical diversity!" : "Add less predictable words and unique phrases",
    },
  });
  total += surpriseScore;

  // Register shifts (language-agnostic heuristic — reuses hebrew lexicon gracefully)
  const reg = analyzeRegisterShifts(text);
  const regScore = reg.shiftCount >= 1 && reg.shiftCount <= 3 ? 8 : reg.shiftCount === 0 ? 4 : 3;
  breakdown.push({
    rule: "register_consistency", score: regScore,
    tip: {
      he: reg.shiftCount >= 1 && reg.shiftCount <= 3
        ? "מעברי טון טבעיים!"
        : reg.shiftCount === 0
          ? "הוסף מעבר טון — רשמי ואז ישיר"
          : "יותר מדי מעברי טון — שמור עקביות",
      en: reg.shiftCount >= 1 && reg.shiftCount <= 3
        ? "Natural tone shifts!"
        : reg.shiftCount === 0
          ? "Add a tone shift — formal then direct"
          : "Too many tone shifts — keep consistency",
    },
  });
  total += regScore;

  return { total: Math.min(total, 100), breakdown };
}
