// ═══════════════════════════════════════════════
// Archetype Classifier — Pure classification engine
// Takes a (partial) BlackboardState and returns a ClassificationResult.
// No I/O, no side effects. Safe to call synchronously post-pipeline.
// ═══════════════════════════════════════════════

import type { BlackboardState } from "./blackboard/blackboardStore";
import type {
  ArchetypeId,
  ArchetypeSignal,
  ClassificationResult,
  ConfidenceTier,
} from "@/types/archetype";

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const EMPTY_SCORES: Record<ArchetypeId, number> = {
  strategist: 0,
  optimizer: 0,
  pioneer: 0,
  connector: 0,
  closer: 0,
};

// DISC tiebreaker: when top two archetypes are tied, DISC primary decides
const DISC_TIEBREAK: Record<string, ArchetypeId> = {
  D: "closer",
  C: "strategist",
  S: "connector",
  I: "pioneer",
};

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.8) return "strong";
  if (confidence >= 0.65) return "confident";
  if (confidence >= 0.5) return "tentative";
  return "none";
}

// ═══════════════════════════════════════════════
// CLASSIFIER
// ═══════════════════════════════════════════════

/**
 * Classify a user into one of 5 behavioral archetypes based on blackboard state.
 *
 * Signal sources (in order of application):
 *   1. formData  — explicit form inputs
 *   2. discProfile — DISC personality dimensions
 *   3. hormoziValue — value equation scores
 *   4. retentionFlywheel — flywheel type
 *   5. churnRisk — risk score and tier
 *   6. healthScore — marketing readiness
 *   7. costOfInaction — monthly waste + unrealized leads
 *   8. knowledgeGraph — voice signals + framing preference
 *
 * Confidence = (topScore - secondScore) / sum(allScores)
 * Ties broken by DISC primary, then fallback to "optimizer".
 */
export function classifyArchetype(
  board: Partial<BlackboardState>,
): ClassificationResult {
  const scores = { ...EMPTY_SCORES };
  const signals: ArchetypeSignal[] = [];

  // ── helper: apply a signal, mutating scores and recording ──
  function applySignal(
    source: ArchetypeSignal["source"],
    field: string,
    value: string | number,
    deltas: Partial<Record<ArchetypeId, number>>,
  ) {
    for (const [k, v] of Object.entries(deltas) as [ArchetypeId, number][]) {
      scores[k] += v;
    }
    signals.push({ source, field, value, deltas, capturedAt: new Date().toISOString() });
  }

  // ═══════════════════════════════════════════════
  // PHASE 1 — formData signals
  // ═══════════════════════════════════════════════
  const fd = board.formData;
  if (fd) {
    // Audience type
    if (fd.audienceType === "b2b") {
      applySignal("formData", "audienceType", "b2b", { strategist: 12, optimizer: 12 });
    } else if (fd.audienceType === "b2c") {
      applySignal("formData", "audienceType", "b2c", { pioneer: 8, connector: 8, closer: 6 });
    } else if (fd.audienceType === "both") {
      applySignal("formData", "audienceType", "both", { strategist: 4, optimizer: 4, pioneer: 4, connector: 4, closer: 4 });
    }

    // Main goal
    if (fd.mainGoal === "sales") {
      applySignal("formData", "mainGoal", "sales", { pioneer: 10, closer: 15 });
    } else if (fd.mainGoal === "leads") {
      applySignal("formData", "mainGoal", "leads", { strategist: 12, optimizer: 10, closer: 5 });
    } else if (fd.mainGoal === "loyalty") {
      applySignal("formData", "mainGoal", "loyalty", { connector: 20 });
    } else if (fd.mainGoal === "awareness") {
      applySignal("formData", "mainGoal", "awareness", { pioneer: 12, connector: 8 });
    }

    // Sales model
    if (fd.salesModel === "subscription") {
      applySignal("formData", "salesModel", "subscription", { optimizer: 18, strategist: 5, connector: 5 });
    } else if (fd.salesModel === "leads") {
      applySignal("formData", "salesModel", "leads", { strategist: 10, optimizer: 5, closer: 8 });
    } else if (fd.salesModel === "oneTime") {
      applySignal("formData", "salesModel", "oneTime", { pioneer: 6, closer: 12 });
    }

    // Experience level
    if (fd.experienceLevel === "advanced") {
      applySignal("formData", "experienceLevel", "advanced", { strategist: 15, optimizer: 15, closer: 5 });
    } else if (fd.experienceLevel === "intermediate") {
      applySignal("formData", "experienceLevel", "intermediate", { strategist: 5, optimizer: 5, pioneer: 5, connector: 5, closer: 5 });
    } else if (fd.experienceLevel === "beginner" || fd.experienceLevel === "") {
      applySignal("formData", "experienceLevel", "beginner", { pioneer: 18, connector: 5 });
    }

    // Budget range
    if (fd.budgetRange === "veryHigh") {
      applySignal("formData", "budgetRange", "veryHigh", { strategist: 8, optimizer: 8, closer: 10 });
    } else if (fd.budgetRange === "high") {
      applySignal("formData", "budgetRange", "high", { strategist: 5, optimizer: 5, pioneer: 3, connector: 3, closer: 8 });
    }

    // Existing channels count
    const chCount = fd.existingChannels?.length ?? 0;
    if (chCount >= 3) {
      applySignal("formData", "existingChannels.length", chCount, { strategist: 10, optimizer: 10 });
    } else if (chCount <= 1) {
      applySignal("formData", "existingChannels.length", chCount, { pioneer: 10, connector: 5 });
    }

    // Business field
    const fieldMap: Record<string, Partial<Record<ArchetypeId, number>>> = {
      tech:          { strategist: 8, optimizer: 12, pioneer: 3 },
      services:      { strategist: 8, connector: 10, closer: 10 },
      education:     { pioneer: 10, connector: 8 },
      personalBrand: { pioneer: 10, connector: 8 },
      food:          { pioneer: 5, connector: 10, closer: 5 },
      tourism:       { pioneer: 5, connector: 10, closer: 5 },
      fashion:       { pioneer: 5, connector: 10, closer: 5 },
      realEstate:    { strategist: 5, optimizer: 5, closer: 12 },
      health:        { connector: 8, pioneer: 5 },
    };
    if (fd.businessField && fieldMap[fd.businessField]) {
      applySignal("formData", "businessField", fd.businessField, fieldMap[fd.businessField]);
    }
  }

  // ═══════════════════════════════════════════════
  // PHASE 2 — DISC profile signals
  // ═══════════════════════════════════════════════
  const disc = board.discProfile;
  if (disc) {
    const primaryMap: Record<string, Partial<Record<ArchetypeId, number>>> = {
      D: { optimizer: 5, pioneer: 5, closer: 22 },
      C: { strategist: 18, optimizer: 18 },
      S: { strategist: 5, connector: 22 },
      I: { pioneer: 12, connector: 15, closer: 5 },
    };
    if (primaryMap[disc.primary]) {
      applySignal("discProfile", "discProfile.primary", disc.primary, primaryMap[disc.primary]);
    }

    // Distribution thresholds
    if (disc.distribution.D >= 60) {
      applySignal("discProfile", "discProfile.distribution.D", disc.distribution.D, { closer: 12 });
    }
    if (disc.distribution.C >= 60) {
      applySignal("discProfile", "discProfile.distribution.C", disc.distribution.C, { strategist: 12, optimizer: 12 });
    }
    if (disc.distribution.S >= 60) {
      applySignal("discProfile", "discProfile.distribution.S", disc.distribution.S, { connector: 12 });
    }
  }

  // ═══════════════════════════════════════════════
  // PHASE 3 — Hormozi value signals
  // ═══════════════════════════════════════════════
  const hv = board.hormoziValue;
  if (hv) {
    if (hv.dreamOutcome.score > 70) {
      applySignal("hormoziValue", "hormoziValue.dreamOutcome.score", hv.dreamOutcome.score, { pioneer: 15, closer: 10 });
    } else if (hv.dreamOutcome.score <= 40) {
      applySignal("hormoziValue", "hormoziValue.dreamOutcome.score", hv.dreamOutcome.score, { strategist: 8, optimizer: 5, connector: 5 });
    }

    if (hv.perceivedLikelihood.score < 50) {
      applySignal("hormoziValue", "hormoziValue.perceivedLikelihood.score", hv.perceivedLikelihood.score, { strategist: 15, optimizer: 5 });
    } else if (hv.perceivedLikelihood.score >= 70) {
      applySignal("hormoziValue", "hormoziValue.perceivedLikelihood.score", hv.perceivedLikelihood.score, { optimizer: 10, pioneer: 8, closer: 10 });
    }

    if (hv.overallScore > 75) {
      applySignal("hormoziValue", "hormoziValue.overallScore", hv.overallScore, { strategist: 5, optimizer: 15, pioneer: 5, closer: 8 });
    }
    if (hv.offerGrade === "irresistible") {
      applySignal("hormoziValue", "hormoziValue.offerGrade", hv.offerGrade, { optimizer: 10, closer: 12 });
    }
  }

  // ═══════════════════════════════════════════════
  // PHASE 4 — Retention flywheel signals
  // ═══════════════════════════════════════════════
  const fw = board.retentionFlywheel;
  if (fw) {
    const typeMap: Record<string, Partial<Record<ArchetypeId, number>>> = {
      community:    { connector: 25 },
      subscription: { optimizer: 20, strategist: 5, connector: 5 },
      content:      { pioneer: 15, connector: 10 },
      transactional:{ closer: 15, pioneer: 5 },
    };
    if (typeMap[fw.type]) {
      applySignal("retentionFlywheel", "retentionFlywheel.type", fw.type, typeMap[fw.type]);
    }
    if (fw.churnReduction >= 35) {
      applySignal("retentionFlywheel", "retentionFlywheel.churnReduction", fw.churnReduction, { strategist: 8, optimizer: 10, connector: 5 });
    }
  }

  // ═══════════════════════════════════════════════
  // PHASE 5 — Churn risk signals
  // ═══════════════════════════════════════════════
  const cr = board.churnRisk;
  if (cr) {
    if (cr.riskScore > 60) {
      applySignal("churnRisk", "churnRisk.riskScore", cr.riskScore, { connector: 20 });
    }
    if (cr.riskScore > 80) {
      applySignal("churnRisk", "churnRisk.riskScore.high", cr.riskScore, { connector: 10 });
    }
    if (cr.riskTier === "healthy") {
      applySignal("churnRisk", "churnRisk.riskTier", cr.riskTier, { strategist: 8, optimizer: 10 });
    }
  }

  // ═══════════════════════════════════════════════
  // PHASE 6 — Health score signals
  // ═══════════════════════════════════════════════
  const hs = board.healthScore;
  if (hs) {
    if (hs.total < 40) {
      applySignal("healthScore", "healthScore.total", hs.total, { pioneer: 20, connector: 5 });
    } else if (hs.total <= 60) {
      applySignal("healthScore", "healthScore.total", hs.total, { pioneer: 10, connector: 8, closer: 5 });
    } else if (hs.total > 75) {
      applySignal("healthScore", "healthScore.total", hs.total, { strategist: 15, optimizer: 15, closer: 5 });
    }
  }

  // ═══════════════════════════════════════════════
  // PHASE 7 — Cost of inaction signals
  // ═══════════════════════════════════════════════
  const coi = board.costOfInaction;
  if (coi) {
    if (coi.monthlyWaste > 15000) {
      applySignal("costOfInaction", "costOfInaction.monthlyWaste", coi.monthlyWaste, { closer: 20, optimizer: 5 });
    }
    if (coi.monthlyWaste > 30000) {
      applySignal("costOfInaction", "costOfInaction.monthlyWaste.high", coi.monthlyWaste, { closer: 10, optimizer: 5 });
    }
    if (coi.unrealizedLeads > 50) {
      applySignal("costOfInaction", "costOfInaction.unrealizedLeads", coi.unrealizedLeads, { strategist: 5, connector: 10, closer: 8 });
    }
  }

  // ═══════════════════════════════════════════════
  // PHASE 8 — Knowledge graph signals
  // ═══════════════════════════════════════════════
  const kg = board.knowledgeGraph;
  if (kg?.voice) {
    if (kg.voice.dugriScore > 0.7) {
      applySignal("knowledgeGraph", "knowledgeGraph.voice.dugriScore", kg.voice.dugriScore, { pioneer: 10, closer: 15 });
    } else if (kg.voice.dugriScore < 0.3) {
      applySignal("knowledgeGraph", "knowledgeGraph.voice.dugriScore", kg.voice.dugriScore, { strategist: 8, optimizer: 8, connector: 5 });
    }

    if (kg.voice.register === "formal") {
      applySignal("knowledgeGraph", "knowledgeGraph.voice.register", kg.voice.register, { strategist: 10, optimizer: 8 });
    } else if (kg.voice.register === "casual") {
      applySignal("knowledgeGraph", "knowledgeGraph.voice.register", kg.voice.register, { connector: 12, pioneer: 8, closer: 5 });
    }
  }
  if (kg?.derived) {
    if (kg.derived.framingPreference === "gain") {
      applySignal("knowledgeGraph", "knowledgeGraph.derived.framingPreference", "gain", { optimizer: 8, pioneer: 10, closer: 12 });
    } else if (kg.derived.framingPreference === "loss") {
      applySignal("knowledgeGraph", "knowledgeGraph.derived.framingPreference", "loss", { strategist: 12, optimizer: 5, connector: 5, closer: 5 });
    }

    if (kg.derived.complexityLevel === "advanced") {
      applySignal("knowledgeGraph", "knowledgeGraph.derived.complexityLevel", "advanced", { strategist: 12, optimizer: 12 });
    } else if (kg.derived.complexityLevel === "simple") {
      applySignal("knowledgeGraph", "knowledgeGraph.derived.complexityLevel", "simple", { pioneer: 12, connector: 8, closer: 5 });
    }
  }

  // ═══════════════════════════════════════════════
  // COMPUTE CLASSIFICATION
  // ═══════════════════════════════════════════════
  const sortedEntries = (Object.entries(scores) as [ArchetypeId, number][])
    .sort((a, b) => b[1] - a[1]);

  const [topEntry, secondEntry] = sortedEntries;
  const totalScore = sortedEntries.reduce((sum, [, v]) => sum + v, 0);

  // Confidence = normalized spread between #1 and #2
  const confidence = totalScore > 0
    ? (topEntry[1] - secondEntry[1]) / totalScore
    : 0;

  const confidenceTier = getConfidenceTier(confidence);

  // Tiebreaker via DISC primary; final fallback: optimizer
  let archetypeId: ArchetypeId = topEntry[0];
  if (topEntry[1] === secondEntry[1] && disc) {
    archetypeId = DISC_TIEBREAK[disc.primary] ?? "optimizer";
  } else if (topEntry[1] === 0) {
    archetypeId = "optimizer"; // Cold start fallback
  }

  return { archetypeId, confidence, confidenceTier, scores, signals };
}

// ═══════════════════════════════════════════════
// SESSION SMOOTHING
// ═══════════════════════════════════════════════

/**
 * Blend new classification scores with existing profile scores.
 * Uses 70% new + 30% previous to prevent UI flickering across sessions.
 */
export function blendScores(
  newScores: Record<ArchetypeId, number>,
  previousScores: Record<ArchetypeId, number>,
): Record<ArchetypeId, number> {
  const result = { ...EMPTY_SCORES };
  for (const k of Object.keys(newScores) as ArchetypeId[]) {
    result[k] = Math.round(newScores[k] * 0.7 + (previousScores[k] ?? 0) * 0.3);
  }
  return result;
}
