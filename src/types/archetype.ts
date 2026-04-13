// ═══════════════════════════════════════════════
// Archetype Types — UserArchetypeLayer
// Behavioral science-grounded adaptive persona system.
// Foundation: Regulatory Focus Theory (Higgins 1997) × ELM (Petty & Cacioppo 1986) × Stage.
// ═══════════════════════════════════════════════

export type ArchetypeId =
  | "strategist"  // Prevention + Systematic + Established
  | "optimizer"   // Promotion + Systematic + Scale  (cold-start default)
  | "pioneer"     // Promotion + Heuristic/Systematic + Early
  | "connector"   // Prevention + Heuristic + Relationship
  | "closer";     // Promotion + Heuristic + Sales velocity

export type ConfidenceTier =
  | "none"        // < 0.5  — no personalization, generic experience
  | "tentative"   // 0.5–0.649 — copy tone adapts only
  | "confident"   // 0.65–0.799 — tab order + default tab + CSS colors
  | "strong";     // >= 0.8  — full UI morphing (sidebar, density, modules)

export interface ArchetypeSignal {
  source:
    | "formData"
    | "discProfile"
    | "hormoziValue"
    | "retentionFlywheel"
    | "churnRisk"
    | "healthScore"
    | "costOfInaction"
    | "knowledgeGraph";
  field: string;                                 // e.g. "audienceType"
  value: string | number;                        // the value that triggered it
  deltas: Partial<Record<ArchetypeId, number>>;  // score impact per archetype
  capturedAt: string;                            // ISO timestamp
}

export interface UserArchetypeProfile {
  archetypeId: ArchetypeId;
  confidence: number;                           // 0–1
  confidenceTier: ConfidenceTier;
  scores: Record<ArchetypeId, number>;          // raw accumulated scores
  signalHistory: ArchetypeSignal[];             // capped at last 50
  lastComputedAt: string;                       // ISO timestamp
  sessionCount: number;
  overrideByUser?: ArchetypeId;                // manual override (admin / user)
  version: number;                              // schema version
}

export interface ClassificationResult {
  archetypeId: ArchetypeId;
  confidence: number;
  confidenceTier: ConfidenceTier;
  scores: Record<ArchetypeId, number>;
  signals: ArchetypeSignal[];
}

// ═══════════════════════════════════════════════
// UI CONFIG
// ═══════════════════════════════════════════════

// NavItemId maps to AppSidebar routes / item IDs
export type NavItemId =
  | "command"       // /
  | "data"          // /data
  | "strategy"      // /strategy
  | "ai"            // /ai
  | "dashboard"     // /dashboard
  | "plans"         // /plans
  | "crm"           // /crm
  | "differentiate" // /differentiate
  | "wizard"        // /wizard
  | "sales"         // /sales
  | "pricing"       // /pricing
  | "retention";    // /retention

// TabId maps to getTabConfig() tab.id values
export type TabId =
  | "strategy"
  | "planning"
  | "content"
  | "analytics"
  | "branddna"
  | "sales"
  | "pricing"
  | "retention"
  | "stylome"
  | "brief";

export type InformationDensity = "compact" | "standard" | "rich";

export type CTATone =
  | "direct"        // Optimizer / Closer
  | "inspirational" // Pioneer
  | "analytical"    // Strategist
  | "relational"    // Connector
  | "urgency";      // Closer (high-confidence)

// ═══════════════════════════════════════════════
// PERSONALITY PROFILE — Pipeline + Friction Layer
// Each archetype has a friction map and a recommended pipeline.
// Every pipeline step is traceable to a behavioral friction source.
// ═══════════════════════════════════════════════

/** Friction classes — psychological sources of user resistance */
export type FrictionClass =
  | "uncertainty_aversion"  // Acting before data feels reckless (Pavlou & Fygenson 2006)
  | "cognitive_overload"    // Oversimplification hides important nuance (Sweller 1988)
  | "regulatory_mismatch"   // Gain-framed CTAs feel wrong for prevention types (Higgins 2000)
  | "momentum_loss"         // Delay between intent and action kills drive (Bandura 1977)
  | "choice_overload"       // Too many options paralyze vision (Iyengar & Lepper 2000)
  | "narrative_dissonance"  // Data-heavy interfaces feel cold (Escalas 2004)
  | "relational_distance"   // Transactional language betrays relationships (Haidt 2012)
  | "temporal_friction";    // Every click between intent and execution is a lost deal (Cialdini 1984)

/** A friction source attached to an archetype's psychology */
export interface PersonalityFriction {
  id: FrictionClass;
  label: string;              // Short human-readable label
  source: string;             // Research citation
}

/** A single step in an archetype's recommended pipeline */
export interface PipelineStep {
  routePath: string;                        // e.g. "/data", "/wizard"
  label: { he: string; en: string };        // Step title shown in guide
  frictionReason: { he: string; en: string }; // "Why here" — traceable to friction
  frictionClass: FrictionClass;             // Primary friction this step addresses
  completionKey?: string;                   // localStorage key to check completion
}

/** Psychological profile + friction-mapped pipeline for an archetype */
export interface PersonalityProfile {
  regulatoryFocus: "prevention" | "promotion";
  processingStyle: "systematic" | "heuristic";
  coreMotivation: string;                   // One-sentence core motivation
  primaryFrictions: PersonalityFriction[];  // Top 3 friction sources
  pipeline: PipelineStep[];                 // Recommended 7-step sequence
}

export interface ArchetypeUIConfig {
  archetypeId: ArchetypeId;
  /** Ordered list of workspace nav items (first = top of sidebar group) */
  workspaceOrder: NavItemId[];
  /** Ordered list of module nav items */
  modulesOrder: NavItemId[];
  /** Default tab in ResultsDashboard */
  defaultTab: TabId;
  /** Override priorities for getTabConfig() — lower = shown first */
  tabPriorityOverrides: Partial<Record<TabId, number>>;
  /** Value for data-archetype HTML attribute */
  dataAttribute: ArchetypeId;
  informationDensity: InformationDensity;
  ctaTone: CTATone;
  /** Module IDs to visually highlight in ModulePipeline */
  prominentModules: string[];
  /** Short descriptor labels (Hebrew + English) */
  label: { he: string; en: string };
  /** One-line user-facing explanation of what changed */
  adaptationDescription: { he: string; en: string };
  /** Behavioral psychology profile with friction map + pipeline */
  personalityProfile: PersonalityProfile;
}
