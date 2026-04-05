// ═══════════════════════════════════════════════
// Hebrew Neurolinguistics Layer
// Cross-domain: Linguistics × Culture × Neuroscience
// ═══════════════════════════════════════════════

export interface HebrewCopyRule {
  id: string;
  name: { he: string; en: string };
  description: { he: string; en: string };
  example: { he: string; en: string };
  category: "directness" | "trust" | "emotion" | "formality" | "cultural";
  emoji: string;
}

export interface HebrewCopyScore {
  total: number; // 0-100
  breakdown: { rule: string; score: number; tip: { he: string; en: string } }[];
}

const HEBREW_RULES: HebrewCopyRule[] = [
  {
    id: "directness", category: "directness", emoji: "🎯",
    name: { he: "ישירות ישראלית", en: "Israeli Directness" },
    description: { he: "ישראלים מעדיפים תקשורת ישירה. קצר = טוב. בלי פלאפי.", en: "Israelis prefer direct communication. Short = good. No fluff." },
    example: { he: "❌ 'אנו שמחים להציע לך' → ✅ 'קבל 20% הנחה עכשיו'", en: "❌ 'We are pleased to offer' → ✅ 'Get 20% off now'" },
  },
  {
    id: "trust_signals", category: "trust", emoji: "🛡️",
    name: { he: "אותות אמון ישראליים", en: "Israeli Trust Signals" },
    description: { he: "בישראל, אמון בנוי על קשרים אישיים, שירות צבאי משותף, ואוניברסיטאות מוכרות", en: "In Israel, trust builds on personal connections, shared military service, recognized universities" },
    example: { he: "✅ 'יוצא 8200' / 'בוגר טכניון' / 'מומלץ ע\"י X (שאתה מכיר)'", en: "✅ '8200 alumni' / 'Technion graduate' / 'Recommended by X (who you know)'" },
  },
  {
    id: "emotional_triggers", category: "emotion", emoji: "💪",
    name: { he: "טריגרים רגשיים תרבותיים", en: "Cultural Emotional Triggers" },
    description: { he: "4 מילות מפתח שמניעות ישראלים: שליטה, ביטחון, קהילה, הצלחה", en: "4 key words that drive Israelis: control, security, community, success" },
    example: { he: "✅ 'תהיה בשליטה על התקציב שלך' / 'ביטחון כלכלי' / 'הצטרף לקהילה'", en: "✅ 'Take control of your budget' / 'Financial security' / 'Join the community'" },
  },
  {
    id: "whatsapp_tone", category: "formality", emoji: "📱",
    name: { he: "טון WhatsApp", en: "WhatsApp Tone" },
    description: { he: "98% מהישראלים בוואטסאפ. הטון: אישי, קצר, עם אימוג'י מינימלי, בגובה העיניים", en: "98% of Israelis use WhatsApp. Tone: personal, short, minimal emoji, eye-level" },
    example: { he: "✅ 'היי [שם], ראיתי שהתעניינת ב-X. יש לי משהו שיעניין אותך — רגע של זמן?'", en: "✅ 'Hey [name], saw you were interested in X. Got something for you — got a sec?'" },
  },
  {
    id: "social_proof_il", category: "cultural", emoji: "🇮🇱",
    name: { he: "הוכחה חברתית ישראלית", en: "Israeli Social Proof" },
    description: { he: "ישראלים מאמינים להמלצות של חברים (93%). Google Reviews > כל פרסומת", en: "Israelis trust friend recommendations (93%). Google Reviews > any advertisement" },
    example: { he: "✅ 'הצטרפו ל-2,400+ עסקים ישראליים' / '4.8 כוכבים ב-Google (340 ביקורות)'", en: "✅ 'Join 2,400+ Israeli businesses' / '4.8 stars on Google (340 reviews)'" },
  },
  {
    id: "urgency_il", category: "emotion", emoji: "⏰",
    name: { he: "דחיפות בסגנון ישראלי", en: "Israeli-Style Urgency" },
    description: { he: "ישראלים חשדניים ל-FOMO מזויף. דחיפות אמיתית עובדת — מלאי מוגבל, תאריך סיום ברור", en: "Israelis are suspicious of fake FOMO. Real urgency works — limited stock, clear end date" },
    example: { he: "❌ 'ממהרים!!!' → ✅ 'נשארו 12 מקומות. נסגר ביום חמישי 22:00'", en: "❌ 'HURRY!!!' → ✅ '12 spots left. Closes Thursday 10 PM'" },
  },
  {
    id: "price_framing", category: "cultural", emoji: "💰",
    name: { he: "מסגור מחיר ישראלי", en: "Israeli Price Framing" },
    description: { he: "ישראלים משווים מחירים אובססיבית. הראה ערך יחסי — לא רק מחיר מוחלט", en: "Israelis compare prices obsessively. Show relative value — not just absolute price" },
    example: { he: "✅ 'פחות מקפה ביום (₪6)' / 'חוסך לך ₪2,000 בחודש — עולה רק ₪99'", en: "✅ 'Less than a coffee a day (₪6)' / 'Saves you ₪2,000/month — costs only ₪99'" },
  },
  {
    id: "gender_aware", category: "directness", emoji: "👤",
    name: { he: "מודעות מגדרית בעברית", en: "Hebrew Gender Awareness" },
    description: { he: "עברית היא שפה מגדרית. פנייה בגוף שני נקבה/זכר משפיעה על תחושת הרלוונטיות", en: "Hebrew is gendered. Addressing in female/male 2nd person affects perceived relevance" },
    example: { he: "✅ 'רוצה/רוצה לגלות...' (אם לא יודעים מגדר) או פנייה ממוקדת לפי קהל היעד", en: "✅ Use inclusive forms or target by audience gender for maximum relevance" },
  },
];

/**
 * Get all Hebrew copy optimization rules
 */
export function getHebrewCopyRules(): HebrewCopyRule[] {
  return HEBREW_RULES;
}

/**
 * Score copy text against Hebrew optimization rules (simplified heuristic)
 */
export function scoreHebrewCopy(text: string): HebrewCopyScore {
  const breakdown: HebrewCopyScore["breakdown"] = [];
  let total = 0;

  // Directness: shorter sentences = better
  const sentences = text.split(/[.!?]/).filter(Boolean);
  const avgLen = sentences.reduce((s, sent) => s + sent.trim().length, 0) / Math.max(sentences.length, 1);
  const directScore = avgLen < 40 ? 15 : avgLen < 60 ? 10 : avgLen < 80 ? 6 : 3;
  breakdown.push({ rule: "directness", score: directScore, tip: { he: avgLen > 60 ? "קצר את המשפטים — ישראלים מעדיפים ישיר" : "אורך משפט טוב!", en: avgLen > 60 ? "Shorten sentences — Israelis prefer direct" : "Good sentence length!" } });
  total += directScore;

  // Trust signals: check for trust keywords
  const trustWords = ["ביקורות", "כוכבים", "לקוחות", "מומלץ", "reviews", "stars", "clients", "recommended", "בוגר", "alumni"];
  const hasTrust = trustWords.some((w) => text.toLowerCase().includes(w));
  const trustScore = hasTrust ? 15 : 5;
  breakdown.push({ rule: "trust_signals", score: trustScore, tip: { he: hasTrust ? "יש אותות אמון!" : "הוסף הוכחה חברתית / ביקורות / מספרים", en: hasTrust ? "Trust signals present!" : "Add social proof / reviews / numbers" } });
  total += trustScore;

  // Emotional triggers
  const emotionWords = ["שליטה", "ביטחון", "קהילה", "הצלחה", "control", "security", "community", "success", "חסוך", "save"];
  const emotionCount = emotionWords.filter((w) => text.toLowerCase().includes(w)).length;
  const emotionScore = emotionCount >= 3 ? 15 : emotionCount >= 1 ? 10 : 4;
  breakdown.push({ rule: "emotional_triggers", score: emotionScore, tip: { he: emotionCount < 2 ? "הוסף מילות כוח: שליטה, ביטחון, קהילה, הצלחה" : "שימוש טוב במילות כוח!", en: emotionCount < 2 ? "Add power words: control, security, community, success" : "Good use of power words!" } });
  total += emotionScore;

  // Numbers / specificity
  const hasNumbers = /\d+/.test(text);
  const numberScore = hasNumbers ? 12 : 4;
  breakdown.push({ rule: "specificity", score: numberScore, tip: { he: hasNumbers ? "מספרים ספציפיים מחזקים אמינות!" : "הוסף מספרים ספציפיים (₪, %, כמויות)", en: hasNumbers ? "Specific numbers boost credibility!" : "Add specific numbers (₪, %, quantities)" } });
  total += numberScore;

  // CTA presence
  const ctaWords = ["עכשיו", "הצטרף", "קבל", "התחל", "now", "join", "get", "start", "לחץ", "click"];
  const hasCTA = ctaWords.some((w) => text.toLowerCase().includes(w));
  const ctaScore = hasCTA ? 12 : 3;
  breakdown.push({ rule: "cta_strength", score: ctaScore, tip: { he: hasCTA ? "CTA ברור!" : "הוסף קריאה לפעולה ברורה (עכשיו / התחל / קבל)", en: hasCTA ? "Clear CTA!" : "Add a clear call-to-action (now / start / get)" } });
  total += ctaScore;

  // Urgency (real, not fake)
  const realUrgency = /נשאר|מוגבל|עד.*\d|spots.*left|limited|until/i.test(text);
  const fakeUrgency = /!!!|ממהרים|HURRY|מהרו/i.test(text);
  const urgencyScore = realUrgency && !fakeUrgency ? 12 : fakeUrgency ? 2 : 6;
  breakdown.push({ rule: "urgency", score: urgencyScore, tip: { he: fakeUrgency ? "דחיפות מזויפת פוגעת באמינות! השתמש בדחיפות אמיתית" : realUrgency ? "דחיפות אמיתית ואותנטית!" : "שקול להוסיף דחיפות אמיתית (מלאי מוגבל, תאריך סיום)", en: fakeUrgency ? "Fake urgency hurts credibility! Use real urgency" : realUrgency ? "Authentic real urgency!" : "Consider adding real urgency (limited stock, end date)" } });
  total += urgencyScore;

  // Price framing
  const hasPriceFrame = /פחות מ|less than|חוסך|saves|₪.*חודש|₪.*month/i.test(text);
  const priceScore = hasPriceFrame ? 12 : 5;
  breakdown.push({ rule: "price_framing", score: priceScore, tip: { he: hasPriceFrame ? "מסגור מחיר חכם!" : "מסגר את המחיר יחסית: 'פחות מקפה ביום' / 'חוסך ₪X'", en: hasPriceFrame ? "Smart price framing!" : "Frame price relatively: 'less than coffee/day' / 'saves ₪X'" } });
  total += priceScore;

  return { total: Math.min(total, 100), breakdown };
}
