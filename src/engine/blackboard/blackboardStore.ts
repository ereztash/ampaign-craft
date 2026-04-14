// ═══════════════════════════════════════════════
// Blackboard Store — Shared Knowledge Space
// All agents read from and write to this shared state.
// Enables reactive triggering and dependency management.
// ═══════════════════════════════════════════════

import type { FormData, FunnelResult } from "@/types/funnel";
import type { UserKnowledgeGraph } from "../userKnowledgeGraph";
import type { DISCProfile } from "../discProfileEngine";
import type { NeuroClosingStrategy } from "../neuroClosingEngine";
import type { HormoziValueResult } from "@/types/funnel";
import type { CostOfInaction } from "../costOfInactionEngine";
import type { ChurnRiskAssessment } from "../churnPredictionEngine";
import type { HealthScore } from "../healthScoreEngine";
import type { RetentionFlywheel } from "../retentionFlywheelEngine";
import type { CopyQAResult } from "../copyQAEngine";
import type { QAStaticResult, QAContentResult, QASecurityResult, QAOverallScore } from "@/types/qa";
import type { ResearchSession } from "@/types/research";
import type { ModelTier } from "@/services/llmRouter";
import { verifyWrite } from "./ontologicalVerifier";

// ═══════════════════════════════════════════════
// TELEMETRY TYPES
// ═══════════════════════════════════════════════

/**
 * Logged whenever verifyWrite() returns { ok: false }.
 * Used by Φ_META_AGENT to compute per-agent rejection rates.
 */
export interface WriteRejectionEvent {
  /** Board section the agent attempted to write. */
  conceptKey: string;
  /** Rejection code from ontologicalVerifier (e.g. "null_payload"). */
  reason: string;
  /** Agent that attempted the write. */
  agentName: string;
  /** LLM tier if the agent is LLM-powered. */
  modelTier?: ModelTier;
  /** Unix ms timestamp. */
  timestamp: number;
}

/**
 * Logged whenever a valid write OVERWRITES an existing (non-null) value.
 * `survivalMs` = time the previous value lived before being replaced.
 * Used by Φ_META_AGENT to compute Semantic Half-Life.
 */
export interface HalfLifeEvent {
  /** Board section that was overwritten. */
  conceptKey: string;
  /** How long the previous value survived (ms). */
  survivalMs: number;
  /** Agent performing the new write. */
  agentName: string;
  modelTier?: ModelTier;
  timestamp: number;
}

/**
 * Logged on every successful verifiedSet() call.
 * Provides the denominator for per-agent rejection rate calculations.
 */
export interface WriteSuccessEvent {
  conceptKey: string;
  agentName: string;
  modelTier?: ModelTier;
  timestamp: number;
  /** true if this write replaced a non-null existing value. */
  wasOverwrite: boolean;
}

/**
 * Context the calling agent passes to verifiedSet().
 */
export interface WriteEventContext {
  agentName: string;
  modelTier?: ModelTier;
}

// ═══════════════════════════════════════════════
// META METRICS (output of Φ_META_AGENT)
// ═══════════════════════════════════════════════

export interface AgentMetaStats {
  agentName: string;
  modelTier?: string;
  totalWrites: number;
  totalRejections: number;
  /** Fraction 0–1. Exceeding REJECTION_THRESHOLD triggers a recommendation. */
  rejectionRate: number;
  /** Set when rejectionRate > threshold. Suggests remediation action. */
  recommendation?: string;
}

export interface MetaMetrics {
  /** Cycle identifier — Unix ms of pipeline start. */
  cycleId: string;
  evaluatedAt: number;
  cycleDurationMs: number;
  /** System-wide fraction of writes rejected by the ontologicalVerifier. */
  systemRejectionRate: number;
  /**
   * J gradient for this cycle: information gain ratio.
   * J = 1 − systemRejectionRate  (1 = perfect, 0 = total rejection)
   */
  jGradient: number;
  /** Average survival time (ms) of values before being overwritten. null = no overwrites. */
  avgHalfLifeMs: number | null;
  /** Per-agent breakdown. */
  perAgent: AgentMetaStats[];
  /** Agent names exceeding the rejection-rate threshold. */
  flaggedAgents: string[];
}

// ═══════════════════════════════════════════════
// BOARD SECTIONS
// ═══════════════════════════════════════════════

export interface BlackboardState {
  // Input
  formData: FormData | null;

  // Core outputs
  knowledgeGraph: UserKnowledgeGraph | null;
  funnelResult: FunnelResult | null;

  // Analysis layers
  discProfile: DISCProfile | null;
  closingStrategy: NeuroClosingStrategy | null;
  hormoziValue: HormoziValueResult | null;
  costOfInaction: CostOfInaction | null;
  churnRisk: ChurnRiskAssessment | null;
  healthScore: HealthScore | null;
  retentionFlywheel: RetentionFlywheel | null;
  copyQA: CopyQAResult | null;

  // QA Pipeline (MAS-CC Phase 2)
  qaStaticResult: QAStaticResult | null;
  qaContentResult: QAContentResult | null;
  qaSecurityResult: QASecurityResult | null;
  qaOverallScore: QAOverallScore | null;

  // Research (MAS-CC Phase 3)
  researchSession: ResearchSession | null;

  // Φ_META_AGENT output (MAS-CC Phase 4)
  metaMetrics: MetaMetrics | null;

  // Meta / orchestration
  completedAgents: string[];
  errors: { agent: string; error: string }[];
}

export type BoardSection = keyof BlackboardState;

type Listener = (section: BoardSection, state: BlackboardState) => void;

/**
 * Hard cap on concurrent listeners per Blackboard instance.
 * Exceeding this almost certainly indicates a missing cleanup call
 * (e.g., a React component that subscribed but never called the
 * unsubscribe function returned by onUpdate on unmount).
 * A warning is emitted; the new listener is still registered so the
 * board remains functional, but the warning surfaces the leak early.
 */
const MAX_LISTENERS = 50;

// ═══════════════════════════════════════════════
// BLACKBOARD CLASS
// ═══════════════════════════════════════════════

export class Blackboard {
  private state: BlackboardState;
  private listeners: Listener[] = [];

  // ── Telemetry logs (not part of board state — internal only) ──
  private rejectionLog: WriteRejectionEvent[] = [];
  private halfLifeLog: HalfLifeEvent[] = [];
  private successLog: WriteSuccessEvent[] = [];

  /** Tracks when each section was last successfully written (ms). */
  private lastWrittenAt: Partial<Record<BoardSection, number>> = {};

  /** Unix ms when this Blackboard was constructed (cycle start). */
  private readonly cycleStartMs: number;

  constructor() {
    this.state = createEmptyBoard();
    this.cycleStartMs = Date.now();
  }

  // ── Standard read/write ──────────────────────

  /**
   * Get the current board state (read-only snapshot).
   */
  getState(): Readonly<BlackboardState> {
    return this.state;
  }

  /**
   * Get a specific section of the board.
   */
  get<K extends BoardSection>(section: K): BlackboardState[K] {
    return this.state[section];
  }

  /**
   * Write to a specific section and notify listeners.
   * Internal use only — bypasses the ontologicalVerifier.
   * Use verifiedSet() for agent writes.
   */
  set<K extends BoardSection>(section: K, value: BlackboardState[K]): void {
    this.state = { ...this.state, [section]: value };
    this.notify(section);
  }

  // ── Verified write (agent path) ──────────────

  /**
   * Write a value to the board, gated by the ontologicalVerifier.
   *
   * If the write passes (J > 0):
   *   - Records a WriteSuccessEvent
   *   - If overwriting an existing value: records a HalfLifeEvent
   *   - Calls set() to update state and notify listeners
   *   - Returns true
   *
   * If the write fails (J ≤ 0):
   *   - Records a WriteRejectionEvent (telemetry for Φ_META_AGENT)
   *   - Does NOT update state
   *   - Returns false (soft rejection — agent continues)
   */
  verifiedSet<K extends BoardSection>(
    section: K,
    value: BlackboardState[K],
    ctx: WriteEventContext,
  ): boolean {
    const current = this.state[section];
    const result = verifyWrite({
      section,
      incoming: value,
      current,
      agentName: ctx.agentName,
      modelTier: ctx.modelTier,
    });

    const now = Date.now();

    if (!result.ok) {
      this.rejectionLog.push({
        conceptKey: section,
        reason: result.reason ?? "unknown",
        agentName: ctx.agentName,
        modelTier: ctx.modelTier,
        timestamp: now,
      });
      return false;
    }

    // Track semantic half-life: how long the previous value survived
    const prevWriteTs = this.lastWrittenAt[section];
    if (current !== null && prevWriteTs !== undefined) {
      this.halfLifeLog.push({
        conceptKey: section,
        survivalMs: now - prevWriteTs,
        agentName: ctx.agentName,
        modelTier: ctx.modelTier,
        timestamp: now,
      });
    }

    // Record successful write
    this.successLog.push({
      conceptKey: section,
      agentName: ctx.agentName,
      modelTier: ctx.modelTier,
      timestamp: now,
      wasOverwrite: current !== null,
    });

    this.lastWrittenAt[section] = now;
    this.set(section, value);
    return true;
  }

  // ── Orchestration methods ────────────────────

  /**
   * Mark an agent as completed.
   */
  markAgentComplete(agentName: string): void {
    this.state = {
      ...this.state,
      completedAgents: [...this.state.completedAgents, agentName],
    };
  }

  /**
   * Record an agent error.
   */
  recordError(agentName: string, error: string): void {
    this.state = {
      ...this.state,
      errors: [...this.state.errors, { agent: agentName, error }],
    };
  }

  // ── Telemetry accessors (read-only, for Φ_META_AGENT) ───

  /** All writes rejected by the ontologicalVerifier in this cycle. */
  getRejectionLog(): readonly WriteRejectionEvent[] {
    return this.rejectionLog;
  }

  /** All overwrite events with survival time deltas. */
  getHalfLifeLog(): readonly HalfLifeEvent[] {
    return this.halfLifeLog;
  }

  /** All successful writes in this cycle. */
  getSuccessLog(): readonly WriteSuccessEvent[] {
    return this.successLog;
  }

  /** Unix ms when this pipeline cycle started. */
  getCycleStartMs(): number {
    return this.cycleStartMs;
  }

  // ── Reactive pub/sub ─────────────────────────

  /**
   * Subscribe to board changes. Returns an unsubscribe function.
   *
   * IMPORTANT: callers MUST invoke the returned function when done
   * (e.g., in a React useEffect cleanup or component unmount handler).
   * Failing to do so causes listeners to accumulate for the lifetime
   * of the Blackboard instance (memory leak).
   *
   * @example
   *   useEffect(() => {
   *     const unsub = board.onUpdate((section) => { ... });
   *     return unsub; // React calls this on unmount
   *   }, [board]);
   */
  onUpdate(listener: Listener): () => void {
    if (this.listeners.length >= MAX_LISTENERS) {
      console.warn(
        `[Blackboard] onUpdate: listener count (${this.listeners.length}) reached ` +
        `MAX_LISTENERS (${MAX_LISTENERS}). A subscriber is likely missing its cleanup ` +
        `call. Ensure the unsubscribe function returned by onUpdate() is called on unmount.`,
      );
    }
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Reset the board to empty state. Clears telemetry logs AND listeners.
   *
   * Clears listeners so that stale subscriptions from a previous run
   * don't receive notifications for the new cycle.
   */
  reset(): void {
    this.state = createEmptyBoard();
    this.rejectionLog = [];
    this.halfLifeLog = [];
    this.successLog = [];
    this.lastWrittenAt = {};
    this.listeners = []; // prevent cross-cycle listener accumulation
  }

  private notify(section: BoardSection): void {
    for (const listener of this.listeners) {
      listener(section, this.state);
    }
  }
}

function createEmptyBoard(): BlackboardState {
  return {
    formData: null,
    knowledgeGraph: null,
    funnelResult: null,
    discProfile: null,
    closingStrategy: null,
    hormoziValue: null,
    costOfInaction: null,
    churnRisk: null,
    healthScore: null,
    retentionFlywheel: null,
    copyQA: null,
    qaStaticResult: null,
    qaContentResult: null,
    qaSecurityResult: null,
    qaOverallScore: null,
    researchSession: null,
    metaMetrics: null,
    completedAgents: [],
    errors: [],
  };
}
