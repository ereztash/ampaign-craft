# Archetype System

Full technical reference for the behavioral classification pipeline.

## UserArchetypeLayer — Adaptive Persona System

5-archetype behavioral classification system grounded in Regulatory Focus Theory (Higgins 1997) × ELM (Petty & Cacioppo 1986). Every UI adaptation is traceable to a research source — no magic, no guessing.

### 5 MECE Archetypes

| Archetype | Regulatory Focus | Processing | Core Motivation |
|---|---|---|---|
| **Strategist** | Prevention | Systematic | Minimize risk through comprehensive understanding |
| **Optimizer** | Promotion | Systematic | Maximize efficiency through measurement and iteration |
| **Pioneer** | Promotion | Heuristic | Build something meaningful from a vision |
| **Connector** | Prevention | Heuristic | Strengthen customer relationships and community |
| **Closer** | Promotion | Heuristic | Close deals and drive revenue with maximum velocity |

### Classification Pipeline

14-signal classifier using behavioral signals across 8 sources:

```
formData → discProfile → hormoziValue → retentionFlywheel
→ churnRisk → healthScore → costOfInaction → knowledgeGraph
```

Confidence tiers drive progressive UI adaptation:

| Tier | Threshold | What activates |
|---|---|---|
| `none` | < 50% | Generic experience, no personalization |
| `tentative` | 50–64% | Copy tone adapts (NudgeBanner accent) |
| `confident` | 65–79% | CSS color palette + module reordering + L5 CSS vars |
| `strong` | ≥ 80% | Full UI morphing: sidebar, density, workspace order |

All personalisation is gated on explicit opt-in (`adaptationsEnabled`). Users see an **opt-in reveal screen** showing their archetype, its strengths, blind spots, and what UI changes if they accept. Adaptations never hide features.

### 8 Behavioral Heuristics (H1–H8)

Each heuristic resolves across 5 levels (L1 navigation → L5 CSS custom properties):

| ID | Principle | Source |
|---|---|---|
| H1 | Certainty Provision | Pavlou & Fygenson 2006; Prospect Theory |
| H2 | Cognitive Load Minimization | Sweller 1988 CLT; Miller 1956 |
| H3 | Regulatory Fit | Higgins 2000 FIT; Avnet & Higgins 2006 |
| H4 | Momentum Maintenance | Bandura 1977 SST; Thaler 1981 |
| H5 | Choice Architecture | Iyengar & Lepper 2000; Schwartz 2004 |
| H6 | Narrative Resonance | Escalas 2004 NRT; Bruner 1990 |
| H7 | Relational Signaling | Haidt 2012 MFT; Buttle 2004 |
| H8 | Temporal Urgency | Cialdini 1984; Gong.io 2019 |

### Friction-Mapped Pipeline (Tier 2)

Each archetype's `personalityProfile.pipeline` defines a 7-step recommended work sequence ordered by psychological friction sources. Every step carries a bilingual `frictionReason` traceable to the heuristic that motivates it.

`ArchetypePipelineGuide` replaces static quick-action buttons in CommandCenter when `confidenceTier !== "none"`, showing the next step with a CTA verb framed to the archetype's regulatory focus.

### Blind-Spot Nudges (Phase B)

When a user dwells on a module beyond the archetype's `dwellThresholdDays` without completing it, a `BlindSpotNudge` fires — rate-limited to once per 72 hours per module per user. The nudge is product-scoped and falsifiable (Barnum-effect mitigation).

### Glass-Box Transparency

Every adaptation is explainable:
- **AdminArchetypeDebugPanel** (owner-only): Active heuristics with L1–L5 manifestations, feature importance bars per signal source, classification rule formula with live values
- **ArchetypeProfileCard** (all users): Collapsible "Why this adapts your experience?" showing regulatory focus, processing style, core motivation, and active heuristic badges
- **AppSidebar**: Info icon on reordered Modules group with tooltip explaining the adaptation

### Key Files

```
src/engine/behavioralHeuristicEngine.ts  # H1–H8 registry, getL5CSSVars(), getPrimaryCtaVerbs()
src/engine/archetypeClassifier.ts        # 14-signal classifier → scores → ConfidenceTier
src/lib/archetypeUIConfig.ts             # 5 ArchetypeUIConfig objects with full personalityProfile
src/lib/archetypeBlindSpots.ts           # Static blind-spot profiles per archetype (Phase B data)
src/lib/archetypeAnalytics.ts            # Fire-and-forget event emitter (7 event types)
src/contexts/ArchetypeContext.tsx        # Schema v2: session persistence, setAdaptationsEnabled()
src/hooks/useAdaptiveTheme.ts            # Sets data-archetype, data-density + L5 CSS vars on <html>
src/hooks/useModuleDwell.ts              # Dwell tracking + 72h rate-limit helpers
src/hooks/useArchetypePipeline.ts        # Pipeline state hook (steps, nextStep, progressPercent)
src/hooks/useArchetypeCopyTone.ts        # Returns CTATone | null — null at cold start
src/providers/ArchetypeThemeProvider.tsx # data-shape, data-elevation, data-motion-preset on <html>
src/components/ArchetypeRevealScreen.tsx # Opt-in reveal screen at /archetype
src/components/BlindSpotNudge.tsx        # Dwell-time reminder banner (WCAG role="status")
src/components/ArchetypePipelineGuide.tsx # Friction-reasoned pipeline card with CTA
src/components/AdminArchetypeDebugPanel.tsx # Owner Glass-Box: heuristics + classification rule
src/components/ArchetypeProfileCard.tsx  # User-facing: archetype + confidence + "why?"
```
