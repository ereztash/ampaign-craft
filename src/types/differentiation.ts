// ═══════════════════════════════════════════════
// B2B Differentiation Agent — Type Definitions
// ═══════════════════════════════════════════════

// === FORM DATA ===

export interface DifferentiationFormData {
  // Phase 1: Surface Layer
  businessName: string;
  industry: string;
  targetMarket: "b2b" | "b2b_enterprise" | "b2b_smb" | "b2b_gov";
  companySize: "solo" | "2-10" | "11-50" | "51-200" | "200+";
  currentPositioning: string;
  topCompetitors: string[];
  priceRange: "budget" | "mid" | "premium" | "enterprise";

  // Phase 2: Contradiction-Loss
  claimExamples: ClaimExample[];
  customerQuote: string;
  lostDealReason: string;
  competitorOverlap: string;

  // Phase 3: Hidden Layer
  ashamedPains: string[];
  hiddenValues: HiddenValueScore[];
  internalFriction: string;

  // Phase 4: Market Mapping
  competitorArchetypes: CompetitorArchetype[];
  buyingCommitteeMap: BuyingCommitteeRole[];
  decisionLatency: "days" | "weeks" | "months" | "quarters";

  // Phase 5: Synthesis (AI generates, user confirms)
  confirmedTradeoffs: TradeoffDeclaration[];
  selectedHybridCategory: string;
}

export const initialDifferentiationFormData: DifferentiationFormData = {
  businessName: "",
  industry: "",
  targetMarket: "b2b",
  companySize: "2-10",
  currentPositioning: "",
  topCompetitors: [],
  priceRange: "mid",
  claimExamples: [],
  customerQuote: "",
  lostDealReason: "",
  competitorOverlap: "",
  ashamedPains: [],
  hiddenValues: [],
  internalFriction: "",
  competitorArchetypes: [],
  buyingCommitteeMap: [],
  decisionLatency: "weeks",
  confirmedTradeoffs: [],
  selectedHybridCategory: "",
};

// === CLAIM VERIFICATION ===

export interface ClaimExample {
  claim: string;
  evidence: string;
  verified: boolean;
  gap: string;
}

// === HIDDEN VALUES ===

export type HiddenValueType =
  | "legitimacy"
  | "risk"
  | "identity"
  | "cognitive_ease"
  | "autonomy"
  | "status"
  | "empathy"
  | "narrative";

export interface HiddenValueScore {
  valueId: HiddenValueType;
  score: number; // 1-5
  signal: string;
}

// === COMPETITOR ARCHETYPES ===

export type CompetitorArchetypeId =
  | "laser_focused"
  | "quiet_vendor"
  | "hidden_cost_engineer"
  | "political_disruptor"
  | "unexpected_joiner";

export interface CompetitorArchetype {
  name: string;
  archetype: CompetitorArchetypeId;
  threat_level: "low" | "medium" | "high";
  counter_strategy: string;
}

// === BUYING COMMITTEE ===

export type BuyingCommitteeRoleId =
  | "champion"
  | "technical_evaluator"
  | "economic_buyer"
  | "end_user"
  | "legal_gatekeeper"
  | "executive_sponsor"
  | "saboteur";

export interface BuyingCommitteeRole {
  role: BuyingCommitteeRoleId;
  name?: string;
  primaryConcern: string;
  narrative: string;
}

// === TRADEOFFS ===

export interface TradeoffDeclaration {
  weakness: string;
  reframe: string;
  beneficiary: string;
}

// === RESULTS ===

export interface DifferentiationResult {
  id: string;
  createdAt: string;
  formData: DifferentiationFormData;

  // Scores
  claimVerificationScore: number; // 0-100
  differentiationStrength: number; // 0-100

  // Phase 2 output
  verifiedClaims: ClaimExample[];
  gapAnalysis: GapItem[];

  // Phase 3 output
  hiddenValueProfile: HiddenValueScore[];
  ashamedPainInsights: AshamedPainInsight[];

  // Phase 4 output
  competitorMap: CompetitorArchetype[];
  committeeNarratives: BuyingCommitteeRole[];

  // Phase 5 output (synthesis)
  mechanismStatement: MechanismStatement;
  tradeoffDeclarations: TradeoffDeclaration[];
  hybridCategory: HybridCategory;
  contraryMetrics: ContraryMetric[];

  // Overall
  executiveSummary: { he: string; en: string };
  nextSteps: NextStep[];
}

export interface MechanismStatement {
  oneLiner: { he: string; en: string };
  mechanism: string;
  proof: string;
  antiStatement: string;
  perRole: Partial<Record<BuyingCommitteeRoleId, { he: string; en: string }>>;
}

export interface GapItem {
  claim: string;
  status: "verified" | "weak" | "empty";
  recommendation: { he: string; en: string };
}

export interface AshamedPainInsight {
  pain: string;
  normalizedFrame: string;
  differentiationOpportunity: string;
}

export interface HybridCategory {
  name: { he: string; en: string };
  description: { he: string; en: string };
  existingCategories: string[];
  whitespace: string;
}

export interface ContraryMetric {
  name: { he: string; en: string };
  description: { he: string; en: string };
  target: string;
  whyContrary: string;
}

export interface NextStep {
  priority: "high" | "medium";
  action: { he: string; en: string };
  timeframe: string;
}

// === PHASE CONFIG ===

export type PhaseId = "surface" | "contradiction" | "hidden" | "mapping" | "synthesis";

export interface PhaseConfig {
  id: PhaseId;
  number: 1 | 2 | 3 | 4 | 5;
  title: { he: string; en: string };
  description: { he: string; en: string };
  icon: string;
  color: string;
  questions: PhaseQuestion[];
  aiEnrichment: boolean;
}

export interface PhaseQuestion {
  id: string;
  type: "text" | "textarea" | "select" | "multi-select" | "slider" | "competitor-list" | "claim-evidence-pairs";
  label: { he: string; en: string };
  placeholder?: { he: string; en: string };
  helperText?: { he: string; en: string };
  normalizingFrame?: { he: string; en: string };
  options?: { value: string; label: { he: string; en: string } }[];
  required: boolean;
  maxItems?: number;
}

// === AI RESPONSE TYPES ===

export interface AiPhaseResponse {
  phase: PhaseId;
  result: AiPhase2Result | AiPhase3Result | AiPhase4Result | AiPhase5Result;
}

export interface AiPhase2Result {
  verifiedClaims: ClaimExample[];
  gapAnalysis: GapItem[];
}

export interface AiPhase3Result {
  ashamedPainInsights: AshamedPainInsight[];
}

export interface AiPhase4Result {
  competitorMap: CompetitorArchetype[];
  committeeNarratives: BuyingCommitteeRole[];
}

export interface AiPhase5Result {
  mechanismStatement: MechanismStatement;
  tradeoffDeclarations: TradeoffDeclaration[];
  hybridCategory: HybridCategory;
  contraryMetrics: ContraryMetric[];
  executiveSummary: { he: string; en: string };
  nextSteps: NextStep[];
}
