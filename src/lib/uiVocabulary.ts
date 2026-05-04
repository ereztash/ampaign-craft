/**
 * uiVocabulary — maps internal engine enum values to user-facing labels.
 *
 * Rule: every value that originates in an engine type and is rendered to the
 * screen MUST go through one of these maps. Never render a raw engine key.
 */

type BiLabel = { he: string; en: string };
type Language = "he" | "en";

export function label(map: Record<string, BiLabel>, key: string, lang: Language, fallback?: string): string {
  return map[key]?.[lang] ?? fallback ?? key;
}

// ─── Bottleneck / gap severity ────────────────────────────────────────────────
export const SEVERITY_LABEL: Record<string, BiLabel> = {
  critical: { he: "קריטי",   en: "Critical" },
  warning:  { he: "אזהרה",   en: "Warning"  },
  info:     { he: "מידע",    en: "Info"     },
  low:      { he: "נמוך",    en: "Low"      },
  medium:   { he: "בינוני",  en: "Medium"   },
  high:     { he: "גבוה",    en: "High"     },
};

// ─── Archetype classification confidence tier ─────────────────────────────────
export const CONFIDENCE_TIER_LABEL: Record<string, BiLabel> = {
  none:      { he: "אין נתונים מספיקים", en: "Not enough data" },
  tentative: { he: "ראשוני",             en: "Preliminary"    },
  confident: { he: "בטוח",              en: "Confident"      },
  strong:    { he: "חזק מאוד",           en: "Very strong"    },
};

// ─── Communication / outreach channels ───────────────────────────────────────
export const CHANNEL_LABEL: Record<string, BiLabel> = {
  email:      { he: "אימייל",      en: "Email"      },
  sms:        { he: "SMS",         en: "SMS"        },
  whatsapp:   { he: "וואטסאפ",     en: "WhatsApp"   },
  phone:      { he: "טלפון",       en: "Phone"      },
  linkedin:   { he: "לינקדאין",    en: "LinkedIn"   },
  facebook:   { he: "פייסבוק",     en: "Facebook"   },
  instagram:  { he: "אינסטגרם",    en: "Instagram"  },
  google_ads: { he: "גוגל אדס",    en: "Google Ads" },
  referral:   { he: "הפניות",      en: "Referral"   },
  organic:    { he: "אורגני",      en: "Organic"    },
  paid:       { he: "ממומן",       en: "Paid"       },
  in_person:  { he: "פגישה",       en: "In person"  },
};

// ─── Intervention timing ──────────────────────────────────────────────────────
export const TIMING_LABEL: Record<string, BiLabel> = {
  immediate:   { he: "מיידי",        en: "Immediate"   },
  day1:        { he: "יום 1",        en: "Day 1"       },
  day3:        { he: "יום 3",        en: "Day 3"       },
  week1:       { he: "שבוע 1",       en: "Week 1"      },
  week2:       { he: "שבוע 2",       en: "Week 2"      },
  week4:       { he: "שבוע 4",       en: "Week 4"      },
  month1:      { he: "חודש 1",       en: "Month 1"     },
  month3:      { he: "רבעון 1",      en: "Quarter 1"   },
  "short-term":{ he: "קצר טווח",     en: "Short-term"  },
  "long-term": { he: "ארוך טווח",    en: "Long-term"   },
};

// ─── Risk / strategy time horizon ────────────────────────────────────────────
export const TIME_HORIZON_LABEL: Record<string, BiLabel> = {
  immediate:   { he: "מיידי",     en: "Immediate"  },
  "short-term":{ he: "קצר טווח", en: "Short-term" },
  "long-term": { he: "ארוך טווח",en: "Long-term"  },
};

// ─── Onboarding type ──────────────────────────────────────────────────────────
export const ONBOARDING_TYPE_LABEL: Record<string, BiLabel> = {
  trial:       { he: "ניסיון חינמי",   en: "Free trial"     },
  freemium:    { he: "פרימיום חינמי",  en: "Freemium"       },
  demo:        { he: "הדגמה",          en: "Demo"           },
  self_serve:  { he: "הגדרה עצמאית",   en: "Self-serve"     },
  white_glove: { he: "שירות מלא",      en: "White-glove"    },
  sales_led:   { he: "מכירה מגוייסת",  en: "Sales-led"      },
};

// ─── Funnel stage (InsightLadder) ─────────────────────────────────────────────
export const FUNNEL_STAGE_LABEL: Record<string, BiLabel> = {
  awareness:     { he: "מודעות",  en: "Awareness"     },
  interest:      { he: "עניין",   en: "Interest"      },
  consideration: { he: "שיקול",   en: "Consideration" },
  decision:      { he: "החלטה",   en: "Decision"      },
  loyalty:       { he: "נאמנות",  en: "Loyalty"       },
};

// ─── Insight type ─────────────────────────────────────────────────────────────
export const INSIGHT_TYPE_LABEL: Record<string, BiLabel> = {
  risk:    { he: "סיכון",  en: "Risk"    },
  win:     { he: "הישג",   en: "Win"     },
  pattern: { he: "מגמה",   en: "Trend"   },
  tip:     { he: "טיפ",    en: "Tip"     },
};
