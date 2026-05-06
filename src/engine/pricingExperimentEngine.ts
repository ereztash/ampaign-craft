// ═══════════════════════════════════════════════════════════════════════════
// Pricing Experiment Engine
//
// Converts the Pricing module from one-and-done → recurring weekly use.
// User flow:
//   1. Initial pricing recommendation → first experiment proposed
//   2. User runs experiment on 5-10 prospects (we provide the script)
//   3. User logs results back (1 click per prospect: accepted/objected/declined)
//   4. Engine recalibrates → next experiment
//   5. After 3 cycles, confidence tier moves from "intake_only" → "stable"
//
// This is the stickiness mechanic: a user who completed an experiment
// feels invested and returns to log results and run the next one.
// Each cycle is ~7-14 days, creating a built-in weekly check-in.
// ═══════════════════════════════════════════════════════════════════════════

import type { BilingualText } from "@/types/i18n";
import { safeStorage } from "@/lib/safeStorage";
import type { CulturalSegment } from "./israeliPricingPsychologyEngine";

export const ENGINE_MANIFEST = {
  id: "pricingExperimentEngine",
  tier: "S" as const,
  inputs: ["currentRecommendation", "experimentHistory"],
  outputs: ["experimentPlan", "calibratedRecommendation"],
  feedbackLoop: "outcome.experiment_acceptance_rate",
};

const STORAGE_KEY = "funnelforge.pricing.experiments";

export type ExperimentStatus = "draft" | "running" | "complete" | "abandoned";

export type CustomerOutcome =
  | "accepted_full"      // paid the asking price
  | "accepted_with_haggle" // paid after negotiation
  | "objected_price"     // explicitly said "too expensive"
  | "objected_value"     // unclear value, not price
  | "declined"           // hard no, no reason
  | "ghosted";           // didn't reply

export interface PricedProspect {
  id: string;
  name?: string;
  channel: "whatsapp" | "phone" | "email" | "in_person";
  outcome: CustomerOutcome | null;
  paidPrice?: number;
  notes?: string;
  loggedAt?: number;
}

export interface PricingExperiment {
  id: string;
  createdAt: number;
  closedAt?: number;
  status: ExperimentStatus;
  hypothesis: BilingualText;
  testedPrice: number;
  segment: CulturalSegment;
  prospects: PricedProspect[];
  cohortSize: number;
  scriptUsed: BilingualText;
}

export interface ExperimentResult {
  experimentId: string;
  acceptanceRate: number;       // 0-1
  hagglingRate: number;          // 0-1
  priceObjectionRate: number;    // 0-1
  avgPaidPrice: number | null;
  recommendation: ExperimentRecommendation;
  confidence: "low" | "medium" | "stable";
  insight: BilingualText;
}

export type ExperimentRecommendation =
  | "raise_15_20"        // 5/5 accepted → anchor too low
  | "raise_5_10"         // 4/5 accepted, no haggling
  | "hold_steady"         // 3/5 accepted with haggling
  | "split_tashlumim"    // price-objections, value clear
  | "lower_5_10"         // 1-2/5 accepted
  | "fix_value_messaging" // value-objections > price-objections
  | "rerun_larger_cohort"; // < 3 outcomes logged

export interface NextExperiment {
  hypothesis: BilingualText;
  proposedPrice: number;
  cohortSize: number;
  script: BilingualText;
  expectedDuration: BilingualText;
}

// ── Storage ────────────────────────────────────────────────────────────────

function loadExperiments(): PricingExperiment[] {
  return safeStorage.getJSON<PricingExperiment[]>(STORAGE_KEY, []);
}

function saveExperiments(experiments: PricingExperiment[]): void {
  safeStorage.setJSON(STORAGE_KEY, experiments);
}

// ── Experiment lifecycle ────────────────────────────────────────────────────

export function createExperiment(input: {
  testedPrice: number;
  segment: CulturalSegment;
  cohortSize?: number;
  hypothesis?: BilingualText;
}): PricingExperiment {
  const cohortSize = input.cohortSize ?? 5;
  const experiment: PricingExperiment = {
    id: `exp-${Date.now()}`,
    createdAt: Date.now(),
    status: "running",
    hypothesis: input.hypothesis ?? {
      he: `במחיר ₪${input.testedPrice.toLocaleString("he-IL")}, לפחות 60% יקבלו`,
      en: `At ₪${input.testedPrice.toLocaleString("en-US")}, at least 60% will accept`,
    },
    testedPrice: input.testedPrice,
    segment: input.segment,
    prospects: Array.from({ length: cohortSize }, (_, i) => ({
      id: `prospect-${Date.now()}-${i}`,
      channel: "whatsapp" as const,
      outcome: null,
    })),
    cohortSize,
    scriptUsed: generateOutreachScript(input.testedPrice, input.segment),
  };

  const all = loadExperiments();
  all.push(experiment);
  saveExperiments(all);
  return experiment;
}

export function getActiveExperiment(): PricingExperiment | null {
  const all = loadExperiments();
  return all.find((e) => e.status === "running") ?? null;
}

export function getAllExperiments(): PricingExperiment[] {
  return loadExperiments().sort((a, b) => b.createdAt - a.createdAt);
}

export function logProspectOutcome(
  experimentId: string,
  prospectId: string,
  outcome: CustomerOutcome,
  paidPrice?: number,
  notes?: string,
): PricingExperiment | null {
  const all = loadExperiments();
  const experiment = all.find((e) => e.id === experimentId);
  if (!experiment) return null;

  const prospect = experiment.prospects.find((p) => p.id === prospectId);
  if (!prospect) return null;

  prospect.outcome = outcome;
  prospect.paidPrice = paidPrice;
  prospect.notes = notes;
  prospect.loggedAt = Date.now();

  const allLogged = experiment.prospects.every((p) => p.outcome !== null);
  if (allLogged) {
    experiment.status = "complete";
    experiment.closedAt = Date.now();
  }

  saveExperiments(all);
  return experiment;
}

export function abandonExperiment(experimentId: string): void {
  const all = loadExperiments();
  const experiment = all.find((e) => e.id === experimentId);
  if (!experiment) return;
  experiment.status = "abandoned";
  experiment.closedAt = Date.now();
  saveExperiments(all);
}

// ── Outreach script (the actual WhatsApp text the user sends) ──────────────

function generateOutreachScript(price: number, segment: CulturalSegment): BilingualText {
  const formattedPrice = price.toLocaleString("he-IL");

  if (segment === "tech_b2b") {
    return {
      he: `היי, רציתי לבדוק איתך בחזית — אנחנו מציעים [SOLUTION] ב-₪${formattedPrice} לחודש (annual prepay). היו לכם שיחות דומות? מתאים לדבר 15 דק' השבוע?`,
      en: `Hey, wanted to check with you — we're offering [SOLUTION] at ₪${formattedPrice}/mo (annual prepay). Have you had similar conversations? 15 min this week?`,
    };
  }

  if (segment === "chareidi") {
    return {
      he: `שלום, מציעים שירות [SOLUTION]. המחיר הוא ₪${formattedPrice} — תשלום בודד, הכל שקוף. רוצה לשמוע פרטים?`,
      en: `Hello, we offer [SOLUTION]. Price is ₪${formattedPrice} — single payment, fully transparent. Want to hear more?`,
    };
  }

  return {
    he: `היי, יש לי שירות שיכול לפתור לך [PROBLEM]. המחיר ₪${formattedPrice} (אפשר ב-12 תשלומים בלי ריבית). מתאים שנדבר?`,
    en: `Hey, I have a service that can solve [PROBLEM] for you. Price is ₪${formattedPrice} (or 12 interest-free payments). Want to talk?`,
  };
}

// ── Result analysis ─────────────────────────────────────────────────────────

export function analyzeExperiment(experiment: PricingExperiment): ExperimentResult {
  const logged = experiment.prospects.filter((p) => p.outcome !== null);
  const total = logged.length;

  if (total < 3) {
    return {
      experimentId: experiment.id,
      acceptanceRate: 0,
      hagglingRate: 0,
      priceObjectionRate: 0,
      avgPaidPrice: null,
      recommendation: "rerun_larger_cohort",
      confidence: "low",
      insight: { he: "פחות מ-3 תוצאות — צריך עוד דאטה לפני החלטה", en: "Fewer than 3 outcomes — need more data before deciding" },
    };
  }

  const accepted = logged.filter((p) => p.outcome === "accepted_full" || p.outcome === "accepted_with_haggle");
  const haggled = logged.filter((p) => p.outcome === "accepted_with_haggle");
  const priceObjected = logged.filter((p) => p.outcome === "objected_price");
  const valueObjected = logged.filter((p) => p.outcome === "objected_value");

  const acceptanceRate = accepted.length / total;
  const hagglingRate = haggled.length / total;
  const priceObjectionRate = priceObjected.length / total;
  const valueObjectionRate = valueObjected.length / total;

  const paidPrices = accepted
    .map((p) => p.paidPrice)
    .filter((p): p is number => typeof p === "number");
  const avgPaidPrice = paidPrices.length > 0
    ? Math.round(paidPrices.reduce((s, p) => s + p, 0) / paidPrices.length)
    : null;

  let recommendation: ExperimentRecommendation;
  let insight: BilingualText;

  if (acceptanceRate >= 0.9) {
    recommendation = "raise_15_20";
    insight = {
      he: `${accepted.length}/${total} קיבלו — האנקור נמוך מדי. העלאה של 15-20% צפויה לא לפגוע משמעותית בקבלה`,
      en: `${accepted.length}/${total} accepted — anchor too low. 15-20% raise unlikely to materially hurt acceptance`,
    };
  } else if (acceptanceRate >= 0.7 && hagglingRate < 0.2) {
    recommendation = "raise_5_10";
    insight = {
      he: `${accepted.length}/${total} קיבלו, מעט מו"מ — מקום להעלות 5-10%`,
      en: `${accepted.length}/${total} accepted, little haggling — room to raise 5-10%`,
    };
  } else if (acceptanceRate >= 0.5 && hagglingRate >= 0.3) {
    recommendation = "hold_steady";
    insight = {
      he: `${accepted.length}/${total} קיבלו אחרי מו"מ — האנקור על המקום, חזק את ה-objection handlers`,
      en: `${accepted.length}/${total} accepted after haggling — anchor is right, strengthen objection handlers`,
    };
  } else if (priceObjectionRate >= 0.4 && valueObjectionRate < 0.2) {
    recommendation = "split_tashlumim";
    insight = {
      he: `${priceObjected.length}/${total} התנגדו על מחיר — הערך ברור, הסכום מאיים. שקול 12 תשלומים`,
      en: `${priceObjected.length}/${total} objected on price — value is clear, amount intimidates. Consider 12 installments`,
    };
  } else if (valueObjectionRate >= 0.3) {
    recommendation = "fix_value_messaging";
    insight = {
      he: `${valueObjected.length}/${total} לא הבינו את הערך — בעיה ב-positioning, לא במחיר. חזור ל-Differentiation`,
      en: `${valueObjected.length}/${total} didn't grasp value — positioning problem, not price. Return to Differentiation`,
    };
  } else if (acceptanceRate < 0.3) {
    recommendation = "lower_5_10";
    insight = {
      he: `רק ${accepted.length}/${total} קיבלו — האנקור גבוה מדי. הורד 5-10% או הוסף ערובה`,
      en: `Only ${accepted.length}/${total} accepted — anchor too high. Lower 5-10% or add guarantee`,
    };
  } else {
    recommendation = "hold_steady";
    insight = {
      he: `נתונים מעורבים — הרץ עוד מחזור באותו מחיר עם cohort גדול יותר`,
      en: `Mixed signals — run another cycle at same price with larger cohort`,
    };
  }

  const confidence = total >= 8 ? "stable" : total >= 5 ? "medium" : "low";

  return {
    experimentId: experiment.id,
    acceptanceRate,
    hagglingRate,
    priceObjectionRate,
    avgPaidPrice,
    recommendation,
    confidence,
    insight,
  };
}

// ── Next experiment proposal ────────────────────────────────────────────────

export function proposeNextExperiment(input: {
  lastResult: ExperimentResult;
  lastTestedPrice: number;
  segment: CulturalSegment;
}): NextExperiment {
  const { recommendation } = input.lastResult;
  let proposedPrice = input.lastTestedPrice;
  let hypothesis: BilingualText;

  switch (recommendation) {
    case "raise_15_20":
      proposedPrice = Math.round(input.lastTestedPrice * 1.175);
      hypothesis = {
        he: `אם נעלה ל-₪${proposedPrice.toLocaleString("he-IL")}, נשמור על קצב קבלה ≥ 60%`,
        en: `Raising to ₪${proposedPrice.toLocaleString("en-US")} will keep acceptance ≥ 60%`,
      };
      break;
    case "raise_5_10":
      proposedPrice = Math.round(input.lastTestedPrice * 1.075);
      hypothesis = {
        he: `מעט מעל המחיר הנוכחי — בודקים תקרה`,
        en: `Slightly above current — testing the ceiling`,
      };
      break;
    case "lower_5_10":
      proposedPrice = Math.round(input.lastTestedPrice * 0.925);
      hypothesis = {
        he: `הורדה זהירה תעלה קבלה לפחות 20%`,
        en: `Modest cut should raise acceptance by at least 20%`,
      };
      break;
    case "split_tashlumim":
      hypothesis = {
        he: `אותו מחיר, אבל עם framing של 12 תשלומים — צפי הקפצת קבלה ב-25%`,
        en: `Same price with 12-installment framing — expecting 25% acceptance lift`,
      };
      break;
    case "fix_value_messaging":
      hypothesis = {
        he: `לא משנים מחיר. משנים את ה-pitch — חזרה ל-Differentiation לחיזוק mechanism statement`,
        en: `Not changing price. Changing the pitch — return to Differentiation to sharpen mechanism statement`,
      };
      break;
    case "rerun_larger_cohort":
      hypothesis = {
        he: `אותו מחיר על cohort של 8-10 לקוחות — צריך עוד דאטה`,
        en: `Same price on cohort of 8-10 — need more data`,
      };
      break;
    default:
      hypothesis = {
        he: `אותו מחיר, מחזור שני — מאמתים את התוצאה`,
        en: `Same price, second cycle — validating the result`,
      };
  }

  return {
    hypothesis,
    proposedPrice,
    cohortSize: recommendation === "rerun_larger_cohort" ? 10 : 5,
    script: generateOutreachScript(proposedPrice, input.segment),
    expectedDuration: { he: "7-10 ימים לסגירת mechanism", en: "7-10 days to close the mechanism" },
  };
}

// ── Confidence ladder ───────────────────────────────────────────────────────

export interface PricingConfidenceTier {
  tier: "intake_only" | "single_experiment" | "validated" | "stable";
  experimentsCompleted: number;
  totalProspects: number;
  badge: BilingualText;
}

export function getCurrentConfidence(): PricingConfidenceTier {
  const completed = loadExperiments().filter((e) => e.status === "complete");
  const totalProspects = completed.reduce(
    (sum, e) => sum + e.prospects.filter((p) => p.outcome !== null).length,
    0,
  );

  if (completed.length === 0) {
    return {
      tier: "intake_only",
      experimentsCompleted: 0,
      totalProspects: 0,
      badge: { he: "המלצה לפי אינטייק — לא נבחנה בשטח עדיין", en: "Recommendation from intake — not field-tested yet" },
    };
  }
  if (completed.length === 1) {
    return {
      tier: "single_experiment",
      experimentsCompleted: 1,
      totalProspects,
      badge: { he: "ניסוי אחד הושלם — צריך 2 נוספים לוודאות", en: "One experiment done — need 2 more for confidence" },
    };
  }
  if (completed.length < 3 || totalProspects < 15) {
    return {
      tier: "validated",
      experimentsCompleted: completed.length,
      totalProspects,
      badge: { he: `${completed.length} ניסויים הושלמו, ${totalProspects} לקוחות נבחנו`, en: `${completed.length} experiments done, ${totalProspects} prospects tested` },
    };
  }
  return {
    tier: "stable",
    experimentsCompleted: completed.length,
    totalProspects,
    badge: { he: `המלצה יציבה — ${totalProspects} לקוחות, ${completed.length} מחזורים`, en: `Stable recommendation — ${totalProspects} prospects, ${completed.length} cycles` },
  };
}
