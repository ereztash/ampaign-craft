// ═══════════════════════════════════════════════
// Archetype Blind Spots — Phase A data, Phase B consumption
//
// Each entry is specific to this product context, not a general
// personality claim. Copy is falsifiable and framed as a product-usage
// tendency, not a character trait. (Barnum-effect mitigation.)
// ═══════════════════════════════════════════════

import type { ArchetypeId } from "@/types/archetype";

export interface BlindSpotEntry {
  /** Which module the blind spot most commonly surfaces in */
  moduleId: string;
  /** Route path of that module */
  routePath: string;
  /**
   * Dwell threshold in days — nudge fires when the user has spent
   * this many days on the module without hitting its completion key.
   */
  dwellThresholdDays: number;
  /** Short description of the blind spot tendency (product-scoped) */
  description: { he: string; en: string };
  /** Nudge message shown in BlindSpotNudge component */
  nudge: { he: string; en: string };
  /** Which module to suggest moving to next */
  suggestedNextModule: string;
  suggestedNextRoutePath: string;
}

export interface ArchetypeBlindSpotProfile {
  archetypeId: ArchetypeId;
  /**
   * Headline strength to show on the reveal screen — what this user
   * type genuinely does well in this product context.
   */
  strength: { he: string; en: string };
  /**
   * Typical blind spot visible on the reveal screen — honest,
   * product-specific, paired with a remedy.
   */
  blindSpot: { he: string; en: string };
  /** Ordered list of module-level blind spots for Phase B nudging. */
  moduleBlindSpots: BlindSpotEntry[];
}

// ═══════════════════════════════════════════════
// STRATEGIST
// Prevention + Systematic — tends to stall at differentiation
// because no data set ever feels complete enough.
// ═══════════════════════════════════════════════

const STRATEGIST_BLIND_SPOTS: ArchetypeBlindSpotProfile = {
  archetypeId: "strategist",
  strength: {
    he: "אתה בונה על בסיס מוצק — ניתוח לפני פעולה הוא יתרון אמיתי בשוק שבו רוב המתחרים מנחשים",
    en: "You build on solid ground — analysis before action is a real advantage in a market where most competitors guess",
  },
  blindSpot: {
    he: "משתמשים כמוך נוטים לבלות יותר מדי זמן בשלב הבידול לפני שעוברים לתמחור — אף מערכת נתונים לא תרגיש מלאה מספיק, ובינתיים המתחרים מתמחרים ומוכרים",
    en: "Users with your profile tend to spend too long in differentiation before moving to pricing — no data set will ever feel complete enough, and meanwhile competitors are pricing and selling",
  },
  moduleBlindSpots: [
    {
      moduleId: "differentiate",
      routePath: "/differentiate",
      dwellThresholdDays: 4,
      description: {
        he: "בידול ראוי לעומק — אבל בשלב מסוים הנתונים הנוספים מחזירים פחות",
        en: "Differentiation deserves depth — but at some point additional data yields diminishing returns",
      },
      nudge: {
        he: "עברת כמה ימים בבידול. המידע שיש לך כבר מספיק לתמחור ראשוני — אפשר לחזור ולהוסיף נתונים אחרי שתראה את מודל התמחור",
        en: "You've spent a few days in differentiation. The data you have is already enough for initial pricing — you can return to add more after seeing the pricing model",
      },
      suggestedNextModule: "pricing",
      suggestedNextRoutePath: "/pricing",
    },
    {
      moduleId: "data",
      routePath: "/data",
      dwellThresholdDays: 5,
      description: {
        he: "חיבור נתונים הוא בסיס חשוב — אבל גם ללא כל מקור מחובר אפשר לייצר תכנית ראשונה",
        en: "Connecting data is important groundwork — but you can produce a first plan without every source connected",
      },
      nudge: {
        he: "חמישה ימים על חיבור נתונים. כדאי לנסות להריץ משפך ראשון עם מה שיש — ייתן לך הקשר לאיזה נתונים באמת נחוצים",
        en: "Five days on data connections. Try running a first funnel with what you have — it will give you context on which data actually matters",
      },
      suggestedNextModule: "wizard",
      suggestedNextRoutePath: "/wizard",
    },
  ],
};

// ═══════════════════════════════════════════════
// OPTIMIZER
// Promotion + Systematic — tends to optimise locally and miss
// the bigger differentiation picture.
// ═══════════════════════════════════════════════

const OPTIMIZER_BLIND_SPOTS: ArchetypeBlindSpotProfile = {
  archetypeId: "optimizer",
  strength: {
    he: "אתה מוצא שיפורים שאחרים מפספסים — מיקוד ב-KPI הופך תחושות לנתונים שניתן לפעול לפיהם",
    en: "You find improvements others miss — KPI focus turns feelings into actionable data",
  },
  blindSpot: {
    he: "משתמשים כמוך נוטים לדלג על בידול ולעבור ישר לאופטימיזציה — זה מייעל תהליכים שאולי לא מכוונים בדיוק נכון מלכתחילה",
    en: "Users with your profile tend to skip differentiation and go straight to optimisation — that risks making efficient something that wasn't well-aimed to begin with",
  },
  moduleBlindSpots: [
    {
      moduleId: "pricing",
      routePath: "/pricing",
      dwellThresholdDays: 4,
      description: {
        he: "תמחור מדויק הוא כוח — אבל תמחור ללא בידול ברור מוביל לתחרות על מחיר בלבד",
        en: "Precise pricing is power — but pricing without clear differentiation leads to competing on price alone",
      },
      nudge: {
        he: "ביליתי כמה ימים בתמחור. כדאי לוודא שהבידול שלך תומך במחיר הזה — לקוחות ישאלו 'למה כל כך יקר' ותצטרך תשובה",
        en: "A few days in pricing. Worth verifying your differentiation supports that price — customers will ask 'why so expensive' and you'll need an answer",
      },
      suggestedNextModule: "differentiate",
      suggestedNextRoutePath: "/differentiate",
    },
    {
      moduleId: "retention",
      routePath: "/retention",
      dwellThresholdDays: 5,
      description: {
        he: "שיפור שימור הוא נכון — אבל גבוה מדי על retention לפני שהמכירה הראשונה חזקה עלול לשמר לקוחות שלא צריך לשמר",
        en: "Improving retention is right — but over-indexing on retention before first-sale is strong risks retaining customers you shouldn't",
      },
      nudge: {
        he: "חמישה ימים על שימור. האם שלב המכירה חזק? שיפור retention על בסיס מכירה חלשה לא יעזור",
        en: "Five days on retention. Is your sales step strong? Improving retention on a weak sale foundation won't help",
      },
      suggestedNextModule: "sales",
      suggestedNextRoutePath: "/sales",
    },
  ],
};

// ═══════════════════════════════════════════════
// PIONEER
// Promotion + Heuristic — big vision but can under-invest in
// sales mechanics and pricing rigour.
// ═══════════════════════════════════════════════

const PIONEER_BLIND_SPOTS: ArchetypeBlindSpotProfile = {
  archetypeId: "pioneer",
  strength: {
    he: "אתה רואה אפשרויות לפני שהשוק רואה אותן — חשיבה ראשית-עיקרית היא יתרון תחרותי אמיתי",
    en: "You see possibilities before the market does — first-principles thinking is a real competitive advantage",
  },
  blindSpot: {
    he: "משתמשים כמוך נוטים לדלג על מבנה תמחור ומכירות בגלל ש'הויז'ן מדבר בעד עצמו' — בפועל, קונים מחליטים על בסיס בהירות מחיר ותהליך, לא רק ויז'ן",
    en: "Users with your profile tend to skip pricing structure and sales mechanics because 'the vision speaks for itself' — in practice, buyers decide on price clarity and process, not vision alone",
  },
  moduleBlindSpots: [
    {
      moduleId: "wizard",
      routePath: "/wizard",
      dwellThresholdDays: 5,
      description: {
        he: "בניית משפך ראשוני היא נקודת פתיחה — בשלב מסוים צריך לוודא שהמשפך מוביל לעסקה בפועל",
        en: "Building an initial funnel is a starting point — at some point you need to verify it leads to an actual deal",
      },
      nudge: {
        he: "חמישה ימים על בניית המשפך. יש לך ויז'ן — עכשיו כדאי לחבר אותו למחיר ולמסלול מכירה ברורים",
        en: "Five days on funnel building. You have a vision — now connect it to a clear price and sales path",
      },
      suggestedNextModule: "pricing",
      suggestedNextRoutePath: "/pricing",
    },
  ],
};

// ═══════════════════════════════════════════════
// CONNECTOR
// Prevention + Heuristic — relationship focus can delay hard
// pricing conversations.
// ═══════════════════════════════════════════════

const CONNECTOR_BLIND_SPOTS: ArchetypeBlindSpotProfile = {
  archetypeId: "connector",
  strength: {
    he: "אתה בונה אמון אמיתי — שיעור השימור שלך גבוה מהממוצע כי הלקוחות שלך מרגישים שמישהו שומע אותם",
    en: "You build genuine trust — your retention rate is above average because your customers feel heard",
  },
  blindSpot: {
    he: "משתמשים כמוך נוטים לדחות שיחות תמחור כי הן מרגישות לא-יחסיות — בפועל, מחיר ברור הוא כבוד ללקוח, לא חוסר רגישות",
    en: "Users with your profile tend to delay pricing conversations because they feel transactional — in practice, a clear price is respect for the customer, not insensitivity",
  },
  moduleBlindSpots: [
    {
      moduleId: "retention",
      routePath: "/retention",
      dwellThresholdDays: 4,
      description: {
        he: "שימור הוא כוח שלך — אבל עסק בריא צריך גם מכירה ותמחור חזקים כדי לשמר את הצמיחה",
        en: "Retention is your strength — but a healthy business also needs strong sales and pricing to sustain growth",
      },
      nudge: {
        he: "ביליתי כמה ימים בשימור. הלקוחות הקיימים שלך בידיים טובות — כדאי להפנות קצת אנרגיה לתמחור כדי שתוכל לקחת לקוחות חדשים בביטחון",
        en: "A few days in retention. Your existing customers are in good hands — worth directing some energy to pricing so you can take on new customers confidently",
      },
      suggestedNextModule: "pricing",
      suggestedNextRoutePath: "/pricing",
    },
  ],
};

// ═══════════════════════════════════════════════
// CLOSER
// Promotion + Heuristic — speed bias can skip differentiation
// and strategic context, leading to strong short-term sales
// on an undifferentiated position.
// ═══════════════════════════════════════════════

const CLOSER_BLIND_SPOTS: ArchetypeBlindSpotProfile = {
  archetypeId: "closer",
  strength: {
    he: "אתה יודע לסגור — כשהשוק קר ואחרים מחכים, אתה מזיז עסקאות קדימה",
    en: "You know how to close — when the market is cold and others wait, you move deals forward",
  },
  blindSpot: {
    he: "משתמשים כמוך נוטים לדלג על בידול כי 'אפשר לספר את הסיפור בשיחה' — אבל כשהלקוח מחפש בגוגל אחרי השיחה, הוא צריך לראות בהירות עצמאית",
    en: "Users with your profile tend to skip differentiation because 'you can tell the story in the call' — but when the customer Googles after the call, they need to see independent clarity",
  },
  moduleBlindSpots: [
    {
      moduleId: "sales",
      routePath: "/sales",
      dwellThresholdDays: 5,
      description: {
        he: "תהליך מכירה חזק הוא בסיס — אבל בלי בידול ברור, הלחץ שלך לסגירה עלול לדחות לקוחות שמסופקים",
        en: "A strong sales process is foundational — but without clear differentiation, your closing pressure can push away hesitant customers",
      },
      nudge: {
        he: "חמישה ימים על מכירות. כדאי לבדוק: אם לקוח שואל 'למה אתם ולא המתחרים?' — יש לך תשובה ברורה ומתועדת?",
        en: "Five days on sales. Worth checking: if a customer asks 'why you and not the competitor?' — do you have a clear, documented answer?",
      },
      suggestedNextModule: "differentiate",
      suggestedNextRoutePath: "/differentiate",
    },
  ],
};

// ═══════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════

export const ARCHETYPE_BLIND_SPOTS: Record<ArchetypeId, ArchetypeBlindSpotProfile> = {
  strategist: STRATEGIST_BLIND_SPOTS,
  optimizer:  OPTIMIZER_BLIND_SPOTS,
  pioneer:    PIONEER_BLIND_SPOTS,
  connector:  CONNECTOR_BLIND_SPOTS,
  closer:     CLOSER_BLIND_SPOTS,
};

export function getBlindSpotProfile(archetypeId: ArchetypeId): ArchetypeBlindSpotProfile {
  return ARCHETYPE_BLIND_SPOTS[archetypeId] ?? ARCHETYPE_BLIND_SPOTS.optimizer;
}
