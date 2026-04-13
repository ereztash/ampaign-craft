// ═══════════════════════════════════════════════
// Behavioral Heuristic Engine
// 8 research-backed heuristics with L1–L5 resolution configs.
//
// Drives:
//   • L5 CSS vars — micro-interaction tuning per archetype
//   • CTA verb framing — primary action verb for each persona
//   • Glass-Box transparency — traceable heuristic display
//
// Heuristics map directly to the friction sources in each
// archetype's personalityProfile (defined in archetypeUIConfig).
// ═══════════════════════════════════════════════

import type { ArchetypeId } from "@/types/archetype";
import type { BehavioralHeuristic, L5CSSVars, PrimaryCtaVerbs } from "@/types/behavioralHeuristics";

// ═══════════════════════════════════════════════
// HEURISTICS REGISTRY — 8 research-backed principles
// Each maps to one or more friction classes in personalityProfile.
// ═══════════════════════════════════════════════

const HEURISTICS: BehavioralHeuristic[] = [
  {
    id: "H1",
    principle: "Certainty Provision",
    source: "Pavlou & Fygenson 2006; Prospect Theory (Kahneman & Tversky 1979)",
    manifestations: {
      L1: "Data-first navigation order — evidence before action satisfies uncertainty aversion",
      L2: "Analytics tab shown first; strategy and content tabs deprioritized",
      L3: "Proof-heavy card layouts with metrics leading recommendations",
      L4: "Confirmation dialogs + data previews before irreversible actions",
      L5: "Slower motion multiplier (1.2×) signals deliberate, trustworthy pace",
    },
    primaryArchetypes: ["strategist", "connector"],
  },
  {
    id: "H2",
    principle: "Cognitive Load Minimization",
    source: "Sweller 1988 CLT; Miller 1956 7±2 Working Memory",
    manifestations: {
      L1: "Modules reordered to surface highest-ROI action first, eliminating search cost",
      L2: "Low-priority tabs hidden or deprioritized (priority ≥ 30)",
      L3: "Progressive disclosure — only contextually relevant data shown by default",
      L4: "Single-focus forms; no multi-column option paralysis",
      L5: "Compact density (--spacing-unit: 0.875) removes extraneous visual noise",
    },
    primaryArchetypes: ["optimizer", "closer"],
  },
  {
    id: "H3",
    principle: "Regulatory Fit",
    source: "Higgins 2000 FIT; Avnet & Higgins 2006 Journal of Personality",
    manifestations: {
      L1: "Prevention-focused users see safety/validation routes before growth routes",
      L2: "Loss-frame tabs (retention, analytics) surface for prevention-focused types",
      L3: "CTA copy frames around loss prevention vs. gain opportunity per focus type",
      L4: "Modal language: 'protect your work' (prevention) vs. 'level up' (promotion)",
      L5: "Analytical color palette (navy/teal) signals careful deliberation",
    },
    primaryArchetypes: ["strategist", "connector"],
  },
  {
    id: "H4",
    principle: "Momentum Maintenance",
    source: "Bandura 1977 Self-Efficacy Theory; Thaler 1981 Hyperbolic Discounting",
    manifestations: {
      L1: "Creation tools (wizard, ai) surfaced before analytical tools",
      L2: "Progress indicators and streak counts shown prominently in nav",
      L3: "Goal gradient cards: 'X steps to completion' framing",
      L4: "Autosave + draft recovery to eliminate momentum-killing loss",
      L5: "Fast motion (0.8×) and spring easing signal energetic momentum",
    },
    primaryArchetypes: ["pioneer", "closer", "optimizer"],
  },
  {
    id: "H5",
    principle: "Choice Architecture",
    source: "Iyengar & Lepper 2000; Schwartz 2004 Paradox of Choice",
    manifestations: {
      L1: "Primary CTA is singular; secondary options visually subordinated",
      L2: "Default tab pre-selected — user does not face blank-slate choice",
      L3: "Archetype pipeline shows ONE next step, not the full menu",
      L4: "Wizard uses single-question progressive flow, not multi-field forms",
      L5: "Compact density reduces visual competition between UI elements",
    },
    primaryArchetypes: ["pioneer", "connector", "closer"],
  },
  {
    id: "H6",
    principle: "Narrative Resonance",
    source: "Escalas 2004 Narrative Transportation Theory; Bruner 1990",
    manifestations: {
      L1: "AI coach surfaced early — conversational interface before dashboards",
      L2: "Content/brand tabs prioritized over analytics tabs",
      L3: "Identity statement (knowledge graph) leads each page header",
      L4: "Onboarding uses story format: 'What are you building?'",
      L5: "Inspirational color palette (purple/orange) signals creative energy",
    },
    primaryArchetypes: ["pioneer"],
  },
  {
    id: "H7",
    principle: "Relational Signaling",
    source: "Haidt 2012 Moral Foundations Theory; Buttle 2004 CRM Research",
    manifestations: {
      L1: "Retention first — validates customer-care worldview on entry",
      L2: "Retention and content tabs prioritized over transactional tabs",
      L3: "Warm, conversational copy tone — never transactional language",
      L4: "AI coach framed as 'your advisor', not 'your tool'",
      L5: "Warm green palette (connector) signals trust and belonging",
    },
    primaryArchetypes: ["connector"],
  },
  {
    id: "H8",
    principle: "Temporal Urgency",
    source: "Cialdini 1984 Influence; Gong.io 2019 Deal Velocity Research",
    manifestations: {
      L1: "Zero-depth access to sales/closing tools — command → sales direct",
      L2: "Sales + pricing tabs first — deal blockers removed immediately",
      L3: "Urgency-framed CTAs: 'Close now', 'Lock price', 'Act today'",
      L4: "Minimal confirmation dialogs — every click saved is a preserved deal",
      L5: "Fastest motion (0.7×) + sharp easing signal deal velocity",
    },
    primaryArchetypes: ["closer"],
  },
];

// ═══════════════════════════════════════════════
// ARCHETYPE → ACTIVE HEURISTIC IDS MAP
// ═══════════════════════════════════════════════

const ARCHETYPE_HEURISTIC_MAP: Record<ArchetypeId, string[]> = {
  strategist: ["H1", "H2", "H3"],
  optimizer:  ["H2", "H4"],
  pioneer:    ["H4", "H5", "H6"],
  connector:  ["H1", "H3", "H5", "H7"],
  closer:     ["H2", "H4", "H5", "H8"],
};

// ═══════════════════════════════════════════════
// L5 CSS VARS — Micro-interaction tuning per archetype
// Applied to :root when confidenceTier >= "confident"
// ═══════════════════════════════════════════════

const L5_CSS_VARS: Record<ArchetypeId, L5CSSVars> = {
  // Strategist: Slower, deliberate pace signals trustworthiness (H1 + H3)
  strategist: {
    "--motion-duration-multiplier": "1.2",
    "--motion-easing": "cubic-bezier(0.4, 0, 0.2, 1)",
    "--cta-font-weight": "600",
  },
  // Optimizer: Neutral pace, maximum efficiency (H2 + H4)
  optimizer: {
    "--motion-duration-multiplier": "1.0",
    "--motion-easing": "cubic-bezier(0.4, 0, 0.2, 1)",
    "--cta-font-weight": "700",
  },
  // Pioneer: Fast, spring-forward energy (H4 + H6)
  pioneer: {
    "--motion-duration-multiplier": "0.8",
    "--motion-easing": "cubic-bezier(0.34, 1.56, 0.64, 1)",
    "--cta-font-weight": "700",
  },
  // Connector: Gentle, relational pace (H1 + H7)
  connector: {
    "--motion-duration-multiplier": "1.1",
    "--motion-easing": "cubic-bezier(0.4, 0, 0.2, 1)",
    "--cta-font-weight": "600",
  },
  // Closer: Maximum velocity — every ms saved is a deal (H8)
  closer: {
    "--motion-duration-multiplier": "0.7",
    "--motion-easing": "cubic-bezier(0.25, 0, 0, 1)",
    "--cta-font-weight": "800",
  },
};

// ═══════════════════════════════════════════════
// PRIMARY CTA VERBS — Archetype action framing
// Used to adapt button/heading copy per persona
// ═══════════════════════════════════════════════

const PRIMARY_CTA_VERBS: Record<ArchetypeId, PrimaryCtaVerbs> = {
  strategist: { he: "נתח",  en: "Analyze" },
  optimizer:  { he: "שפר",  en: "Improve" },
  pioneer:    { he: "בנה",  en: "Build" },
  connector:  { he: "חזק",  en: "Strengthen" },
  closer:     { he: "סגור", en: "Close" },
};

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/**
 * Returns the L5 CSS custom property values for a given archetype.
 * Apply to document.documentElement when confidenceTier >= "confident".
 * Traceable to H1–H8 heuristic set.
 */
export function getL5CSSVars(archetypeId: ArchetypeId): L5CSSVars {
  return L5_CSS_VARS[archetypeId] ?? L5_CSS_VARS.optimizer;
}

/**
 * Returns the primary CTA verb pair (he/en) for a given archetype.
 * Used to adapt button labels and page headings in CommandCenter + Dashboard.
 * Framing grounded in Higgins 2000 FIT — verbs match regulatory focus.
 */
export function getPrimaryCtaVerbs(archetypeId: ArchetypeId): PrimaryCtaVerbs {
  return PRIMARY_CTA_VERBS[archetypeId] ?? PRIMARY_CTA_VERBS.optimizer;
}

/**
 * Returns the active behavioral heuristics for a given archetype.
 * Used in Glass-Box transparency displays (AdminArchetypeDebugPanel, ArchetypeProfileCard).
 * Each heuristic includes principle, research source, and L1–L5 manifestations.
 */
export function deriveHeuristicSet(archetypeId: ArchetypeId): BehavioralHeuristic[] {
  const ids = ARCHETYPE_HEURISTIC_MAP[archetypeId] ?? [];
  return HEURISTICS.filter((h) => ids.includes(h.id));
}

/** Returns all 8 heuristics — for full registry display in the debug panel */
export function getAllHeuristics(): BehavioralHeuristic[] {
  return HEURISTICS;
}
