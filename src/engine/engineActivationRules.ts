// Engine Activation Rules — Lazy Activation Pattern
//
// Tier B/C engines are not run unconditionally. Each rule defines:
//   • engineId: the engine to gate
//   • condition: a pure predicate over user signals — returns true when the
//     engine should switch from "passive" to the target mode
//   • mode: the activation level
//       "passive"  — engine registered but not running (default)
//       "standby"  — engine loaded, will run on next signal cycle
//       "active"   — engine runs every cycle (same as Tier S)
//
// Trigger taxonomy (four types, per architecture doc):
//   DATA_THRESHOLD   — raw count / metric crosses a threshold
//   TIME_IN_SYSTEM   — calendar days since first session
//   HEALTH_ANOMALY   — health-score delta crosses a negative bound
//   INTENT_SIGNAL    — explicit user action (tab visit, query keyword)

export type ActivationMode = "passive" | "standby" | "active";

export type TriggerType =
  | "DATA_THRESHOLD"
  | "TIME_IN_SYSTEM"
  | "HEALTH_ANOMALY"
  | "INTENT_SIGNAL";

export interface ActivationSignals {
  /** Number of leads currently in the CRM. */
  leadCount: number;
  /** Calendar days elapsed since the user's first session. */
  daysActive: number;
  /** Latest health-score total (0-100). */
  healthScore: number;
  /** Health-score change since the previous cycle (negative = decline). */
  healthScoreDelta: number;
  /** Free-text intent keywords extracted from the last coach query. */
  intentKeywords: string[];
  /** IDs of dashboard tabs the user has visited this session. */
  visitedTabs: string[];
}

export interface EngineActivationRule {
  engineId: string;
  triggerType: TriggerType;
  condition: (signals: ActivationSignals) => boolean;
  mode: ActivationMode;
}

// ─── Rules ───────────────────────────────────────────────────────────────────

export const ENGINE_ACTIVATION_RULES: EngineActivationRule[] = [
  // ── DATA_THRESHOLD ────────────────────────────────────────────────────────

  {
    engineId: "salesPipelineEngine",
    triggerType: "DATA_THRESHOLD",
    condition: (s) => s.leadCount >= 20,
    mode: "active",
  },
  {
    engineId: "churnPredictionEngine",
    triggerType: "DATA_THRESHOLD",
    condition: (s) => s.leadCount >= 10,
    mode: "active",
  },
  {
    engineId: "channelRoiEngine",
    triggerType: "DATA_THRESHOLD",
    condition: (s) => s.leadCount >= 5,
    mode: "active",
  },
  {
    engineId: "behavioralCohortEngine",
    triggerType: "DATA_THRESHOLD",
    condition: (s) => s.leadCount >= 50,
    mode: "active",
  },

  // ── TIME_IN_SYSTEM ────────────────────────────────────────────────────────

  {
    engineId: "retentionFlywheelEngine",
    triggerType: "TIME_IN_SYSTEM",
    condition: (s) => s.daysActive >= 30,
    mode: "active",
  },
  {
    engineId: "behavioralCohortEngine",
    triggerType: "TIME_IN_SYSTEM",
    // Promote to standby even before lead threshold is met.
    condition: (s) => s.daysActive >= 30 && s.leadCount < 50,
    mode: "standby",
  },
  {
    engineId: "crossDomainBenchmarkEngine",
    triggerType: "TIME_IN_SYSTEM",
    condition: (s) => s.daysActive >= 14,
    mode: "active",
  },
  {
    engineId: "predictiveContentScoreEngine",
    triggerType: "TIME_IN_SYSTEM",
    condition: (s) => s.daysActive >= 7,
    mode: "active",
  },

  // ── HEALTH_ANOMALY ────────────────────────────────────────────────────────

  {
    engineId: "bottleneckEngine",
    triggerType: "HEALTH_ANOMALY",
    // Escalate to active when health drops more than 10 points in one cycle.
    condition: (s) => s.healthScoreDelta <= -10,
    mode: "active",
  },
  {
    engineId: "gapEngine",
    triggerType: "HEALTH_ANOMALY",
    condition: (s) => s.healthScoreDelta <= -10,
    mode: "active",
  },
  {
    engineId: "costOfInactionEngine",
    triggerType: "HEALTH_ANOMALY",
    condition: (s) => s.healthScore < 50,
    mode: "active",
  },

  // ── INTENT_SIGNAL ─────────────────────────────────────────────────────────

  {
    engineId: "pricingWizardEngine",
    triggerType: "INTENT_SIGNAL",
    condition: (s) =>
      s.intentKeywords.some((k) =>
        ["מחיר", "price", "תמחור", "pricing", "עלות", "cost"].includes(k.toLowerCase()),
      ) || s.visitedTabs.includes("pricing"),
    mode: "active",
  },
  {
    engineId: "hormoziValueEngine",
    triggerType: "INTENT_SIGNAL",
    condition: (s) =>
      s.intentKeywords.some((k) =>
        ["value", "ערך", "offer", "הצעה", "hormozi"].includes(k.toLowerCase()),
      ),
    mode: "active",
  },
  {
    engineId: "emotionalPerformanceEngine",
    triggerType: "INTENT_SIGNAL",
    condition: (s) =>
      s.visitedTabs.includes("intelligence") ||
      s.intentKeywords.some((k) =>
        ["emotion", "רגש", "dopamine", "cortisol"].includes(k.toLowerCase()),
      ),
    mode: "active",
  },
  {
    engineId: "churnPlaybookEngine",
    triggerType: "INTENT_SIGNAL",
    condition: (s) =>
      s.visitedTabs.includes("retention") ||
      s.intentKeywords.some((k) =>
        ["churn", "נטישה", "retention", "שימור"].includes(k.toLowerCase()),
      ),
    mode: "active",
  },
];

// ─── Evaluator ───────────────────────────────────────────────────────────────

/**
 * Returns the highest activation mode for a given engine based on current signals.
 * When multiple rules match the same engine, the strongest mode wins.
 */
export function resolveActivationMode(
  engineId: string,
  signals: ActivationSignals,
): ActivationMode {
  const ORDER: ActivationMode[] = ["passive", "standby", "active"];

  let resolved: ActivationMode = "passive";
  for (const rule of ENGINE_ACTIVATION_RULES) {
    if (rule.engineId !== engineId) continue;
    if (!rule.condition(signals)) continue;
    if (ORDER.indexOf(rule.mode) > ORDER.indexOf(resolved)) {
      resolved = rule.mode;
    }
  }
  return resolved;
}

/**
 * Returns all engines that should be active given current signals,
 * including their resolved mode. Tier S engines are always active and
 * are NOT listed here — this only governs Tier B/C lazy engines.
 */
export function getActiveEngines(
  signals: ActivationSignals,
): { engineId: string; mode: ActivationMode }[] {
  const engineIds = [...new Set(ENGINE_ACTIVATION_RULES.map((r) => r.engineId))];
  return engineIds
    .map((engineId) => ({ engineId, mode: resolveActivationMode(engineId, signals) }))
    .filter((e) => e.mode !== "passive");
}
