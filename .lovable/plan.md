

# Integrate Marketing Frameworks into FunnelForge Engine

## What the Documents Contain

The uploaded PDFs describe four interconnected marketing frameworks for the post-trust, post-attention economy:

1. **Prometheus V2.0** — 5 meta-principles: Trust as currency, Value-first (Reciprocity), Radical Relevance (Personalization), Frictionless Experience, Community as Moat
2. **Δ-Navigator Strategy** — 5 B2B pillars: ICP/UVP → Thought Leadership → Diagnostic as Lead Magnet (cognitive dissonance) → Tripwire & PLG → First Deal Closing (consultative selling)
3. **Meta-Logic of Attention** — Attention economy (Simon), cognitive load theory (Sweller), UX as conversion foundation, PLG/Freemium models
4. **Authenticity in Noise** — UGC outperforms branded content, micro-influencers, community-led growth (CLG)

## What Changes

### 1. Enhanced B2B Funnel Stages (Δ-Navigator Pillars)
Replace the current B2B storytelling stage names with the 5-pillar model:
- **Awareness** → "ICP Targeting & Pain Discovery" — identify the villain/business pain
- **Engagement** → "Thought Leadership & Trust Moat" — position as industry authority
- **Leads** → "Diagnostic Lead Magnet" — use cognitive dissonance, offer assessment tools
- **Conversion** → "Tripwire & PLG" — low-barrier entry ($299 sprint), product-led growth
- **Retention** → "Consultative Closing & Advocacy" — consultative selling, referral loops

### 2. New Strategic Tips Layer (Meta-Principles)
Add framework-aware tips in `getOverallTips()` organized by the 5 meta-principles:
- **Trust**: UGC stats (79% influence purchases, 93% marketers report better performance), micro-influencer ROI ($5.78 per $1), Edelman trust gap data
- **Reciprocity**: Content marketing generates 3x more leads at 62% lower cost; Freemium conversion benchmarks (6-15%)
- **Personalization**: 71% expect it, 76% frustrated without it; 5-15% revenue lift
- **Frictionless**: Checkout redesign = 35% conversion lift; cognitive load theory application
- **Community**: CLG delivers 5x lower CAC, 3x higher LTV, 90% higher retention (Figma/Notion examples)

### 3. Enhanced Channel Recommendations
Update `getChannelsForStage()` for B2B flows:
- **Leads stage**: Add "Diagnostic Assessment / Webinar" as a channel (Δ-Navigator pillar 3)
- **Conversion stage**: Add "Tripwire Offer (Sprint/Workshop)" channel for B2B
- **Engagement stage**: Emphasize Thought Leadership content, industry reports
- **Retention stage**: Add "Community Platform / CLG" channel option

### 4. New KPIs from Frameworks
Add framework-specific KPIs in `getKpis()`:
- Pipeline Velocity, Coverage Ratio (B2B)
- Trust Score / NPS as trust indicator
- Community engagement metrics for CLG strategies
- Freemium-to-paid conversion rate for PLG models

### 5. Attention Economy Context
Add a new section in tips that contextualizes the user's strategy within the attention economy:
- "Your audience sees 4,000-10,000 ads daily — your funnel must cut through cognitive overload"
- Budget-specific advice on frictionless experiences
- Post-trust positioning advice based on audience type

## Files Modified
- `src/engine/funnelEngine.ts` — All changes concentrated here (stage definitions, tips, channels, KPIs)

## Technical Approach
- All changes are in the existing engine functions — no new files or types needed
- Tips and channel recommendations enriched with research-backed data points from the documents
- B2B path gets significantly deeper strategic guidance; B2C path gets attention economy and trust-building enhancements

