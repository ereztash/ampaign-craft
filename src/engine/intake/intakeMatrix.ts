// ═══════════════════════════════════════════════
// src/engine/intake/intakeMatrix.ts
//
// 12-cell matrix: (IntakeNeed × IntakePain) -> IntakeRouting.
//
// Two invariants enforced by tests (intakeMatrix.test.ts):
// 1. Every cell is mapped — no undefined (T-totality).
// 2. Module destination depends on `pain` only.
//    `need` only modifies headline/kicker (tone), never target.
//    This lets us reason about routing ergonomics without re-evaluating
//    twelve cells whenever a module is added or removed.
//
// Adding a new module (e.g. retention as a routable pain) requires
// updating IntakePain in types.ts AND adding a row here. The test
// suite will fail loudly until the new pain is fully mapped.
// ═══════════════════════════════════════════════

import type {
  IntakeNeed,
  IntakePain,
  IntakeRouting,
  IntakePromise,
} from "./types";

// ─── Module destinations: pain only ──────────────────────────────────────────

const PAIN_TO_TARGET: Record<IntakePain, IntakeRouting["target"]> = {
  finance: "/pricing",
  product: "/differentiate",
  sales: "/sales",
  marketing: "/wizard", // quick funnel wizard is the marketing entry
};

// ─── Promise headlines per (need, pain) ──────────────────────────────────────
// Headlines are MEASURABLE: each carries an `expectedMinutes` so the
// Phase-3 feedback loop can verify whether the user reached first output
// inside the promised window.

const PROMISES: Record<IntakePain, Record<IntakeNeed, IntakePromise>> = {
  product: {
    time: {
      headline: {
        he: "תוך 10 דקות — משפט בידול אחד שאפשר לשלוח ללקוח",
        en: "In 10 minutes — one differentiation line you can send to a client",
      },
      kicker: {
        he: "מתחילים מהפלט. אחר כך יש זמן לעומק.",
        en: "Output first. Depth later.",
      },
      expectedMinutes: 10,
    },
    money: {
      headline: {
        he: "נמצא מה הופך אותך שווה את המחיר שאתה גובה",
        en: "Let's find what makes you worth what you charge",
      },
      kicker: {
        he: "בידול הוא הקושי המוסתר מאחורי כל בעיית תמחור.",
        en: "Differentiation is the hidden lever behind every pricing problem.",
      },
      expectedMinutes: 20,
    },
    attention: {
      headline: {
        he: "נמצא מה גורם לאנשים לעצור ולהקשיב לך",
        en: "Let's find what makes people stop and listen",
      },
      kicker: {
        he: "אם אתה לא מבדל, אתה רעש רקע.",
        en: "If you don't differentiate, you're background noise.",
      },
      expectedMinutes: 15,
    },
  },

  sales: {
    time: {
      headline: {
        he: "תוך 20 דקות — סקריפט מכירה מותאם לפרופיל DISC שלך",
        en: "In 20 minutes — a sales script matched to your DISC profile",
      },
      kicker: {
        he: "סקריפט אחד שעובד עדיף על חמישה גנריים.",
        en: "One script that fits beats five generic ones.",
      },
      expectedMinutes: 20,
    },
    money: {
      headline: {
        he: "נבין למה לקוחות לא סוגרים — וכמה אתה משאיר על השולחן",
        en: "Let's see why deals stall — and how much you leave on the table",
      },
      kicker: {
        he: "כל התנגדות שלא טופלה היא מחיר שלא קיבלת.",
        en: "Every unhandled objection is revenue you didn't keep.",
      },
      expectedMinutes: 25,
    },
    attention: {
      headline: {
        he: "נמצא איך לפתוח שיחה כך שלא ינתקו אחרי 8 שניות",
        en: "Let's find an opener that survives the first 8 seconds",
      },
      kicker: {
        he: "השניות הראשונות מחליטות אם בכלל יקשיבו לערך.",
        en: "The opening seconds decide whether the value gets heard.",
      },
      expectedMinutes: 15,
    },
  },

  finance: {
    time: {
      headline: {
        he: "תוך 15 דקות — המלצת מחיר מבוססת PSM + Hormozi",
        en: "In 15 minutes — a pricing recommendation grounded in PSM + Hormozi",
      },
      kicker: {
        he: "מחיר נכון נגזר ממנגנון, לא מתחושת בטן.",
        en: "Right price comes from a mechanism, not a hunch.",
      },
      expectedMinutes: 15,
    },
    money: {
      headline: {
        he: "נמצא את הפער בין המחיר שלך לשווי שאתה מספק",
        en: "Let's find the gap between your price and the value you deliver",
      },
      kicker: {
        he: "כל פער כזה הוא הכנסה שלא נכנסה.",
        en: "Every gap is revenue that didn't arrive.",
      },
      expectedMinutes: 25,
    },
    attention: {
      headline: {
        he: "נמצא איך להציג מחיר כך שלא יהיה הראשון שמדברים עליו",
        en: "Let's frame price so it isn't the first thing they talk about",
      },
      kicker: {
        he: "כשהמחיר הוא הציר היחיד — הפסדת.",
        en: "When price is the only axis, you've already lost.",
      },
      expectedMinutes: 20,
    },
  },

  marketing: {
    time: {
      headline: {
        he: "תוך 5 דקות — תוכנית שיווק בסיסית עם 3 ערוצים",
        en: "In 5 minutes — a starter marketing plan with 3 channels",
      },
      kicker: {
        he: "מתחילים קטן ועקבי, לא גדול ומפוצץ.",
        en: "Small and consistent beats big and scattered.",
      },
      expectedMinutes: 5,
    },
    money: {
      headline: {
        he: "נבין איך לחלק תקציב — לא לבזבז על ערוצים שלא עובדים",
        en: "Let's allocate budget — stop bleeding on channels that don't work",
      },
      kicker: {
        he: "כל שקל בערוץ לא נכון מסבסד את המתחרים שלך.",
        en: "Every dollar in the wrong channel subsidizes your competitors.",
      },
      expectedMinutes: 15,
    },
    attention: {
      headline: {
        he: "נבנה Hook שעוצר את האנשים הנכונים — לא את כולם",
        en: "Let's build a hook that stops the right people — not everyone",
      },
      kicker: {
        he: "תשומת לב רחבה היא בזבוז. תשומת לב מדויקת היא נכס.",
        en: "Broad attention is waste. Targeted attention is an asset.",
      },
      expectedMinutes: 10,
    },
  },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Look up the routing decision for a (need, pain) pair.
 *
 * Pure function. Always returns a result — by the totality invariant
 * tested in intakeMatrix.test.ts, every (need, pain) is covered.
 */
export function resolveIntake(need: IntakeNeed, pain: IntakePain): IntakeRouting {
  return {
    target: PAIN_TO_TARGET[pain],
    promise: PROMISES[pain][need],
  };
}

/** Exposed for tests + downstream surfaces that want to enumerate. */
export const ALL_NEEDS: IntakeNeed[] = ["time", "money", "attention"];
export const ALL_PAINS: IntakePain[] = ["finance", "product", "sales", "marketing"];
