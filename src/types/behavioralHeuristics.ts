// ═══════════════════════════════════════════════════════════════════
// Behavioral Heuristics — Cross-Domain Research Foundation
//
// This module defines the TYPE ARCHITECTURE for the UserArchetypeLayer's
// recursive descent from high-level persona classification down to
// bit-level CSS custom properties and micro-interactions.
//
// Theoretical foundations:
//  RFT  — Regulatory Focus Theory        (Higgins 1997)
//  ELM  — Elaboration Likelihood Model   (Petty & Cacioppo 1986)
//  CLT  — Cognitive Load Theory          (Sweller 1988)
//  DPT  — Dual-Process Theory            (Kahneman 2011)
//  PT   — Prospect Theory                (Kahneman & Tversky 1979)
//  CR   — Choice Overload Research       (Iyengar & Lepper 2000)
//  ACT  — Approach-Avoidance Conflict    (Lewin 1935; Miller 1944)
//  SST  — Scaffolded Self-efficacy       (Bandura 1977)
//  FIT  — Regulatory Fit Theory          (Higgins 2000)
//  NRT  — Narrative Resonance Theory     (Escalas 2004)
//  MFT  — Moral Foundations Theory       (Haidt 2012) — connector axis
//  URG  — Urgency-Proximity Heuristic    (Cialdini 1984)
//
// RECURSIVE ARCHITECTURE:
//   ArchetypeLayer [meta]
//     L1  — Navigation    (route priority, default pages)
//     L2  — Layout        (section order, density, visibility gates)
//     L3  — Component     (which components, prominence, variant)
//     L4  — Content       (copy tone, vocabulary, framing)
//     L5  — Interaction   (animation speed, easing, feedback timing)
//
// Each level applies the SAME behavioral heuristics at finer granularity.
// ═══════════════════════════════════════════════════════════════════

// ── Axes ──────────────────────────────────────────────────────────────

/**
 * Regulatory Focus (Higgins 1997 RFT):
 * - promotion: approach gains, eager, aspirational, loss of non-gain = absence
 * - prevention: avoid losses, vigilant, protective, presence of loss = threat
 */
export type RegulatoryFocus = "promotion" | "prevention";

/**
 * Processing Style (Petty & Cacioppo 1986 ELM + Kahneman 2011 DPT):
 * - systematic: deep deliberate processing, data-hungry, considers alternatives
 * - heuristic:  fast peripheral processing, pattern-matching, trusts intuition
 */
export type ProcessingStyle = "systematic" | "heuristic";

/**
 * Friction Class — the cognitive/motivational mechanism behind the friction.
 * Each class maps to a specific body of research.
 */
export type FrictionClass =
  | "cognitive_overload"   // CLT: too many elements compete for working memory
  | "choice_overload"      // CR: too many options paralyze decision-making
  | "uncertainty_aversion" // PT+RFT: prevention-focused dislike ambiguity
  | "momentum_loss"        // SST: losing progress signals kills self-efficacy
  | "regulatory_mismatch"  // FIT: tool framing contradicts user's regulatory mode
  | "narrative_dissonance" // NRT: story/copy does not resonate with identity
  | "temporal_friction"    // URG: time between intent and execution bleeds urgency
  | "relational_distance"; // MFT: impersonal framing violates care/loyalty foundations

// ── Resolution Levels ─────────────────────────────────────────────────

export type ResolutionLevel =
  | "L1_navigation"    // route priorities, sidebar order, default landing
  | "L2_layout"        // section order, visibility, column count
  | "L3_component"     // which components render, prominence, variant
  | "L4_content"       // copy tone, vocabulary, framing (gain vs loss)
  | "L5_interaction";  // animation speed, easing curve, feedback timing

// ── Heuristic Definition ──────────────────────────────────────────────

export interface ResolutionManifest {
  /** What changes at L1 navigation due to this heuristic */
  L1_navigation: string;
  /** What changes at L2 layout */
  L2_layout: string;
  /** What changes at L3 component */
  L3_component: string;
  /** What changes at L4 content */
  L4_content: string;
  /** What changes at L5 interaction */
  L5_interaction: string;
}

export interface BehavioralHeuristic {
  id: string;
  /** Human-readable principle name */
  principle: string;
  /** Primary research source */
  source: string;
  /** Additional cross-domain evidence (other fields or theories) */
  crossDomainEvidence: string[];
  /** The friction class this heuristic addresses */
  frictionClass: FrictionClass;
  /** Which regulatory focus axis this applies to (null = both) */
  regulatoryFocus: RegulatoryFocus | null;
  /** Which processing style axis this applies to (null = both) */
  processingStyle: ProcessingStyle | null;
  /**
   * How this heuristic manifests at each resolution level.
   * This is the recursive descent — the same principle applied from
   * macro (navigation) down to micro (CSS animation easing).
   */
  manifestations: ResolutionManifest;
}

// ── Derived Configuration per Resolution ─────────────────────────────

/** L1: Navigation configuration derived from active heuristics */
export interface L1NavigationConfig {
  /** Route priorities — lower number = higher in sidebar / shown first */
  routePriorities: Record<string, number>;
  /** Default landing route after login */
  defaultLandingRoute: string;
  /** Top 3 "recommended actions" to surface in CommandCenter quick actions */
  quickActionPriorities: string[];
}

/** L2: Layout configuration */
export interface L2LayoutConfig {
  /** Primary column layout for main content areas */
  primaryLayout: "single-column" | "two-column" | "dense-grid";
  /** Whether to use progressive disclosure (hide details until needed) */
  progressiveDisclosure: boolean;
  /** Whether safety/status signals appear at top of every page */
  safetySignalsProminent: boolean;
  /** Whether achievement/progress indicators appear at top */
  momentumSignalsProminent: boolean;
}

/** L3: Component configuration */
export interface L3ComponentConfig {
  /** Primary CTA prominence: "solo" = only one visible, "paired" = two, "grid" = multiple */
  ctaMode: "solo" | "paired" | "grid";
  /** Whether detailed analytical charts are shown by default or behind a toggle */
  analyticsExpanded: boolean;
  /** Whether summaries precede details (heuristic) or details precede summary (systematic) */
  summaryFirst: boolean;
  /** Information density variant */
  density: "compact" | "standard" | "rich";
}

/** L4: Content configuration */
export interface L4ContentConfig {
  /** Whether copy uses gain-framing (promotion) or loss-framing (prevention) */
  copyFraming: "gain" | "loss";
  /** Vocabulary register */
  vocabulary: "technical" | "narrative" | "hybrid";
  /** Whether numbers/metrics are emphasized or story/outcome is emphasized */
  emphasisMode: "metrics" | "story" | "balanced";
  /** CTA verb style */
  ctaVerbs: {
    primary: { he: string; en: string };
    action: { he: string; en: string };
  };
}

/** L5: Micro-interaction configuration */
export interface L5InteractionConfig {
  /**
   * Motion duration multiplier relative to Framer Motion defaults.
   * Prevention-focused: 1.3× (slower = deliberate = trustworthy) — RFT
   * Promotion-focused: 0.65× (faster = momentum = energy)        — RFT
   * Source: Kolber 2001 — motion speed perception and trust formation
   */
  motionDurationMultiplier: number;
  /**
   * CSS cubic-bezier easing curve.
   * Systematic: ease-in-out (smooth, predictable)
   * Heuristic:  ease-out (snappy deceleration, immediate response)
   */
  motionEasing: string;
  /**
   * Feedback timing: how quickly to show confirmation/response
   * Urgency archetypes: immediate (<100ms perceived) — URG heuristic
   * Prevention archetypes: slight delay (150-200ms, feels "considered")
   */
  feedbackTiming: "immediate" | "considered";
  /**
   * Visual weight of primary CTAs (Tailwind font-weight equivalent)
   * Promotion+Heuristic (Closer): 800 — bold = action
   * Prevention+Systematic (Strategist): 600 — medium = analytical precision
   */
  ctaFontWeight: 600 | 700 | 800;
  /**
   * Whether hover states use strong elevation (promotion) or subtle highlight (prevention)
   * Source: Approach-Avoidance Conflict theory (Lewin 1935)
   */
  hoverElevation: "subtle" | "strong";
}

// ── Full Heuristic Set per Archetype ─────────────────────────────────

export interface BehavioralHeuristicSet {
  archetypeId: string;
  regulatoryFocus: RegulatoryFocus;
  processingStyle: ProcessingStyle;
  /** Active heuristics that apply to this archetype */
  activeHeuristics: BehavioralHeuristic[];
  /** Resolved configuration at each resolution level */
  L1: L1NavigationConfig;
  L2: L2LayoutConfig;
  L3: L3ComponentConfig;
  L4: L4ContentConfig;
  L5: L5InteractionConfig;
}

// ── Friction Source Definition ────────────────────────────────────────

export interface FrictionSource {
  /** Short identifier */
  id: string;
  /** The friction class from research */
  frictionClass: FrictionClass;
  /** Research backing */
  source: string;
  /** What triggers this friction for this archetype */
  trigger: { he: string; en: string };
  /** What the system does to eliminate this friction */
  reduction: { he: string; en: string };
  /** At which resolution levels this friction is addressed */
  addressedAt: ResolutionLevel[];
}

// ── Pipeline Step ─────────────────────────────────────────────────────

export interface PipelineStep {
  /** Navigation item ID (maps to AppSidebar items + NavItemId type) */
  id: string;
  /** Route path */
  routePath: string;
  /** Display label */
  label: { he: string; en: string };
  /**
   * The specific friction this step placement reduces for this archetype.
   * This is the behavioral science reasoning — NOT arbitrary ordering.
   */
  frictionReason: { he: string; en: string };
  /**
   * The friction class addressed by placing this step here.
   * Allows the engine to validate that every placement is research-backed.
   */
  frictionClass: FrictionClass;
  /** localStorage key whose non-empty presence marks this step done */
  completionKey?: string;
}

// ── Personality Profile ───────────────────────────────────────────────

export interface PersonalityProfile {
  regulatoryFocus: RegulatoryFocus;
  processingStyle: ProcessingStyle;
  /** What fundamentally motivates this archetype */
  coreMotivation: { he: string; en: string };
  /** The 3-4 primary friction sources, each research-backed */
  primaryFrictions: FrictionSource[];
  /** The ordered work pipeline tailored to reduce those frictions */
  pipeline: PipelineStep[];
}
