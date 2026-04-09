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

  // Meta
  completedAgents: string[];
  errors: { agent: string; error: string }[];
}

export type BoardSection = keyof BlackboardState;

type Listener = (section: BoardSection, state: BlackboardState) => void;

// ═══════════════════════════════════════════════
// BLACKBOARD CLASS
// ═══════════════════════════════════════════════

export class Blackboard {
  private state: BlackboardState;
  private listeners: Listener[] = [];

  constructor() {
    this.state = createEmptyBoard();
  }

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
   */
  set<K extends BoardSection>(section: K, value: BlackboardState[K]): void {
    this.state = { ...this.state, [section]: value };
    this.notify(section);
  }

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

  /**
   * Subscribe to board changes.
   */
  onUpdate(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Reset the board to empty state.
   */
  reset(): void {
    this.state = createEmptyBoard();
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
    completedAgents: [],
    errors: [],
  };
}
