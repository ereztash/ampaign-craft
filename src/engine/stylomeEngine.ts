/**
 * Hebrew Stylome Extractor Engine
 * Analyzes Hebrew writing samples to extract a personal stylistic fingerprint.
 * Produces a clone-ready system prompt for generating content in the user's voice.
 */

import { calculateBurstiness, calculatePerplexity, analyzeRegisterShifts } from "./perplexityBurstiness";

export interface StylomeProfile {
  // Quantitative metrics
  metrics: {
    avgSentenceLength: number;
    shortSentenceRatio: number; // ≤10 words
    longSentenceRatio: number;  // >25 words
    codeMixingIndex: number;    // % of non-Hebrew words
    dugriScore: number;         // 0-1 assertiveness scale
    lexicalDiversity: number;   // TTR (Type-Token Ratio)
    burstiness: number;         // 0-100 sentence length variation (higher = more varied)
    perplexityEstimate: number; // 0-100 lexical surprise (higher = more unexpected)
    registerShiftCount: number; // Number of register transitions in text
  };
  // Qualitative features
  style: {
    register: "formal" | "casual" | "mixed";
    cognitiveStyle: "concrete" | "abstract" | "balanced";
    humor: boolean;
    emotionalIntensity: "low" | "medium" | "high";
    metaphorDomains: string[];
  };
  // Detected patterns
  patterns: {
    topPhrases: string[];       // Frequently used phrases
    pragmaticMarkers: string[]; // Filler words (בעצם, רגע, etc.)
    preferredOpeners: string[]; // How they start sentences
    closingStyle: string;       // How they end messages
  };
  // Generated system prompt
  systemPrompt: string;
  // Sample count
  sampleWordCount: number;
  sampleCount: number;
}

export interface StylomeSample {
  id: string;
  text: string;
  context: "formal" | "informal" | "marketing" | "general";
  wordCount: number;
}

// Hebrew assertive words
const ASSERTIVE_WORDS = ["ברור", "חייב", "חייבת", "אין ספק", "תמיד", "בהחלט", "ודאי", "ללא ספק", "מוכרח", "בטוח", "פשוט", "כמובן"];
const HEDGING_WORDS = ["אולי", "נראה לי", "כנראה", "בערך", "יכול להיות", "אני חושב", "אני חושבת", "לדעתי", "ייתכן", "קצת"];
const PRAGMATIC_MARKERS = ["בעצם", "רגע", "זאת אומרת", "דווקא", "כזה", "כאילו", "נגיד", "טוב", "אז", "יאללה", "סבבה", "בקיצור", "באמת", "ממש", "פשוט"];
const ABSTRACT_PATTERNS = /ה[א-ת]ל[א-ת]|ות$|ויות$|ון$|ות$|ים$|concept|idea|process/i;
const LATIN_PATTERN = /[a-zA-Z]+/g;

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

function sentences(text: string): string[] {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

function countOccurrences(text: string, wordList: string[]): number {
  const lower = text.toLowerCase();
  return wordList.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = lower.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function detectPragmaticMarkers(text: string): string[] {
  return PRAGMATIC_MARKERS.filter((marker) => {
    const regex = new RegExp(`\\b${marker}\\b`, "gi");
    return regex.test(text);
  });
}

function detectTopPhrases(text: string): string[] {
  const words = tokenize(text);
  const bigramMap = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (bigram.length > 5) {
      bigramMap.set(bigram, (bigramMap.get(bigram) || 0) + 1);
    }
  }
  return [...bigramMap.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);
}

function detectRegister(text: string): "formal" | "casual" | "mixed" {
  const casualMarkers = countOccurrences(text, ["יאללה", "סבבה", "כאילו", "חח", "חחח", "אחלה", "וואלה", "סבבה", "כזה", "תכלס"]);
  const formalMarkers = countOccurrences(text, ["לפיכך", "על כן", "יש לציין", "בהתאם", "מבחינת", "לעניין", "עם זאת", "יחד עם זאת", "נוסף על כך"]);
  if (casualMarkers > formalMarkers * 2) return "casual";
  if (formalMarkers > casualMarkers * 2) return "formal";
  return "mixed";
}

function detectCognitiveStyle(text: string): "concrete" | "abstract" | "balanced" {
  const words = tokenize(text);
  const abstractCount = words.filter((w) => ABSTRACT_PATTERNS.test(w)).length;
  const ratio = abstractCount / words.length;
  if (ratio > 0.15) return "abstract";
  if (ratio < 0.05) return "concrete";
  return "balanced";
}

function detectEmotionalIntensity(text: string): "low" | "medium" | "high" {
  const exclamations = (text.match(/!/g) || []).length;
  const emojis = (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
  const emphasis = (text.match(/[\u05D0-\u05EA]{2,}!/g) || []).length;
  const score = exclamations + emojis * 2 + emphasis;
  const perWord = score / Math.max(tokenize(text).length, 1);
  if (perWord > 0.05) return "high";
  if (perWord > 0.02) return "medium";
  return "low";
}

function detectMetaphorDomains(text: string): string[] {
  const domains: string[] = [];
  const lower = text.toLowerCase();
  if (/קרב|לחימה|מלחמה|כיבוש|אסטרטגיה|טקטיקה|מגן|הגנה|חזית|מתקפה/.test(lower)) domains.push("military");
  if (/בניה|יסודות|גשר|תשתית|ארכיטקטורה|בנין|בית/.test(lower)) domains.push("construction");
  if (/מסע|דרך|נתיב|צעד|מפה|ניווט|יעד/.test(lower)) domains.push("journey");
  if (/מנוע|מערכת|אלגוריתם|פלטפורמה|אופטימיזציה|דאטה/.test(lower)) domains.push("technology");
  if (/שתיל|צמיחה|זריעה|קציר|שורשים|פריחה/.test(lower)) domains.push("nature");
  if (/משחק|שחקן|ניקוד|ליגה|תחרות|אליפות/.test(lower)) domains.push("sports");
  return domains;
}

export function analyzeSamples(samples: StylomeSample[]): StylomeProfile {
  const allText = samples.map((s) => s.text).join("\n\n");
  const allWords = tokenize(allText);
  const allSentences = sentences(allText);
  const totalWords = allWords.length;

  // Sentence length metrics
  const sentenceLengths = allSentences.map((s) => tokenize(s).length);
  const avgSentenceLength = sentenceLengths.length > 0
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
    : 0;
  const shortSentenceRatio = sentenceLengths.filter((l) => l <= 10).length / Math.max(sentenceLengths.length, 1);
  const longSentenceRatio = sentenceLengths.filter((l) => l > 25).length / Math.max(sentenceLengths.length, 1);

  // Code-Mixing Index
  const latinWords = allText.match(LATIN_PATTERN) || [];
  const codeMixingIndex = (latinWords.length / Math.max(totalWords, 1)) * 100;

  // Dugri Score
  const assertive = countOccurrences(allText, ASSERTIVE_WORDS);
  const hedging = countOccurrences(allText, HEDGING_WORDS);
  const dugriScore = assertive / Math.max(assertive + hedging + 1, 1);

  // Lexical Diversity (TTR)
  const uniqueWords = new Set(allWords.map((w) => w.toLowerCase()));
  const lexicalDiversity = uniqueWords.size / Math.max(totalWords, 1);

  // Perplexity & Burstiness (SOTA² metrics)
  const pbBurstiness = calculateBurstiness(allText);
  const pbPerplexity = calculatePerplexity(allText);
  const pbRegisterShifts = analyzeRegisterShifts(allText);

  // Qualitative
  const register = detectRegister(allText);
  const cognitiveStyle = detectCognitiveStyle(allText);
  const humor = /חח|חחח|😂|🤣|😄|אירוני|סרקסטי/.test(allText);
  const emotionalIntensity = detectEmotionalIntensity(allText);
  const metaphorDomains = detectMetaphorDomains(allText);

  // Patterns
  const pragmaticMarkers = detectPragmaticMarkers(allText);
  const topPhrases = detectTopPhrases(allText);

  // Detect preferred sentence openers
  const openers = allSentences.slice(0, 20).map((s) => {
    const words = tokenize(s);
    return words.slice(0, 2).join(" ");
  });
  const openerCounts = new Map<string, number>();
  openers.forEach((o) => openerCounts.set(o, (openerCounts.get(o) || 0) + 1));
  const preferredOpeners = [...openerCounts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([opener]) => opener);

  // Closing style detection
  const lastSentences = samples.map((s) => {
    const sents = sentences(s.text);
    return sents[sents.length - 1] || "";
  });
  const hasQuestions = lastSentences.filter((s) => s.includes("?")).length > lastSentences.length * 0.3;
  const closingStyle = hasQuestions ? "שואל שאלה סוג��ת" : "מסיים בהצהרה";

  const profile: StylomeProfile = {
    metrics: {
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      shortSentenceRatio: Math.round(shortSentenceRatio * 100) / 100,
      longSentenceRatio: Math.round(longSentenceRatio * 100) / 100,
      codeMixingIndex: Math.round(codeMixingIndex * 10) / 10,
      dugriScore: Math.round(dugriScore * 100) / 100,
      lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
      burstiness: pbBurstiness.overallBurstiness,
      perplexityEstimate: pbPerplexity.lexicalSurprise,
      registerShiftCount: pbRegisterShifts.shiftCount,
    },
    style: { register, cognitiveStyle, humor, emotionalIntensity, metaphorDomains },
    patterns: { topPhrases, pragmaticMarkers, preferredOpeners, closingStyle },
    systemPrompt: "", // Will be generated below
    sampleWordCount: totalWords,
    sampleCount: samples.length,
  };

  profile.systemPrompt = generateSystemPrompt(profile);
  return profile;
}

function generateSystemPrompt(profile: StylomeProfile): string {
  const { metrics, style, patterns } = profile;

  const registerDesc = style.register === "formal" ? "רשמי ומקצועי"
    : style.register === "casual" ? "לא פורמלי, שיחתי ודוגרי"
    : "משלב רשמי ולא-פורמלי בהתאם להקשר";

  const cognitiveDesc = style.cognitiveStyle === "concrete" ? "קונקרטי – משתמש בדוגמאות מוחשיות ומספרים"
    : style.cognitiveStyle === "abstract" ? "מופשט – מתאר רעיונות, תהליכים ומושגים"
    : "מאוזן – משלב בין קונקרטי למופשט";

  const emotionDesc = style.emotionalIntensity === "high" ? "גבוהה – שימוש תכוף בסימני קריאה, אימוג'ים וביטויי הדגשה"
    : style.emotionalIntensity === "medium" ? "בינונית – ביטויים רגשיים מדודים"
    : "נמוכה – כתיבה מרוסנת ועניינית";

  const markers = patterns.pragmaticMarkers.length > 0
    ? `שלב את הסמנים הפרגמטיים הבאים באופן טבעי: ${patterns.pragmaticMarkers.join(", ")}`
    : "אל תשתמש בסמנים פרגמטיים מיותרים";

  const metaphors = style.metaphorDomains.length > 0
    ? `השתמש במטאפורות מעולם ה${style.metaphorDomains.join(", ")}`
    : "השת��ש במטאפורות לפי ההקשר";

  return `אתה כותב תוכן בסגנון אישי ייחודי. הנה המאפיינים:

## סגנון כתיבה
- רגיסטר: ${registerDesc}
- נטייה קוגניטיבית: ${cognitiveDesc}
- עוצמה רגשית: ${emotionDesc}
- ${style.humor ? "משתמש בהומור ואירוניה" : "כתיבה רצינית, בלי הומור מיותר"}

## מבנה משפטים
- אורך משפט ממוצע: ${metrics.avgSentenceLength} מילים
- ${metrics.shortSentenceRatio > 0.4 ? "נטייה למשפטים קצרים ופאנצ'יים" : metrics.longSentenceRatio > 0.3 ? "נטייה למשפטים ארוכים ומורכבים" : "שילוב של משפטים קצרים וארוכים"}
- מגוון מילוני (TTR): ${metrics.lexicalDiversity} (${metrics.lexicalDiversity > 0.5 ? "עשיר" : "ממוקד"})

## שפה ומונחים
- ציון דוגרי: ${metrics.dugriScore} (${metrics.dugriScore > 0.6 ? "ישיר ונחרץ" : metrics.dugriScore < 0.3 ? "זהיר ומאופק" : "מאוזן"})
- ערבוב שפות: ${metrics.codeMixingIndex}% (${metrics.codeMixingIndex > 10 ? "משלב הרבה מונחים באנגלית" : metrics.codeMixingIndex > 3 ? "משלב מונחים מקצועיים באנגלית" : "כותב בעיקר בעברית"})
- ${markers}
- ${metaphors}

## תנודתיות ומגוון (Anti-AI Fingerprint)
- ציון תנודתיות (Burstiness): ${metrics.burstiness}/100 — ${metrics.burstiness > 60 ? "שמור על שונות גבוהה באורכי משפטים" : metrics.burstiness > 30 ? "הגדל שונות באורכי משפטים" : "חייב לגוון דרמטית בין משפטים קצרים לארוכים"}
- ציון הפתעה לשונית: ${metrics.perplexityEstimate}/100 — ${metrics.perplexityEstimate > 60 ? "השתמש במילים מפתיעות כמו הכותב" : "הוסף מילים פחות צפויות ומונחים ייחודיים"}
${metrics.registerShiftCount > 0 ? `- מעברי רגיסטר: ${metrics.registerShiftCount} — שלב מעברי טון טבעיים בין פורמלי ללא-פורמלי` : "- כתיבה ברגיסטר אחיד — שמור על עקביות"}

## כללים
- ${patterns.closingStyle}
${patterns.topPhrases.length > 0 ? `- ביטויים שכיחים שכדאי לשלב: ${patterns.topPhrases.join(", ")}` : ""}
- כתוב עברית טבעית. אם לא בטוח, השתמש בדפוס ההמנעות של הכותב (גידור אם הציון נמוך, ישירות אם גבוה).`;
}

// Interview questions for deepening analysis
export const INTERVIEW_QUESTIONS: { he: string; en: string }[] = [
  { he: "איך היית מסביר מושג מורכב לילד לעומת קולגה מקצועי? תן דוגמה.", en: "How would you explain a complex concept to a child vs. a professional colleague? Give examples." },
  { he: "האם אתה משתמש הרבה במטאפורות? מאיזה עולם? תן דוגמה.", en: "Do you use metaphors often? From what domain? Give an example." },
  { he: "תראה לי איך אתה מביע סרקזם בכתיבה.", en: "Show me how you express sarcasm in writing." },
  { he: "מה ההבדל בסגנון שלך בין הודעת WhatsApp לחבר לבין מייל רשמי?", en: "What's the style difference between a WhatsApp to a friend and a formal email?" },
  { he: "יש מילים או ביטויים שאתה משתמש בהם יותר מדי? (בעצם, זאת אומרת, רגע...)", en: "Are there words/phrases you overuse? (e.g., 'basically', 'I mean', etc.)" },
  { he: "אתה נוטה למשפטים ארוכים ומורכבים או קצרים ותכליתיים? תן דוגמה.", en: "Do you tend toward long complex sentences or short punchy ones? Give an example." },
];
