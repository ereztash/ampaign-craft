// ═══════════════════════════════════════════════
// Partial Runner — runs deterministic agents on incomplete form data
// during onboarding so InsightCloud can surface live intelligence
// without any LLM cost. Each call is idempotent: creates a fresh
// throwaway Blackboard and returns formatted insight strings.
// ═══════════════════════════════════════════════

import { Blackboard } from "./blackboardStore";
import { INITIAL_UNIFIED_PROFILE, toFormData } from "@/types/profile";
import type { UnifiedProfile } from "@/types/profile";
import { knowledgeGraphAgent } from "./agents/knowledgeGraphAgent";
import { discAgent } from "./agents/discAgent";
import { funnelAgent } from "./agents/funnelAgent";
import { hormoziAgent } from "./agents/hormoziAgent";
import { closingAgent } from "./agents/closingAgent";
import { healthAgent } from "./agents/healthAgent";
import { coiAgent } from "./agents/coiAgent";

export interface AgentInsight {
  agentKey: string;
  labelHe: string;
  labelEn: string;
  insightHe: string;
  insightEn: string;
}

const DISC_LABELS: Record<"D" | "I" | "S" | "C", { he: string; en: string }> = {
  D: { he: "דומיננטי — מוביל תוצאות", en: "Dominant — results-driven" },
  I: { he: "משפיע — תקשורתי ורגשי", en: "Influential — communicative" },
  S: { he: "יציב — נאמן ומסורתי", en: "Steady — loyal & consistent" },
  C: { he: "מדויק — אנליטי ובוחן", en: "Conscientious — analytical" },
};

const GRADE_LABELS: Record<string, { he: string; en: string }> = {
  irresistible: { he: "בלתי ניתן לסירוב", en: "Irresistible" },
  strong:       { he: "חזק", en: "Strong" },
  average:      { he: "ממוצע", en: "Average" },
  weak:         { he: "דורש חיזוק", en: "Needs work" },
};

function safe(fn: () => void): void {
  try { fn(); } catch { /* partial data — ignore engine errors */ }
}

/**
 * Run deterministic blackboard agents on a partial UnifiedProfile.
 * Returns insights formatted as bilingual display strings.
 * Requires at minimum profile.businessField !== "other" to produce any output.
 */
export function runPartialAgents(profile: Partial<UnifiedProfile>): AgentInsight[] {
  if (!profile.businessField || profile.businessField === "other") return [];

  const full: UnifiedProfile = { ...INITIAL_UNIFIED_PROFILE, ...profile };
  const formData = toFormData(full);

  const board = new Blackboard();
  board.set("formData", formData);

  const insights: AgentInsight[] = [];

  // ── Tier 1: knowledgeGraph (no deps) ─────────
  safe(() => knowledgeGraphAgent.run(board));

  // ── Tier 2: disc + funnel (depend on knowledgeGraph) ─
  safe(() => discAgent.run(board));
  const disc = board.get("discProfile");
  if (disc) {
    const label = DISC_LABELS[disc.primary];
    insights.push({
      agentKey: "disc",
      labelHe: "ארכיטיפ תקשורת",
      labelEn: "Communication archetype",
      insightHe: `קהל שלך: ${label.he} (${disc.primary}/${disc.secondary})`,
      insightEn: `Your audience: ${label.en} (${disc.primary}/${disc.secondary})`,
    });
  }

  safe(() => funnelAgent.run(board));

  // ── Tier 3: hormozi (depends on knowledgeGraph, needs mainGoal) ─
  if (profile.mainGoal) {
    safe(() => hormoziAgent.run(board));
    const hormozi = board.get("hormoziValue");
    if (hormozi) {
      const grade = GRADE_LABELS[hormozi.offerGrade] ?? GRADE_LABELS.average;
      insights.push({
        agentKey: "hormozi",
        labelHe: "ערך הצעה (Hormozi)",
        labelEn: "Offer value (Hormozi)",
        insightHe: `${hormozi.overallScore}/100 — ${grade.he}`,
        insightEn: `${hormozi.overallScore}/100 — ${grade.en}`,
      });
    }
  }

  // ── Tier 4: closing (depends on disc) ────────
  if (disc) {
    safe(() => closingAgent.run(board));
    const closing = board.get("closingStrategy");
    if (closing?.closingStyle) {
      insights.push({
        agentKey: "closing",
        labelHe: "סגנון סגירה",
        labelEn: "Closing style",
        insightHe: closing.closingStyle.he,
        insightEn: closing.closingStyle.en,
      });
    }
  }

  // ── Tier 5: health + coi (depend on funnel) ──
  const funnel = board.get("funnelResult");
  if (funnel) {
    safe(() => healthAgent.run(board));
    const health = board.get("healthScore");
    if (health) {
      const tier =
        health.total >= 75 ? { he: "חזק", en: "Strong" } :
        health.total >= 50 ? { he: "טוב", en: "Good" } :
        { he: "יש מקום לגדול", en: "Room to grow" };
      insights.push({
        agentKey: "health",
        labelHe: "בריאות שיווקית",
        labelEn: "Marketing health",
        insightHe: `${health.total}/100 — ${tier.he}`,
        insightEn: `${health.total}/100 — ${tier.en}`,
      });
    }

    safe(() => coiAgent.run(board));
    const coi = board.get("costOfInaction");
    if (coi && coi.monthlyWaste > 0) {
      insights.push({
        agentKey: "coi",
        labelHe: "עלות חוסר-מעש",
        labelEn: "Cost of inaction",
        insightHe: `₪${coi.monthlyWaste.toLocaleString("he-IL")} לחודש הולכים לאיבוד`,
        insightEn: `₪${coi.monthlyWaste.toLocaleString("en-IL")} wasted per month`,
      });
    }
  }

  return insights;
}
