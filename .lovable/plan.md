

# Integrate Neuro-Storytelling Framework into FunnelForge

## Overview
Enhance the existing Copy Lab with neuro-storytelling techniques AND create a new "Neuro-Storytelling" tab with interactive tools based on the 4 uploaded research documents.

## Part 1: Enhance Copy Lab (`src/engine/funnelEngine.ts` + `src/components/CopyLabTab.tsx`)

### New Writing Techniques (added to `getCopyLabData()`)
Add 3 neuro-storytelling techniques to the existing `writingTechniques` array:

1. **Cortisol Vector (Hook & Stakes)** — High-stakes framing that sharpens reader focus. Do: "This decision will define your next quarter." Don't: "Consider our product." Metric: "+115% on complex tasks (EmotionPrompt)"
2. **Oxytocin Vector (Neural Coupling)** — Persona alignment and shared context. Do: "As a marketing director managing 10+ campaigns..." Don't: "Dear customer." Metric: "+80% empathy-driven action"
3. **Dopamine Vector (Resolution Engine)** — Sequential reward path with progressive payoff. Do: "Step 1→Result. Step 2→Result. Step 3→Outcome." Don't: "Our product does many things." Metric: "+25-35% completion rate"

### Enhanced Reader Profile
Add `neuroProfile` field to `ReaderProfile` type — maps each System level to its dominant neurochemical response pattern and optimal narrative arc.

## Part 2: New Neuro-Storytelling Tab

### `src/types/funnel.ts` — New types
```
NeuroStorytellingData {
  vectors: NeuroVector[]          // Cortisol, Oxytocin, Dopamine vectors
  promptTemplates: NeuroPromptTemplate[]  // Pre-built Neuro-Prompt templates per funnel stage
  entropyGuide: EntropyGuide      // Entropy management guidance
  axiom: { he: string; en: string }  // The Axiom of Vectorial Narrative Gravity
}

NeuroVector {
  id: "cortisol" | "oxytocin" | "dopamine"
  name: { he; en }
  biologicalFunction: { he; en }
  copyApplication: { he; en }
  intensityTips: { he; en }[]
}

NeuroPromptTemplate {
  stage: string                    // Mapped to funnel stage
  template: { he; en }
  vectors: string[]                // Which vectors are activated
}

EntropyGuide {
  definition: { he; en }
  overloadSigns: { he; en }[]     // Too much tension
  collapseSigns: { he; en }[]     // Too constrained
  balanceTips: { he; en }[]
}
```

Add `neuroStorytelling?: NeuroStorytellingData` to `FunnelResult`.

### `src/engine/funnelEngine.ts` — `getNeuroStorytellingData(data)`
Generates stage-specific Neuro-Prompt templates based on:
- Business field → adjusts stakes language (health=patient outcomes, tech=system failure, finance=revenue loss)
- Audience type → B2B uses stronger Oxytocin Vector (persona alignment), B2C uses stronger Cortisol Vector (urgency/FOMO)
- Main goal → awareness=Dopamine-heavy (curiosity), leads=Cortisol+Oxytocin, sales=all three at max

### `src/components/NeuroStorytellingTab.tsx` — New component
Interactive UI with 3 sections:

1. **The 3 Vectors** — Visual cards showing Cortisol/Oxytocin/Dopamine with biological function → copy application mapping. Color-coded (red/blue/green).

2. **Neuro-Prompt Generator** — User selects a funnel stage, gets a pre-built template with marked vector zones. Shows which neurochemical each section activates.

3. **Entropy Balance Meter** — Visual guide showing the "sweet spot" between entropic overload (too many stakes) and entropy collapse (too constrained). Tips for the user's specific business type.

4. **The Axiom** — Highlighted card with the Axiom of Vectorial Narrative Gravity in plain language: "Narrative tension works only when aligned with your goal."

### `src/components/ResultsDashboard.tsx`
Add 8th tab "Neuro-Story" (always visible). Renders `NeuroStorytellingTab`.

### `src/i18n/translations.ts`
Add ~15 new keys: tab label, vector names, section headers, entropy terms.

## Files Changed
- `src/types/funnel.ts` — new NeuroStorytelling types
- `src/engine/funnelEngine.ts` — `getNeuroStorytellingData()` + enhance `getCopyLabData()` with 3 neuro techniques
- `src/components/NeuroStorytellingTab.tsx` — **new** interactive UI
- `src/components/CopyLabTab.tsx` — minor: display neuro profile badge
- `src/components/ResultsDashboard.tsx` — add Neuro-Story tab
- `src/i18n/translations.ts` — new HE/EN strings

