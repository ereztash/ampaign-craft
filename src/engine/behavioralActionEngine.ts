// ═══════════════════════════════════════════════
// Behavioral Action Engine (BAE)
//
// Cross-domain synthesis: Kahneman-Tversky loss aversion,
// Hobfoll COR (Conservation of Resources), Fogg B=MAT,
// Goal Gradient, Nir Eyal Hook, SDT, Social Proof.
//
// Pure, deterministic, zero I/O.
// Consumes outputs from existing engines and produces a
// ranked set of behavioral nudges tuned to the user's
// DISC profile and current resource state.
// ═══════════════════════════════════════════════

import { writeContext, conceptKey, type BlackboardWriteContext } from "./blackboard/contract";
import { captureTrainingPair } from "./trainingDataEngine";
import type { HealthScore } from "./healthScoreEngine";
import type { CostOfInaction } from "./costOfInactionEngine";
import type { DISCDistribution } from "./discProfileEngine";
import type { InvestmentMetrics } from "@/contexts/UserProfileContext";
import { getSocialProof } from "@/lib/socialProofData";

export const ENGINE_MANIFEST = {
  name: "behavioralActionEngine",
  reads: ["USER-health-*", "USER-disc-*", "USER-investment-*", "CAMPAIGN-coi-*"],
  writes: ["USER-motivation-*"],
  stage: "deploy" as const,
  isLive: true,
  parameters: ["Behavioral nudge orchestration"],
} as const;

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

type BilingualText = { he: string; en: string };

export type NudgeType =
  | "loss_aversion"
  | "goal_gradient"
  | "social_proof"
  | "investment_sunk"
  | "achievement_near"
  | "urgency_temporal"
  | "cor_recovery";

export type FoggTriggerStyle = "spark" | "facilitator" | "signal";

export interface BehavioralNudge {
  type: NudgeType;
  message: BilingualText;
  intensity: number;       // 0-1
  triggerStyle: FoggTriggerStyle;
  cta?: BilingualText;
  route?: string;
}

export interface CORResourceState {
  cognitiveLoad: number;      // 0-100
  emotionalEnergy: number;    // 0-100
  timeResource: number;       // 0-100
  shouldSimplify: boolean;
}

export interface MotivationState {
  motivation: number;        // 0-1 (Fogg M)
  ability: number;           // 0-1 (Fogg A)
  triggerReadiness: number;  // 0-1 (Fogg T)
  foggScore: number;         // M * A * T

  nudge: BehavioralNudge;
  resourceState: CORResourceState;
  activeDrivers: BehavioralNudge[];
}

export interface BAEInput {
  healthScore?: HealthScore;
  costOfInaction?: CostOfInaction;
  discProfile?: DISCDistribution;
  investment: InvestmentMetrics;
  modulesTotal: number;
  modulesCompleted: number;
  streakWeeks: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  businessField: string;
  sessionMinutes: number;
}

// ───────────────────────────────────────────────
// COR Resource Monitor (Hobfoll)
// ───────────────────────────────────────────────

export function computeCORState(input: BAEInput): CORResourceState {
  // Cognitive load rises with session duration (fatigue curve)
  // 0-15 min: low, 15-45 min: moderate, 45+: high
  const sessionMin = input.sessionMinutes;
  const cognitiveLoad = sessionMin <= 15
    ? sessionMin * 2
    : sessionMin <= 45
      ? 30 + (sessionMin - 15) * 1.5
      : Math.min(100, 75 + (sessionMin - 45) * 0.5);

  // Emotional energy from streak and recent wins
  const streakBoost = Math.min(30, input.streakWeeks * 7);
  const achievementBoost = input.achievementsTotal > 0
    ? (input.achievementsUnlocked / input.achievementsTotal) * 40
    : 0;
  const emotionalEnergy = Math.min(100, 30 + streakBoost + achievementBoost);

  // Time resource depletes with session length
  const timeResource = Math.max(0, 100 - sessionMin * 1.2);

  const shouldSimplify = cognitiveLoad > 70 || timeResource < 25;

  return { cognitiveLoad, emotionalEnergy, timeResource, shouldSimplify };
}

// ───────────────────────────────────────────────
// Fogg B=MAT Scorer
// ───────────────────────────────────────────────

function computeMotivation(input: BAEInput): number {
  let m = 0.3; // baseline

  if (input.healthScore) {
    // Low health → high motivation (loss framing opportunity)
    if (input.healthScore.total < 50) m += 0.3;
    else if (input.healthScore.total < 70) m += 0.15;
  }

  if (input.costOfInaction) {
    // Higher monthly waste → higher motivation
    const wasteSignal = Math.min(0.2, input.costOfInaction.monthlyWaste / 50_000 * 0.2);
    m += wasteSignal;
  }

  if (input.streakWeeks >= 4) m += 0.1;

  // Goal gradient: closer to completion → more motivation
  if (input.modulesTotal > 0) {
    const progressRatio = input.modulesCompleted / input.modulesTotal;
    if (progressRatio >= 0.6) m += 0.15;
  }

  return Math.min(1, m);
}

function computeAbility(cor: CORResourceState): number {
  // High cognitive load → low ability
  const loadPenalty = cor.cognitiveLoad / 100 * 0.4;
  // High energy → high ability
  const energyBoost = cor.emotionalEnergy / 100 * 0.3;
  const timeBoost = cor.timeResource / 100 * 0.3;

  return Math.min(1, Math.max(0, 0.5 - loadPenalty + energyBoost + timeBoost));
}

function computeTriggerReadiness(input: BAEInput): number {
  let t = 0.2;

  // Near achievement unlock → high trigger readiness
  if (input.achievementsTotal > 0) {
    const ratio = input.achievementsUnlocked / input.achievementsTotal;
    if (ratio > 0.5 && ratio < 1) t += 0.2;
  }

  // Module close to completion
  if (input.modulesTotal > 0 && input.modulesCompleted > 0 && input.modulesCompleted < input.modulesTotal) {
    t += 0.3;
  }

  // Has plan data → ready for next step
  if (input.investment.plansCreated > 0) t += 0.15;

  return Math.min(1, t);
}

function deriveTriggerStyle(m: number, a: number): FoggTriggerStyle {
  if (m < 0.4 && a >= 0.5) return "spark";
  if (m >= 0.5 && a < 0.4) return "facilitator";
  return "signal";
}

// ───────────────────────────────────────────────
// DISC-Adapted Nudge Generation
// ───────────────────────────────────────────────

function getDominantDISC(disc?: DISCDistribution): "D" | "I" | "S" | "C" {
  if (!disc) return "S";
  const entries: [string, number][] = [["D", disc.D], ["I", disc.I], ["S", disc.S], ["C", disc.C]];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as "D" | "I" | "S" | "C";
}

function buildLossAversionNudge(input: BAEInput, style: FoggTriggerStyle, disc: "D" | "I" | "S" | "C"): BehavioralNudge {
  const messages: Record<string, BilingualText> = {
    D: { he: "המתחרים שלך כבר זזו — כל יום עיכוב הוא הזדמנות שהם לוקחים", en: "Your competitors already moved — every day of delay is an opportunity they're taking" },
    I: { he: "עסקים כמו שלך כבר רואים תוצאות — אל תפספס את הגל", en: "Businesses like yours are already seeing results — don't miss the wave" },
    S: { he: "ההשקעה שלך בסיכון — ללא פעולה, הערך שבנית הולך ונשחק", en: "Your investment is at risk — without action, the value you've built erodes" },
    C: { he: "הנתונים מראים: כל שבוע ללא אופטימיזציה עולה לך ממוצע של ₪2,400", en: "Data shows: each week without optimization costs you an average of ₪2,400" },
  };

  return {
    type: "loss_aversion",
    message: messages[disc],
    intensity: style === "spark" ? 0.9 : 0.6,
    triggerStyle: style,
    cta: { he: "פעל עכשיו", en: "Act now" },
    route: "/wizard",
  };
}

function buildGoalGradientNudge(input: BAEInput, disc: "D" | "I" | "S" | "C"): BehavioralNudge {
  const pct = input.modulesTotal > 0 ? Math.round((input.modulesCompleted / input.modulesTotal) * 100) : 0;
  const remaining = input.modulesTotal - input.modulesCompleted;

  const messages: Record<string, BilingualText> = {
    D: { he: `${pct}% הושלמו — עוד ${remaining} מודולים וסיימת. קדימה.`, en: `${pct}% complete — ${remaining} modules to go. Let's finish.` },
    I: { he: `כמעט שם! ${pct}% הושלמו — סיום המסלול יפתח לך תובנות מדהימות`, en: `Almost there! ${pct}% done — finishing unlocks incredible insights` },
    S: { he: `בנית בסיס יציב של ${pct}% — הצעד הבא יחזק את האסטרטגיה שלך`, en: `You've built a solid ${pct}% foundation — the next step strengthens your strategy` },
    C: { he: `${input.modulesCompleted}/${input.modulesTotal} מודולים הושלמו (${pct}%) — השלם את הניתוח לתמונה מלאה`, en: `${input.modulesCompleted}/${input.modulesTotal} modules completed (${pct}%) — complete the analysis for full picture` },
  };

  return {
    type: "goal_gradient",
    message: messages[disc],
    intensity: pct >= 60 ? 0.85 : 0.5,
    triggerStyle: "signal",
  };
}

function buildSocialProofNudge(input: BAEInput, disc: "D" | "I" | "S" | "C"): BehavioralNudge {
  const proof = getSocialProof(input.businessField);

  const messages: Record<string, BilingualText> = {
    D: { he: `${proof.usersCount} עסקים בתחום שלך כבר משתמשים — ${proof.topMetricValue} ${proof.topMetric.he}`, en: `${proof.usersCount} businesses in your field already use this — ${proof.topMetricValue} ${proof.topMetric.en}` },
    I: { he: `הצטרף ל-${proof.usersCount} עסקים שכבר ראו ${proof.topMetricValue} ${proof.topMetric.he}!`, en: `Join ${proof.usersCount} businesses that already saw ${proof.topMetricValue} ${proof.topMetric.en}!` },
    S: { he: `${proof.usersCount} עסקים דומים לשלך כבר בנו אסטרטגיה — אתה לא לבד`, en: `${proof.usersCount} businesses similar to yours already built a strategy — you're not alone` },
    C: { he: `נתוני ביצועים: ${proof.usersCount} עסקים בתחום שלך הגיעו ל-${proof.topMetricValue} ${proof.topMetric.he}`, en: `Performance data: ${proof.usersCount} businesses in your field achieved ${proof.topMetricValue} ${proof.topMetric.en}` },
  };

  return {
    type: "social_proof",
    message: messages[disc],
    intensity: 0.55,
    triggerStyle: "signal",
  };
}

function buildInvestmentNudge(input: BAEInput): BehavioralNudge {
  const plans = input.investment.plansCreated;
  const hours = Math.round(input.investment.totalSessionsMinutes / 60);

  return {
    type: "investment_sunk",
    message: {
      he: `בנית ${plans} ${plans === 1 ? "אסטרטגיה" : "אסטרטגיות"} והשקעת ${hours > 0 ? hours + " שעות" : "זמן יקר"} — הנכס הזה קיים רק כאן`,
      en: `You've built ${plans} ${plans === 1 ? "strategy" : "strategies"} and invested ${hours > 0 ? hours + " hours" : "valuable time"} — this asset exists only here`,
    },
    intensity: Math.min(0.8, 0.3 + plans * 0.1 + hours * 0.02),
    triggerStyle: "signal",
  };
}

function buildCORRecoveryNudge(cor: CORResourceState, disc: "D" | "I" | "S" | "C"): BehavioralNudge {
  const messages: Record<string, BilingualText> = {
    D: { he: "ניצלת כבר הרבה אנרגיה — בדוק את ציון הבריאות שלך (2 דקות)", en: "You've spent significant energy — check your health score (2 min)" },
    I: { he: "הגיע הזמן לניצחון מהיר! ראה את ההישגים שלך ותקבל השראה", en: "Time for a quick win! Check your achievements and get inspired" },
    S: { he: "נח רגע — הצלחת כבר הרבה היום. חזור כשתהיה מוכן", en: "Take a breather — you've accomplished a lot today. Come back when ready" },
    C: { he: "30+ דקות פעילות — המוח שלך צריך הפסקה. סקור את הדשבורד (1 דק')", en: "30+ minutes active — your brain needs a break. Scan the dashboard (1 min)" },
  };

  return {
    type: "cor_recovery",
    message: messages[disc],
    intensity: cor.cognitiveLoad > 80 ? 0.9 : 0.6,
    triggerStyle: "facilitator",
    route: "/dashboard",
  };
}

// ───────────────────────────────────────────────
// Main Engine
// ───────────────────────────────────────────────

export function computeMotivationState(
  input: BAEInput,
  bbCtx?: BlackboardWriteContext,
  ukg?: import("./userKnowledgeGraph").UserKnowledgeGraph,
): MotivationState {
  const cor = computeCORState(input);
  let m = computeMotivation(input);
  const a = computeAbility(cor);
  let t = computeTriggerReadiness(input);

  // Cross-domain: chat goal clarity adjusts trigger readiness
  if (ukg?.chatInsights) {
    if (ukg.chatInsights.goalClarity < 30) t = Math.max(0.1, t * 0.7); // stuck = lower trigger
    else if (ukg.chatInsights.goalClarity > 70) t = Math.min(1, t * 1.2); // clear = higher trigger
  }
  // Cross-domain: urgency signal amplifies motivation
  if (ukg?.derived.urgencySignal === "acute") m = Math.min(1, m + 0.15);
  else if (ukg?.derived.urgencySignal === "mild") m = Math.min(1, m + 0.05);

  const foggScore = m * a * t;
  const triggerStyle = deriveTriggerStyle(m, a);
  const disc = getDominantDISC(input.discProfile);

  // Build all candidate nudges
  const candidates: BehavioralNudge[] = [];

  // COR recovery overrides everything when resources depleted
  if (cor.shouldSimplify) {
    candidates.push(buildCORRecoveryNudge(cor, disc));
  }

  // Loss aversion — strongest when motivation is low (spark)
  candidates.push(buildLossAversionNudge(input, triggerStyle, disc));

  // Goal gradient — when modules partially complete
  if (input.modulesCompleted > 0 && input.modulesCompleted < input.modulesTotal) {
    candidates.push(buildGoalGradientNudge(input, disc));
  }

  // Social proof
  candidates.push(buildSocialProofNudge(input, disc));

  // Investment / sunk cost — when user has built things
  if (input.investment.plansCreated > 0 || input.investment.totalSessionsMinutes > 10) {
    candidates.push(buildInvestmentNudge(input));
  }

  // Sort by intensity (COR recovery will be highest when present)
  candidates.sort((a, b) => b.intensity - a.intensity);

  const nudge = candidates[0];
  const activeDrivers = candidates.slice(0, 5);

  const result: MotivationState = {
    motivation: Math.round(m * 100) / 100,
    ability: Math.round(a * 100) / 100,
    triggerReadiness: Math.round(t * 100) / 100,
    foggScore: Math.round(foggScore * 100) / 100,
    nudge,
    resourceState: cor,
    activeDrivers,
  };

  // Blackboard write (opt-in)
  if (bbCtx) {
    writeContext({
      userId: bbCtx.userId,
      planId: bbCtx.planId,
      key: conceptKey("USER", "motivation", bbCtx.userId),
      stage: "deploy",
      payload: result as unknown as Record<string, unknown>,
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  // Training flywheel
  captureTrainingPair("behavioral_cohort" as EngineCategory, input as unknown as Record<string, unknown>, result as unknown as Record<string, unknown>).catch(() => {});

  return result;
}
