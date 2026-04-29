// ═══════════════════════════════════════════════
// crmInsightEngine — Deterministic aggregation over leads + interactions.
//
// Pure functions: same inputs → same outputs, no I/O. Returns the
// signals that the rest of the system can NOT infer from profile data:
//
//   • actualConversion       — close rate / win rate / time-to-close
//   • winLossThemes          — clustered why_us / lost_reason themes
//   • objectionPatterns      — top recurring objections
//   • staleLeads             — leads with no interaction in N days
//   • ltvActual              — real average deal value vs predicted
//
// Threshold: insights are computed but `meaningful` is false until
// ≥10 closed leads exist (statistical-noise floor). Consumers should
// gate UI/agent integration on `meaningful`.
// ═══════════════════════════════════════════════

import type { Lead, LeadInteraction } from "@/services/leadsService";

export const MIN_CLOSED_LEADS_FOR_INSIGHTS = 10;
export const STALE_LEAD_DAYS_DEFAULT = 7;

export interface ThemeCluster {
  /** Stable id derived from the leading keyword. */
  id: string;
  /** Display label (lower-cased keyword). */
  label: string;
  /** How many leads contain this theme. */
  count: number;
  /** Sample lead names — UX hint, not for analytics. */
  sampleNames: string[];
}

export interface CrmInsights {
  /** Becomes true once ≥10 closed leads exist. Until then UI hides numbers. */
  meaningful: boolean;
  totalLeads: number;
  closedCount: number;
  lostCount: number;
  openCount: number;
  /** closed / (closed + lost). 0 when neither. */
  closeRate: number;
  /** Median ms from created_at → closed_at among closed leads. */
  medianTimeToCloseMs: number | null;
  /** Average value_nis among closed leads. */
  ltvActualNIS: number;
  /** Total open pipeline value. */
  openPipelineNIS: number;
  /** Clusters from why_us field — moat signals. */
  winThemes: ThemeCluster[];
  /** Clusters from lost_reason field — objection patterns. */
  objectionThemes: ThemeCluster[];
  /** Clusters from source field — real acquisition channels. */
  sourceThemes: ThemeCluster[];
  /** Open leads with no interaction in `staleDays` (default 7). */
  staleLeads: Array<{ leadId: string; name: string; daysSinceLastTouch: number }>;
}

// ─── Helpers ────────────────────────────────────

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Hebrew + English stop words. We strip punctuation, lower-case and skip
// these before clustering free-text fields. Keeping it short on purpose:
// the goal is "show themes the user can recognize" not perfect NLP.
const STOPWORDS = new Set<string>([
  // English
  "the","a","an","and","or","but","of","in","on","for","to","with","at","by","from","is","was","be","very","really","just","not","no","yes",
  "i","you","he","she","it","we","they","my","your","his","her","its","our","their","this","that","these","those","as","so",
  // Hebrew
  "של","את","על","עם","או","גם","אבל","הוא","היא","אני","אתה","אתם","אנחנו","הם","הן","זה","זאת","אלה","אילו","היה","הייתי","מה","איך","למה",
  "כי","אם","רק","עוד","יותר","פחות","טוב","רע","לא","כן","אפילו","כל","אחד","שני","שתי","ל","ב","ה","ו","מ","ש",
]);

function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

interface NameWithText {
  name: string;
  text: string;
}

function clusterThemes(
  inputs: NameWithText[],
  topN: number,
): ThemeCluster[] {
  // Bag-of-words clustering: count tokens, pick top N. For each top
  // token, attach up to 3 sample lead names whose text contained it.
  // Cheap and explainable; good enough until we have a real LLM cluster
  // pass (Phase 6, optional).
  const tokenCounts = new Map<string, number>();
  const tokenSamples = new Map<string, string[]>();

  for (const { name, text } of inputs) {
    const seen = new Set<string>();
    for (const tok of tokenize(text)) {
      if (seen.has(tok)) continue;
      seen.add(tok);
      tokenCounts.set(tok, (tokenCounts.get(tok) ?? 0) + 1);
      const samples = tokenSamples.get(tok) ?? [];
      if (samples.length < 3) samples.push(name);
      tokenSamples.set(tok, samples);
    }
  }

  return [...tokenCounts.entries()]
    .filter(([, count]) => count >= 2)        // require at least 2 mentions
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([token, count]) => ({
      id: token,
      label: token,
      count,
      sampleNames: tokenSamples.get(token) ?? [],
    }));
}

function isTerminal(status: Lead["status"]): boolean {
  return status === "closed" || status === "lost";
}

// ─── Engine ─────────────────────────────────────

export interface ComputeOptions {
  /** Threshold (days) for marking an open lead as "stale". Default 7. */
  staleDays?: number;
  /** Pin "now" for tests. */
  now?: Date;
}

export function computeCrmInsights(
  leads: Lead[],
  interactions: LeadInteraction[],
  options: ComputeOptions = {},
): CrmInsights {
  const staleDays = options.staleDays ?? STALE_LEAD_DAYS_DEFAULT;
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const staleThresholdMs = staleDays * 24 * 60 * 60 * 1000;

  const closed = leads.filter((l) => l.status === "closed");
  const lost = leads.filter((l) => l.status === "lost");
  const open = leads.filter((l) => !isTerminal(l.status));

  const meaningful = closed.length + lost.length >= MIN_CLOSED_LEADS_FOR_INSIGHTS;

  // Close rate over decided leads only — open leads don't count yet.
  const decided = closed.length + lost.length;
  const closeRate = decided === 0 ? 0 : closed.length / decided;

  // Time-to-close in ms among leads that have a closed_at timestamp.
  const ttcMs: number[] = [];
  for (const l of closed) {
    if (!l.closedAt) continue;
    const start = new Date(l.createdAt).getTime();
    const end = new Date(l.closedAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      ttcMs.push(end - start);
    }
  }

  const ltvActualNIS =
    closed.length === 0
      ? 0
      : closed.reduce((s, l) => s + (l.valueNIS || 0), 0) / closed.length;

  const openPipelineNIS = open.reduce((s, l) => s + (l.valueNIS || 0), 0);

  // Themes — only from leads that filled the qualitative field. Skipped
  // leads contribute zero signal (correctly) instead of biasing toward
  // the loud minority that did fill it.
  const winInputs: NameWithText[] = closed
    .filter((l) => l.whyUs.trim().length > 0)
    .map((l) => ({ name: l.name, text: l.whyUs }));
  const objectionInputs: NameWithText[] = lost
    .filter((l) => l.lostReason.trim().length > 0)
    .map((l) => ({ name: l.name, text: l.lostReason }));
  const sourceInputs: NameWithText[] = leads
    .filter((l) => l.source.trim().length > 0)
    .map((l) => ({ name: l.name, text: l.source }));

  const winThemes = clusterThemes(winInputs, 5);
  const objectionThemes = clusterThemes(objectionInputs, 5);
  const sourceThemes = clusterThemes(sourceInputs, 5);

  // Stale leads: open and (no interaction in staleDays) since either
  // the most recent interaction or the lead's creation timestamp.
  const lastTouchByLead = new Map<string, number>();
  for (const ix of interactions) {
    const t = new Date(ix.occurredAt).getTime();
    if (!Number.isFinite(t)) continue;
    const prev = lastTouchByLead.get(ix.leadId) ?? 0;
    if (t > prev) lastTouchByLead.set(ix.leadId, t);
  }
  const staleLeads = open
    .map((l) => {
      const lastTouch = lastTouchByLead.get(l.id) ?? new Date(l.createdAt).getTime();
      const sinceMs = nowMs - lastTouch;
      const days = Math.floor(sinceMs / (24 * 60 * 60 * 1000));
      return { leadId: l.id, name: l.name, daysSinceLastTouch: days, sinceMs };
    })
    .filter((s) => s.sinceMs >= staleThresholdMs)
    .sort((a, b) => b.sinceMs - a.sinceMs)
    .map(({ leadId, name, daysSinceLastTouch }) => ({ leadId, name, daysSinceLastTouch }));

  return {
    meaningful,
    totalLeads: leads.length,
    closedCount: closed.length,
    lostCount: lost.length,
    openCount: open.length,
    closeRate,
    medianTimeToCloseMs: median(ttcMs),
    ltvActualNIS,
    openPipelineNIS,
    winThemes,
    objectionThemes,
    sourceThemes,
    staleLeads,
  };
}
