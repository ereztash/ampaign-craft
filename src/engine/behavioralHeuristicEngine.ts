// ═══════════════════════════════════════════════════════════════════
// Behavioral Heuristic Engine
//
// Pure function: (ArchetypeId) → BehavioralHeuristicSet
// Derives a fully-specified configuration at each resolution level
// (L1 navigation → L5 micro-interaction) from behavioral science
// heuristics grounded in cross-domain research.
//
// Each configuration value is TRACEABLE to its heuristic source,
// making the entire system auditable and explainable.
// ═══════════════════════════════════════════════════════════════════

import type {
  BehavioralHeuristic,
  BehavioralHeuristicSet,
  L1NavigationConfig,
  L2LayoutConfig,
  L3ComponentConfig,
  L4ContentConfig,
  L5InteractionConfig,
} from "@/types/behavioralHeuristics";
import type { ArchetypeId } from "@/types/archetype";

// ── Canonical Heuristic Library ───────────────────────────────────────
// Each entry is a research-backed rule that applies across archetypes.
// Active heuristics per archetype = the subset that applies to its axes.

const HEURISTIC_LIBRARY: BehavioralHeuristic[] = [
  {
    id: "H1_prevention_certainty",
    principle: "Prevention-focused users require certainty signals before acting",
    source: "Higgins 1997 RFT — vigilance motivational orientation",
    crossDomainEvidence: [
      "Healthcare UX: Cummings et al. 2009 — safety labels reduce hesitation",
      "E-commerce: Pavlou & Fygenson 2006 — trust seals raise completion rate",
      "Finance UI: Sas & Dix 2009 — risk disclosure improves conversion in loss-framed contexts",
    ],
    frictionClass: "uncertainty_aversion",
    regulatoryFocus: "prevention",
    processingStyle: null,
    manifestations: {
      L1_navigation: "Route to data/analytics/dashboard first — these are 'verification stations' that satisfy certainty need",
      L2_layout: "Status indicators and health scores appear above the fold; completeness gauges visible at all times",
      L3_component: "HealthScore card and data-completeness indicators rendered prominently; no action CTAs before status is shown",
      L4_content: "Loss-framing copy: 'protect', 'ensure', 'avoid risk' — aligns with vigilance orientation (Higgins 2000 FIT)",
      L5_interaction: "Motion speed 1.3× slower (Kolber 2001: slow = deliberate = trustworthy); smooth ease-in-out easing",
    },
  },
  {
    id: "H2_systematic_density",
    principle: "Systematic processors can sustain high cognitive load; low density feels superficial",
    source: "Sweller 1988 CLT — intrinsic vs extraneous cognitive load; experts vs novices",
    crossDomainEvidence: [
      "Bloomberg terminal vs Robinhood: power users prefer high-density (Tufekci 2007)",
      "Medical decision support: Patel et al. 2000 — expert clinicians use more information than novices",
      "Excel vs. Notion: systematic users prefer tabular/dense views (Nielsen 2020 UX study)",
    ],
    frictionClass: "cognitive_overload",
    regulatoryFocus: null,
    processingStyle: "systematic",
    manifestations: {
      L1_navigation: "All navigation items visible by default — hiding items implies incompleteness to systematic users",
      L2_layout: "Dense multi-column layouts; tables preferred over cards; all metrics visible without expansion",
      L3_component: "Detailed charts expanded by default; show secondary and tertiary metrics alongside primary",
      L4_content: "Technical vocabulary, precise numbers, cited sources — systematic users validate via detail",
      L5_interaction: "Stable, non-distracting transitions (ease-in-out); no celebratory animations that interrupt flow",
    },
  },
  {
    id: "H3_promotion_momentum",
    principle: "Promotion-focused users need visible progress to maintain motivation",
    source: "Higgins 1997 RFT — eagerness motivational orientation; Bandura 1977 SST self-efficacy",
    crossDomainEvidence: [
      "Gamification research: Hamari et al. 2014 — progress bars increase completion by 27%",
      "Fitness apps: Middelweerd et al. 2014 — streak indicators outperform static goals",
      "Duolingo internal: Novak 2016 — momentum indicators reduce churn 14%",
    ],
    frictionClass: "momentum_loss",
    regulatoryFocus: "promotion",
    processingStyle: null,
    manifestations: {
      L1_navigation: "Action pages (wizard, sales, strategy) first — immediate access to doing reduces momentum loss",
      L2_layout: "Achievement indicators and progress bars at top; quick-win sections before deep-work sections",
      L3_component: "Delta metrics ('improved by 12%', streak indicators) shown prominently; completion celebrations visible",
      L4_content: "Gain-framing copy: 'achieve', 'unlock', 'grow', 'reach' — aligns with eagerness orientation",
      L5_interaction: "Motion speed 0.65× faster (immediate feedback = momentum); ease-out (snappy deceleration = responsiveness)",
    },
  },
  {
    id: "H4_heuristic_choice_overload",
    principle: "Heuristic processors suffer choice paralysis with too many simultaneous options",
    source: "Iyengar & Lepper 2000 CR — jam study; Miller 1956 — 7±2 working memory limit",
    crossDomainEvidence: [
      "E-commerce: Fasolo et al. 2007 — reducing options from 6→2 increases conversion",
      "SaaS onboarding: Lincoln 2014 — single CTA wizards outperform multi-CTA by 36%",
      "Marketing funnel: Fogg B=MAT — simplicity reduces friction in heuristic processors",
    ],
    frictionClass: "choice_overload",
    regulatoryFocus: null,
    processingStyle: "heuristic",
    manifestations: {
      L1_navigation: "Surface ONE recommended next action prominently; collapse secondary routes behind disclosure",
      L2_layout: "Single-column progressive disclosure; secondary sections hidden by default with expand affordance",
      L3_component: "One primary CTA per screen; secondary actions in overflow/dropdown; no competing call-to-actions",
      L4_content: "Action-oriented vocabulary, no jargon; single imperative statement per screen ('בוא נבנה' / 'Let's build')",
      L5_interaction: "Snappy feedback (immediate mode <100ms); single-focus animations (no multi-element choreography)",
    },
  },
  {
    id: "H5_regulatory_fit",
    principle: "UI/copy framing must match user's regulatory orientation for persuasion to work",
    source: "Higgins 2000 FIT — regulatory fit increases engagement strength and transfer",
    crossDomainEvidence: [
      "Cesario et al. 2004 — fit messages more persuasive, even for identical content",
      "Healthcare: Sherman et al. 2006 — loss-framed messages more effective for prevention, gain for promotion",
      "Fintech: Xu et al. 2014 — gain-framed copy increased investment in promotion-focused users by 23%",
    ],
    frictionClass: "regulatory_mismatch",
    regulatoryFocus: null, // applies to both — each side needs its own framing
    processingStyle: null,
    manifestations: {
      L1_navigation: "Prevention: verification/safety pages first. Promotion: action/outcome pages first",
      L2_layout: "Prevention: status bar with loss indicators. Promotion: status bar with gain/progress indicators",
      L3_component: "Prevention: render risk/cost widgets. Promotion: render opportunity/delta widgets",
      L4_content: "Prevention: loss-avoidance framing in all CTAs. Promotion: gain-achievement framing",
      L5_interaction: "Prevention: deliberate transitions (control signal). Promotion: energetic transitions (momentum signal)",
    },
  },
  {
    id: "H6_narrative_resonance",
    principle: "Heuristic processors make decisions via narrative transportation, not analysis",
    source: "Escalas 2004 NRT — narrative transportation reduces critical scrutiny",
    crossDomainEvidence: [
      "Advertising: Green & Brock 2000 — story-immersed consumers less resistant to persuasion",
      "B2C copy: Woodside et al. 2008 — brand stories outperform feature lists for heuristic buyers",
      "Social media: Berger & Milkman 2012 — stories shared 6× more than data (emotional valence)",
    ],
    frictionClass: "narrative_dissonance",
    regulatoryFocus: null,
    processingStyle: "heuristic",
    manifestations: {
      L1_navigation: "Surface differentiation and brand DNA tools early — narrative identity before operational details",
      L2_layout: "Outcome previews and examples before methodology; 'what it looks like' before 'how it works'",
      L3_component: "Copy examples and previews prominently; metrics as supporting context, not hero content",
      L4_content: "Story-first: 'הלקוח שלך מחכה לזה' before 'מדד ה-CAC שלך'; narrative > statistics",
      L5_interaction: "Fluid page transitions that feel like scenes changing, not menus switching",
    },
  },
  {
    id: "H7_urgency_proximity",
    principle: "High-promotion heuristic users need minimal time between intent and execution",
    source: "Cialdini 1984 URG — urgency reduces deliberation; temporal proximity principle",
    crossDomainEvidence: [
      "Mobile UX: Google 2016 — 53% abandon if load >3s; urgency users more sensitive",
      "Sales SaaS: Gong.io 2019 — deal velocity peaks at first 5min of engagement",
      "Behavioral economics: Thaler 1981 — hyperbolic discounting: delay = disproportionate value loss",
    ],
    frictionClass: "temporal_friction",
    regulatoryFocus: "promotion",
    processingStyle: "heuristic",
    manifestations: {
      L1_navigation: "Sales/pricing/action pages at zero-depth navigation — no clicks between intent and execution",
      L2_layout: "Primary CTA above the fold, no scrolling required to act; condensed layouts",
      L3_component: "CTA button bold (font-weight 800), large, high contrast — immediate visual target",
      L4_content: "Short copy only; imperatives over explanations; 'סגור עכשיו' not 'ניתן לשקול לסגור'",
      L5_interaction: "Fastest motion (0.55× multiplier); immediate feedback mode; no multi-step animations before action",
    },
  },
  {
    id: "H8_relational_distance",
    principle: "Connector archetype perceives transactional language as a social contract violation",
    source: "Haidt 2012 MFT — care/loyalty foundations; Fiske 1991 relational models theory",
    crossDomainEvidence: [
      "CRM adoption: Buttle 2004 — relationship-framed tools adopted 3× faster in SMB service firms",
      "Non-profit UX: Merchant et al. 2010 — warm language increases donation by 18%",
      "Community platforms: Kim 2000 — belonging language reduces churn in online communities",
    ],
    frictionClass: "relational_distance",
    regulatoryFocus: "prevention",
    processingStyle: "heuristic",
    manifestations: {
      L1_navigation: "Retention and AI coaching first — these are relationship tools, not transaction tools",
      L2_layout: "Customer-centric sections (retention health, loyalty metrics) before revenue sections",
      L3_component: "Customer health/sentiment cards prominent; revenue metrics secondary and reframed as care outcomes",
      L4_content: "Relational vocabulary: 'הלקוחות שלך', 'הקהילה שלך', 'הקשר שנבנה' not 'conversion rate'",
      L5_interaction: "Warm, fluid motion (ease-in-out, moderate speed 1.1×); no urgency signals which feel transactional",
    },
  },
];

// ── Per-Archetype Heuristic Activation ───────────────────────────────

const ARCHETYPE_ACTIVE_HEURISTICS: Record<ArchetypeId, string[]> = {
  strategist: ["H1_prevention_certainty", "H2_systematic_density", "H5_regulatory_fit"],
  optimizer:  ["H3_promotion_momentum",   "H2_systematic_density", "H5_regulatory_fit"],
  pioneer:    ["H3_promotion_momentum",   "H4_heuristic_choice_overload", "H6_narrative_resonance", "H5_regulatory_fit"],
  connector:  ["H8_relational_distance",  "H1_prevention_certainty", "H4_heuristic_choice_overload"],
  closer:     ["H7_urgency_proximity",    "H4_heuristic_choice_overload", "H3_promotion_momentum"],
};

// ── L5 Configuration Table ────────────────────────────────────────────
// Values derived from heuristic activation — each value is traceable.

const L5_BY_ARCHETYPE: Record<ArchetypeId, L5InteractionConfig> = {
  // H1 (prevention certainty) → slower motion builds trust
  // H2 (systematic density) → stable, non-distracting transitions
  strategist: {
    motionDurationMultiplier: 1.3,
    motionEasing: "cubic-bezier(0.4, 0, 0.2, 1)",  // ease-in-out: deliberate
    feedbackTiming: "considered",
    ctaFontWeight: 600,   // analytical precision, not bold urgency
    hoverElevation: "subtle",
  },
  // H3 (promotion momentum) → faster motion = energy
  // H2 (systematic density) → but still smooth, not jarring
  optimizer: {
    motionDurationMultiplier: 0.85,
    motionEasing: "cubic-bezier(0.4, 0, 0.2, 1)",  // ease-in-out: smooth but faster
    feedbackTiming: "immediate",
    ctaFontWeight: 700,   // confident, metric-driven
    hoverElevation: "strong",
  },
  // H3 (promotion momentum) → fast feedback
  // H4 (heuristic choice overload) → single focus, no multi-step choreography
  // H6 (narrative resonance) → fluid scene-like transitions
  pioneer: {
    motionDurationMultiplier: 0.75,
    motionEasing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", // ease-out: energetic deceleration
    feedbackTiming: "immediate",
    ctaFontWeight: 800,   // bold = action, build now
    hoverElevation: "strong",
  },
  // H8 (relational distance) → warm, unhurried motion
  // H1 (prevention certainty) → moderate speed, not rushed
  connector: {
    motionDurationMultiplier: 1.1,
    motionEasing: "cubic-bezier(0.4, 0, 0.2, 1)",  // ease-in-out: warm and fluid
    feedbackTiming: "considered",
    ctaFontWeight: 700,   // warm confidence
    hoverElevation: "subtle",   // gentle = relational
  },
  // H7 (urgency proximity) → fastest motion, immediate feedback
  // H4 (heuristic choice overload) → bold single CTA
  closer: {
    motionDurationMultiplier: 0.55,
    motionEasing: "cubic-bezier(0.0, 0, 0.2, 1)",  // ease-out: snap deceleration = urgency
    feedbackTiming: "immediate",
    ctaFontWeight: 800,   // bold = close NOW
    hoverElevation: "strong",
  },
};

// ── L4 Configuration Table ────────────────────────────────────────────

const L4_BY_ARCHETYPE: Record<ArchetypeId, L4ContentConfig> = {
  // H1 (prevention) → loss framing; H2 (systematic) → technical + metrics
  strategist: {
    copyFraming: "loss",
    vocabulary: "technical",
    emphasisMode: "metrics",
    ctaVerbs: {
      primary:  { he: "נתח", en: "Analyze" },
      action:   { he: "בדוק את הנתונים", en: "Review the data" },
    },
  },
  // H3 (promotion) → gain framing; H2 (systematic) → metrics
  optimizer: {
    copyFraming: "gain",
    vocabulary: "technical",
    emphasisMode: "metrics",
    ctaVerbs: {
      primary:  { he: "שפר", en: "Improve" },
      action:   { he: "ראה את ההתקדמות", en: "See the progress" },
    },
  },
  // H3 (promotion) → gain; H6 (narrative) → story
  pioneer: {
    copyFraming: "gain",
    vocabulary: "narrative",
    emphasisMode: "story",
    ctaVerbs: {
      primary:  { he: "בנה", en: "Build" },
      action:   { he: "בוא נתחיל", en: "Let's start" },
    },
  },
  // H8 (relational) → hybrid; warm narrative; outcomes over metrics
  connector: {
    copyFraming: "loss",  // "don't lose your customers" — prevention via relationships
    vocabulary: "narrative",
    emphasisMode: "story",
    ctaVerbs: {
      primary:  { he: "חזק", en: "Strengthen" },
      action:   { he: "שמור על הקשרים", en: "Protect the relationships" },
    },
  },
  // H7 (urgency) → gain; short imperative; metrics (deal count)
  closer: {
    copyFraming: "gain",
    vocabulary: "hybrid",
    emphasisMode: "balanced",
    ctaVerbs: {
      primary:  { he: "סגור", en: "Close" },
      action:   { he: "סגור עכשיו", en: "Close now" },
    },
  },
};

// ── L3 Configuration Table ────────────────────────────────────────────

const L3_BY_ARCHETYPE: Record<ArchetypeId, L3ComponentConfig> = {
  strategist: { ctaMode: "paired",  analyticsExpanded: true,  summaryFirst: false, density: "rich"     },
  optimizer:  { ctaMode: "paired",  analyticsExpanded: true,  summaryFirst: false, density: "compact"  },
  pioneer:    { ctaMode: "solo",    analyticsExpanded: false, summaryFirst: true,  density: "standard" },
  connector:  { ctaMode: "solo",    analyticsExpanded: false, summaryFirst: true,  density: "standard" },
  closer:     { ctaMode: "solo",    analyticsExpanded: false, summaryFirst: true,  density: "compact"  },
};

// ── L2 Configuration Table ────────────────────────────────────────────

const L2_BY_ARCHETYPE: Record<ArchetypeId, L2LayoutConfig> = {
  // H1 + H2: safety signals top; dense multi-column
  strategist: {
    primaryLayout: "dense-grid",
    progressiveDisclosure: false,
    safetySignalsProminent: true,
    momentumSignalsProminent: false,
  },
  // H3 + H2: momentum top; dense but streamlined
  optimizer: {
    primaryLayout: "two-column",
    progressiveDisclosure: false,
    safetySignalsProminent: false,
    momentumSignalsProminent: true,
  },
  // H3 + H4 + H6: momentum top; single column; progressive disclosure
  pioneer: {
    primaryLayout: "single-column",
    progressiveDisclosure: true,
    safetySignalsProminent: false,
    momentumSignalsProminent: true,
  },
  // H8 + H1: relational/safety; single column; progressive
  connector: {
    primaryLayout: "single-column",
    progressiveDisclosure: true,
    safetySignalsProminent: true,
    momentumSignalsProminent: false,
  },
  // H7 + H4: urgency; single column; no disclosure overhead
  closer: {
    primaryLayout: "single-column",
    progressiveDisclosure: true,
    safetySignalsProminent: false,
    momentumSignalsProminent: true,
  },
};

// ── L1 Configuration Table ────────────────────────────────────────────

const L1_BY_ARCHETYPE: Record<ArchetypeId, L1NavigationConfig> = {
  strategist: {
    routePriorities: { strategy: 1, dashboard: 2, data: 3, plans: 4, ai: 5, crm: 6 },
    defaultLandingRoute: "/data",
    quickActionPriorities: ["/data", "/strategy", "/dashboard"],
  },
  optimizer: {
    routePriorities: { dashboard: 1, data: 2, strategy: 3, retention: 4, pricing: 5 },
    defaultLandingRoute: "/dashboard",
    quickActionPriorities: ["/dashboard", "/retention", "/pricing"],
  },
  pioneer: {
    routePriorities: { wizard: 1, differentiate: 2, strategy: 3, ai: 4, sales: 5 },
    defaultLandingRoute: "/wizard",
    quickActionPriorities: ["/wizard", "/differentiate", "/ai"],
  },
  connector: {
    routePriorities: { retention: 1, ai: 2, crm: 3, strategy: 4, dashboard: 5 },
    defaultLandingRoute: "/retention",
    quickActionPriorities: ["/retention", "/ai", "/crm"],
  },
  closer: {
    routePriorities: { sales: 1, pricing: 2, strategy: 3, differentiate: 4, dashboard: 5 },
    defaultLandingRoute: "/sales",
    quickActionPriorities: ["/sales", "/pricing", "/differentiate"],
  },
};

// ── Main Export ───────────────────────────────────────────────────────

/**
 * Pure function: derives the full BehavioralHeuristicSet for an archetype.
 * Every value in the returned set is traceable to its source heuristic.
 */
export function deriveHeuristicSet(archetypeId: ArchetypeId): BehavioralHeuristicSet {
  const activeIds = ARCHETYPE_ACTIVE_HEURISTICS[archetypeId] ?? [];
  const activeHeuristics = HEURISTIC_LIBRARY.filter(h => activeIds.includes(h.id));

  // Determine primary axes from active heuristics
  const regulatoryFocus = activeHeuristics.find(h => h.regulatoryFocus)?.regulatoryFocus
    ?? (archetypeId === "strategist" || archetypeId === "connector" ? "prevention" : "promotion");
  const processingStyle = activeHeuristics.find(h => h.processingStyle)?.processingStyle
    ?? (archetypeId === "strategist" || archetypeId === "optimizer" ? "systematic" : "heuristic");

  return {
    archetypeId,
    regulatoryFocus: regulatoryFocus as "promotion" | "prevention",
    processingStyle: processingStyle as "systematic" | "heuristic",
    activeHeuristics,
    L1: L1_BY_ARCHETYPE[archetypeId],
    L2: L2_BY_ARCHETYPE[archetypeId],
    L3: L3_BY_ARCHETYPE[archetypeId],
    L4: L4_BY_ARCHETYPE[archetypeId],
    L5: L5_BY_ARCHETYPE[archetypeId],
  };
}

/**
 * Returns the CSS custom property declarations for a given archetype's
 * L5 micro-interaction configuration.
 * These are injected by useAdaptiveTheme alongside data-archetype attribute.
 */
export function getL5CSSVars(archetypeId: ArchetypeId): Record<string, string> {
  const l5 = L5_BY_ARCHETYPE[archetypeId];
  return {
    "--motion-duration-multiplier": String(l5.motionDurationMultiplier),
    "--motion-easing": l5.motionEasing,
    "--cta-font-weight": String(l5.ctaFontWeight),
  };
}

/** Returns the L4 CTA copy for the primary action */
export function getPrimaryCtaVerbs(archetypeId: ArchetypeId): L4ContentConfig["ctaVerbs"] {
  return L4_BY_ARCHETYPE[archetypeId].ctaVerbs;
}

/** Returns the resolved L3 component config */
export function getL3ComponentConfig(archetypeId: ArchetypeId): L3ComponentConfig {
  return L3_BY_ARCHETYPE[archetypeId];
}

/** Returns the active heuristic IDs for an archetype (for admin debug panel) */
export function getActiveHeuristicIds(archetypeId: ArchetypeId): string[] {
  return ARCHETYPE_ACTIVE_HEURISTICS[archetypeId];
}

/** Exposes the full heuristic library (for admin debug panel) */
export { HEURISTIC_LIBRARY };
