// ═══════════════════════════════════════════════
// Perplexity & Burstiness Engine
// Cross-domain: Computational Linguistics x AI Detection x Stylometry
// Measures "humanness" of text via statistical variation patterns
// ═══════════════════════════════════════════════

export interface BurstinessMetrics {
  sentenceLengthCV: number;      // Coefficient of variation of sentence lengths
  paragraphLengthCV: number;     // CV of paragraph lengths
  punctuationDensityCV: number;  // CV of punctuation density across paragraphs
  overallBurstiness: number;     // 0-100 composite score (higher = more human-like)
}

export interface PerplexityMetrics {
  rareWordRatio: number;         // % of words not in top-1000 Hebrew frequency list
  bigramSurpriseScore: number;   // Average unexpectedness of word pairs
  lexicalSurprise: number;       // 0-100 composite (higher = more human-like)
}

export interface RegisterShiftMetrics {
  shiftCount: number;            // Number of register transitions detected
  segments: RegisterSegment[];   // Identified register segments
  consistency: number;           // 0-100 (100 = perfectly consistent, lower = more shifts)
}

export interface RegisterSegment {
  startIndex: number;
  endIndex: number;
  register: "formal" | "casual" | "slang";
}

export interface AIDetectionScore {
  humanScore: number;            // 0-100 (100 = very human-like)
  burstiness: BurstinessMetrics;
  perplexity: PerplexityMetrics;
  registerShift: RegisterShiftMetrics;
  verdict: "human" | "likely-human" | "uncertain" | "likely-ai" | "ai";
  tips: { he: string; en: string }[];
}

// ═══════════════════════════════════════════════
// HEBREW WORD FREQUENCY (top common words — inverted for rarity detection)
// ═══════════════════════════════════════════════

const COMMON_HEBREW_WORDS = new Set([
  "של", "את", "על", "זה", "לא", "הוא", "היא", "אני", "מה", "גם",
  "כל", "עם", "או", "אם", "יש", "אבל", "כי", "רק", "אז", "עוד",
  "הם", "היה", "הן", "לו", "בו", "ביו", "כך", "אין", "כמו", "לי",
  "שלי", "שלו", "שלה", "שלך", "שלנו", "שלהם", "בין", "עד", "אחרי",
  "לפני", "תוך", "ללא", "למה", "איך", "מי", "איפה", "מתי", "כמה",
  "כדי", "צריך", "יכול", "רוצה", "חושב", "יודע", "אומר", "עושה",
  "נותן", "בא", "הולך", "שם", "פה", "כאן", "שם", "היום", "אתמול",
  "מחר", "עכשיו", "תמיד", "אף", "שום", "כבר", "בכלל", "ממש", "מאוד",
  "טוב", "רע", "גדול", "קטן", "חדש", "ישן", "ראשון", "אחרון", "הרבה",
  "מעט", "אחד", "שני", "שלוש", "ארבע", "חמש", "עשר", "מאה", "אלף",
  "דבר", "אדם", "איש", "אישה", "ילד", "בית", "יום", "שנה", "חודש",
  "שבוע", "שעה", "דקה", "עבודה", "כסף", "זמן", "מקום", "דרך", "חיים",
  "עולם", "ארץ", "מדינה", "שאלה", "תשובה", "בעיה", "פתרון", "סיבה",
  "תוצאה", "חלק", "שלב", "סוג", "צורה", "מצב", "שינוי", "תהליך",
  "מערכת", "פעם", "נקודה", "סוף", "התחלה", "ואני", "ואת", "ואם",
  "בכל", "לכל", "מכל", "שכל", "אפילו", "בגלל", "לגבי", "בנוגע",
  "לפי", "באמצעות", "ביחד", "לבד", "בנפרד", "בהחלט", "כנראה",
  "אולי", "בטח", "ודאי", "אפשר", "חייב", "מוכרח", "להיות", "לעשות",
  "לתת", "לקחת", "לבוא", "ללכת", "לראות", "לשמוע", "להגיד", "לדבר",
  "לחשוב", "לדעת", "להבין", "לרצות", "לאהוב", "לשנות", "להתחיל",
]);

const FORMAL_MARKERS = new Set([
  "לפיכך", "על כן", "יש לציין", "בהתאם", "מבחינת", "לעניין",
  "עם זאת", "יחד עם זאת", "נוסף על כך", "הנדון", "בהמשך לכך",
  "אשר", "הינו", "הינה", "מתכבד", "נא", "בכבוד רב", "לכבוד",
  "מאחר ש", "היות ו", "בשל", "עקב", "לאור", "כפי ש", "מן הראוי",
]);

const CASUAL_MARKERS = new Set([
  "יאללה", "סבבה", "כאילו", "חח", "חחח", "אחלה", "וואלה",
  "תכלס", "בקיצור", "בגדול", "פשוט", "כזה", "נגיד", "ברור",
  "סתם", "ממש", "חחחח", "לול", "בטירוף", "מטורף", "אחי",
]);

const SLANG_MARKERS = new Set([
  "אחי", "גבר", "חביבי", "יא", "מושלם", "שווה", "סוף הדרך",
  "תותח", "אלוף", "וואו", "פצצה", "בומבה", "חבל על הזמן",
  "לא נורמלי", "משוגע", "מטורף", "על הפנים", "חרא", "עזוב",
]);

// ═══════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════

function tokenize(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  return text.split(/\s+/).filter((w) => w.length > 0);
}

function splitSentences(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  return text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

function splitParagraphs(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
}

function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function countPunctuation(text: string): number {
  return (text.match(/[,;:!?.\-—–()[\]{}""''״׳]/g) || []).length;
}

// ═══════════════════════════════════════════════
// BURSTINESS CALCULATOR
// ═══════════════════════════════════════════════

export function calculateBurstiness(text: string): BurstinessMetrics {
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text);

  // Sentence length CV
  const sentenceLengths = sentences.map((s) => tokenize(s).length);
  const sentenceLengthCV = coefficientOfVariation(sentenceLengths);

  // Paragraph length CV
  const paragraphLengths = paragraphs.map((p) => tokenize(p).length);
  const paragraphLengthCV = paragraphs.length >= 2
    ? coefficientOfVariation(paragraphLengths)
    : 0;

  // Punctuation density CV across paragraphs
  const punctuationDensities = paragraphs.map((p) => {
    const words = tokenize(p).length;
    return words > 0 ? countPunctuation(p) / words : 0;
  });
  const punctuationDensityCV = paragraphs.length >= 2
    ? coefficientOfVariation(punctuationDensities)
    : 0;

  // Composite burstiness: human text typically has CV > 0.5 for sentences
  // AI text tends toward CV < 0.3 (monotonous uniformity)
  const rawScore = (
    Math.min(sentenceLengthCV / 0.8, 1) * 50 +
    Math.min(paragraphLengthCV / 0.6, 1) * 25 +
    Math.min(punctuationDensityCV / 0.5, 1) * 25
  );

  return {
    sentenceLengthCV: Math.round(sentenceLengthCV * 1000) / 1000,
    paragraphLengthCV: Math.round(paragraphLengthCV * 1000) / 1000,
    punctuationDensityCV: Math.round(punctuationDensityCV * 1000) / 1000,
    overallBurstiness: Math.round(Math.min(rawScore, 100)),
  };
}

// ═══════════════════════════════════════════════
// PERPLEXITY HEURISTIC
// ═══════════════════════════════════════════════

export function calculatePerplexity(text: string): PerplexityMetrics {
  const words = tokenize(text).map((w) => w.replace(/[^\u0590-\u05FFa-zA-Z]/g, "").toLowerCase());
  const hebrewWords = words.filter((w) => /[\u0590-\u05FF]/.test(w) && w.length > 1);

  // Rare word ratio: words NOT in common frequency list
  const rareWords = hebrewWords.filter((w) => !COMMON_HEBREW_WORDS.has(w));
  const rareWordRatio = hebrewWords.length > 0
    ? rareWords.length / hebrewWords.length
    : 0;

  // Bigram surprise: measure how often consecutive word pairs repeat
  // Repetitive bigrams = lower surprise = more AI-like
  const bigrams = new Map<string, number>();
  for (let i = 0; i < hebrewWords.length - 1; i++) {
    const bigram = `${hebrewWords[i]} ${hebrewWords[i + 1]}`;
    bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
  }
  const totalBigrams = Math.max(hebrewWords.length - 1, 1);
  const uniqueBigrams = bigrams.size;
  const bigramSurpriseScore = totalBigrams > 0 ? uniqueBigrams / totalBigrams : 0;

  // Composite: human text has more rare words and unique bigrams
  // AI tends toward common vocabulary and repetitive patterns
  const lexicalSurprise = Math.round(
    Math.min(rareWordRatio / 0.6, 1) * 50 +
    Math.min(bigramSurpriseScore / 0.95, 1) * 50
  );

  return {
    rareWordRatio: Math.round(rareWordRatio * 1000) / 1000,
    bigramSurpriseScore: Math.round(bigramSurpriseScore * 1000) / 1000,
    lexicalSurprise: Math.min(lexicalSurprise, 100),
  };
}

// ═══════════════════════════════════════════════
// REGISTER SHIFT ANALYZER
// ═══════════════════════════════════════════════

function classifySentenceRegister(sentence: string): "formal" | "casual" | "slang" {
  const lower = sentence.toLowerCase();
  const words = tokenize(lower);

  let formalCount = 0;
  let casualCount = 0;
  let slangCount = 0;

  for (const word of words) {
    if (FORMAL_MARKERS.has(word)) formalCount++;
    if (CASUAL_MARKERS.has(word)) casualCount++;
    if (SLANG_MARKERS.has(word)) slangCount++;
  }

  // Also check multi-word markers
  for (const marker of FORMAL_MARKERS) {
    if (marker.includes(" ") && lower.includes(marker)) formalCount++;
  }

  if (slangCount > 0 && slangCount >= formalCount) return "slang";
  if (formalCount > casualCount) return "formal";
  if (casualCount > 0) return "casual";
  return "casual"; // Hebrew default register
}

export function analyzeRegisterShifts(text: string): RegisterShiftMetrics {
  const sentences = splitSentences(text);
  if (sentences.length < 2) {
    return { shiftCount: 0, segments: [], consistency: 100 };
  }

  const registers = sentences.map((s) => classifySentenceRegister(s));

  // Build segments
  const segments: RegisterSegment[] = [];
  let currentRegister = registers[0];
  let startIndex = 0;

  for (let i = 1; i < registers.length; i++) {
    if (registers[i] !== currentRegister) {
      segments.push({ startIndex, endIndex: i - 1, register: currentRegister });
      currentRegister = registers[i];
      startIndex = i;
    }
  }
  segments.push({ startIndex, endIndex: registers.length - 1, register: currentRegister });

  const shiftCount = segments.length - 1;

  // Consistency: 100 if no shifts, decreases with more shifts
  const consistency = Math.max(0, Math.round(100 - (shiftCount / Math.max(sentences.length - 1, 1)) * 100));

  return { shiftCount, segments, consistency };
}

// ═══════════════════════════════════════════════
// COMBINED AI DETECTION SCORE
// ═══════════════════════════════════════════════

export function analyzeAIDetection(text: string): AIDetectionScore {
  const burstiness = calculateBurstiness(text);
  const perplexity = calculatePerplexity(text);
  const registerShift = analyzeRegisterShifts(text);

  // Human text characteristics:
  // - High burstiness (varied sentence lengths): weight 40%
  // - High lexical surprise (unexpected word choices): weight 35%
  // - Some register shifts (natural register mixing): weight 25%
  //   (both 0 shifts and excessive shifts are suspicious)
  const registerScore = registerShift.shiftCount === 0
    ? 30  // Perfectly consistent = slightly suspicious
    : registerShift.shiftCount <= 3
      ? 80  // Natural variation
      : Math.max(20, 80 - (registerShift.shiftCount - 3) * 10); // Too many = chaotic

  const humanScore = Math.round(
    burstiness.overallBurstiness * 0.4 +
    perplexity.lexicalSurprise * 0.35 +
    registerScore * 0.25
  );

  const verdict: AIDetectionScore["verdict"] =
    humanScore >= 75 ? "human" :
    humanScore >= 60 ? "likely-human" :
    humanScore >= 40 ? "uncertain" :
    humanScore >= 25 ? "likely-ai" : "ai";

  const tips: { he: string; en: string }[] = [];

  if (burstiness.overallBurstiness < 40) {
    tips.push({
      he: "שנה את אורכי המשפטים — חלופה בין משפטים קצרים (3-8 מילים) לארוכים (20+) תייצר תחושה אנושית יותר",
      en: "Vary sentence lengths — alternating short (3-8 words) and long (20+) sentences creates a more human feel",
    });
  }

  if (perplexity.lexicalSurprise < 40) {
    tips.push({
      he: "הגדל מגוון מילוני — השתמש במילים פחות צפויות, סלנג מקצועי, או ביטויים ייחודיים במקום מילים כלליות",
      en: "Increase lexical diversity — use less predictable words, industry jargon, or unique phrases instead of generic terms",
    });
  }

  if (registerShift.shiftCount === 0 && splitSentences(text).length > 3) {
    tips.push({
      he: "הוסף שינויי טון — ערבב בין משפטים רשמיים ופחות פורמליים כדי ליצור קול אנושי אותנטי",
      en: "Add tone variation — mix formal and informal sentences to create an authentic human voice",
    });
  }

  if (burstiness.punctuationDensityCV < 0.2) {
    tips.push({
      he: "שנה דפוסי פיסוק — אל תשתמש באותו מבנה פיסוק בכל פסקה",
      en: "Vary punctuation patterns — don't use the same punctuation structure in every paragraph",
    });
  }

  return { humanScore, burstiness, perplexity, registerShift, verdict, tips };
}
