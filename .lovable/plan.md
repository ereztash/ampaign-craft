

# Integrate Personal Brand Strategy Module into FunnelForge

## Overview

Add a complete **Personal Brand** track alongside the existing marketing funnel builder. When users select "services" or a new "personalBrand" business field, they get a specialized funnel + a dedicated diagnostic-driven Personal Brand tab in results. Additionally, create a standalone diagnostic assessment tool accessible from the results dashboard.

## Part 1: Personal Brand Funnel Track (Engine)

### `src/types/funnel.ts`
- Add `"personalBrand"` to `BusinessField` type
- Add new interfaces:
  - `PersonalBrandData` — positioning health score, niche assessment, signal inventory, mega-trait
  - `BrandDiagnosticResult` — score breakdown by 12 sections (A-L from diagnostic-engine.md), weighted total score, interpretation tier
  - `ExecutionTemplate` — name, steps, timeline, priority (from execution-templates.md)
- Add `personalBrand?: PersonalBrandData` to `FunnelResult`

### `src/engine/funnelEngine.ts`

**New funnel stages** when `businessField === "personalBrand"`:
1. **Niche & ICP Definition** — Golden Triangle (expertise × interest × demand)
2. **UVP & Blue Ocean Positioning** — ERRC Matrix, differentiation
3. **Signal Building & Credibility** — costly signals, sector-specific hierarchy
4. **Content & Thought Leadership** — Halo Amplifier, narrative architecture
5. **Community & Network Effects** — Network Stickiness, referral loops

**New function `getPersonalBrandData(data)`** returns:
- Positioning tips based on audience type (B2B consulting vs. B2C creator)
- Signal priority recommendations by sector (tech → shipped products; consulting → case studies; finance → track record)
- Halo/Horn effect awareness tips
- Social proof bootstrapping steps
- Authenticity calibration guidance

**Enhanced `getOverallTips()`**: When personalBrand, add tips from:
- Blue Ocean vs Red Ocean positioning
- Loss Aversion Reframing for repositioning
- Conformity Breakout strategies
- Network flywheel building

### `src/engine/funnelEngine.ts` — Channel recommendations
Personal brand-specific channels:
- **LinkedIn** — Thought leadership, headline optimization, network leverage
- **Content/Blog** — Long-form authority building, SEO for personal brand
- **Email** — Newsletter, direct relationship building
- **Community** — Hosting vs. consuming, stickiness building

## Part 2: Diagnostic Assessment Tool (UI)

### `src/components/BrandDiagnosticTab.tsx` (new file)
A condensed diagnostic assessment inside the results dashboard (new tab "Brand DNA"):
- **15-20 key questions** selected from the 63 in the diagnostic engine (most impactful per section)
- Organized into 4 quick sections: Positioning Clarity, Competitive Landscape, Signal Strength, Authenticity
- Each question has a 1-10 slider or multiple-choice
- Calculates a **Positioning Health Score** (weighted across 12 dimensions)
- Shows score interpretation tier (7.5-10: strong, 5-7.4: gaps, 3-4.9: pivot needed, <3: restart)
- Generates **execution templates** recommendations based on score:
  - Score 8+: Signal Priority Mapper + Halo Amplifier
  - Score 5-7.4: Blue Ocean Generator + Loss Aversion Reframing
  - Score 3-4.9: Blue Ocean + Network Stickiness
  - Score <3: Conformity Breakout

### `src/components/ResultsDashboard.tsx`
- Add 7th tab: "Brand DNA" (visible when businessField is personalBrand or services)
- Tab renders `BrandDiagnosticTab` with interactive scoring

## Part 3: Form Updates

### `src/components/MultiStepForm.tsx`
- Add `personalBrand` option in Step 1 (business field) with a `User` icon and label "מיתוג אישי" / "Personal Brand"

### `src/i18n/translations.ts`
- Add all new translation keys: field label, tab label, diagnostic questions, score tiers, execution template names, section headers

## Files Changed
- `src/types/funnel.ts` — new types + personalBrand field
- `src/engine/funnelEngine.ts` — personal brand stages, channels, tips, `getPersonalBrandData()`
- `src/components/MultiStepForm.tsx` — add personalBrand option
- `src/components/BrandDiagnosticTab.tsx` — **new** diagnostic assessment UI
- `src/components/ResultsDashboard.tsx` — add Brand DNA tab
- `src/i18n/translations.ts` — new HE/EN strings

