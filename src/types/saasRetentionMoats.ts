// ═══════════════════════════════════════════════
// SaaS Retention Moats — COR-SYS Framework Types
// Cross-domain: Voss × Lieberman × Cagan × WSJF
// FunnelForge eating its own dog food
// ═══════════════════════════════════════════════

import { BilingualText } from "./retention";

// ═══ MECHANISM LAYER ═══

export type MoatLayer = "cor" | "sys" | "intersection";

export interface MoatMechanism {
  id: string;
  index: number; // 1-14
  name: BilingualText;
  layer: MoatLayer;
  source: string; // researcher/book
  neuroBasis: BilingualText;
  productIntervention: BilingualText;
  activationConditions: string[];
  impactMetric: string;
}

export interface InterventionTemplate {
  mechanismId: string;
  context: string; // e.g. "low_health_score", "paywall", "churn_risk"
  template: BilingualText;
  emoji: string;
}

// ═══ COR LAYER — Conservation of Resources ═══

export type ThreatPerception = "low" | "medium" | "high";
export type EngagementDepth = "surface" | "moderate" | "deep";

export interface CORResourceState {
  cognitiveLoad: number; // 0-100
  threatPerception: ThreatPerception;
  engagementDepth: EngagementDepth;
  resourceDepletion: boolean;
}

// ═══ SYS LAYER — Structural Intervention ═══

export type CommunicationMode = "instructional" | "identity";

export interface SYSStructuralState {
  neuralGrooveCount: number; // toward 63-64 threshold
  neuralGroovePercentage: number; // 0-100
  communicationMode: CommunicationMode;
  tedQuestionRatio: number; // 0-1
  wsjfEnabled: boolean;
}

export interface NeuralGrooveProgress {
  current: number;
  threshold: number; // 64
  percentage: number;
  isGrooved: boolean;
}

export interface WSJFItem {
  feature: string;
  label: BilingualText;
  userValue: number; // 1-10
  timeCriticality: number; // 1-10
  riskReduction: number; // 1-10
  effort: number; // 1-10
  wsjfScore: number;
}

// ═══ ACTIVATIONS ═══

export interface MoatActivation {
  mechanismId: string;
  mechanismName: BilingualText;
  layer: MoatLayer;
  isActive: boolean;
  strength: number; // 0-100
  evidence: BilingualText;
  emoji: string;
}

// ═══ BLACK SWAN (Intersection) ═══

export interface BlackSwanSignal {
  signal: BilingualText;
  confidence: number; // 0-100
  suggestedAction: BilingualText;
  emoji: string;
}

// ═══ BEHAVIORAL BASELINE ═══

export interface BehavioralBaseline {
  avgSessionLength: number; // minutes
  avgActionsPerSession: number;
  featureUsagePattern: string[];
  saveFrequency: number; // saves per session
  loginGapDays: number; // avg days between logins
}

export interface BaselineDeviation {
  metric: string;
  metricLabel: BilingualText;
  baseline: number;
  current: number;
  deviationPercent: number;
  isAnomaly: boolean;
  risk: "low" | "medium" | "high";
}

// ═══ DASHBOARD ═══

export interface MoatDashboard {
  overallMoatScore: number; // 0-100
  corState: CORResourceState;
  sysState: SYSStructuralState;
  corActivations: MoatActivation[];
  sysActivations: MoatActivation[];
  intersectionActivations: MoatActivation[];
  neuralGroove: NeuralGrooveProgress;
  baselineDeviations: BaselineDeviation[];
  blackSwans: BlackSwanSignal[];
  wsjfPriorities: WSJFItem[];
  recommendations: BilingualText[];
}

// ═══ USER MOAT PROFILE EXTENSIONS ═══

export interface UserMoatBehavior {
  corResourceState: CORResourceState;
  neuralGrooveCount: number;
  lastBaselineBehavior: BehavioralBaseline;
  engagementSignals: {
    saves: number;
    copies: number;
    shares: number;
    coachMessages: number;
    templateUses: number;
    pulseViews: number;
  };
}
