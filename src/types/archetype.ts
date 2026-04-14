// ═══════════════════════════════════════════════
// Archetype Types — UserArchetypeLayer
// Behavioral science-grounded adaptive persona system.
// Foundation: Regulatory Focus Theory (Higgins 1997) × ELM (Petty & Cacioppo 1986) × Stage.
//
// Architectural model: recursive resolution descent
//   Meta-layer [archetype classification]
//    → L1 Navigation  → L2 Layout  → L3 Component  → L4 Content  → L5 Interaction
// Each level applies the same behavioral heuristics at finer granularity.
// Full heuristic library: src/types/behavioralHeuristics.ts
// Heuristic engine:       src/engine/behavioralHeuristicEngine.ts
// ═══════════════════════════════════════════════

export type { PersonalityProfile, PipelineStep, FrictionClass } from "@/types/behavioralHeuristics";

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
  /** True once the user has accepted the reveal screen (IKEA-effect opt-in) */
  adaptationsEnabled?: boolean;
  /** True once the user has seen the ArchetypeRevealScreen at least once */
  revealSeen?: boolean;
}

// ═══════════════════════════════════════════════
// THEME PACK
// ═══════════════════════════════════════════════

export type CTAShapeVariant = "square-outlined" | "square-filled" | "pill-filled" | "pill-outlined" | "pill-gradient";
export type ElevationPreset = "flat" | "low" | "medium" | "high";
export type MotionPreset = "minimal" | "crisp" | "smooth" | "playful" | "sharp";

export interface ArchetypeThemePack {
  /** CSS font-family value for heading elements */
  headingFontFamily: string;
  /** CSS value for --cta-shape-radius */
  ctaShapeRadius: string;
  /** CSS class-level elevation preset identifier */
  elevationPreset: ElevationPreset;
  /** Motion preset identifier (consumed by ArchetypeThemeProvider) */
  motionPreset: MotionPreset;
  /** CTA shape variant */
  ctaShapeVariant: CTAShapeVariant;
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
  /**
   * Behavioral science-grounded personality profile.
   * Includes: regulatory focus, processing style, core motivation,
   * research-backed friction sources, and friction-reduction tactics.
   * Used by ArchetypePipelineGuide and AdminArchetypeDebugPanel.
   */
  personalityProfile: import("@/types/behavioralHeuristics").PersonalityProfile;
}
