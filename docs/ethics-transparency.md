# Ethics & Transparency: Behavioral AI in FunnelForge

**Version 1.0 — April 2026**

---

## The Short Version

FunnelForge uses behavioral science to help small-business owners understand their customers and craft better communication. We apply DISC profiling, archetype classification, pricing frameworks, and behavioral nudges — all **with your knowledge, with your consent, and with full Glass-Box traceability**.

We do not manipulate. We assist.

---

## 1. What Behavioral Science We Use

FunnelForge integrates the following behavioral frameworks:

| Framework | Where Used | Purpose |
|---|---|---|
| DISC Personality Profiling | Sales module, neuro-closing | Match messaging tone to customer communication style |
| Hormozi Value Equation | Pricing & Marketing modules | Quantify offer value before setting a price |
| Van Westendorp PSM | Pricing wizard | Derive acceptable price band from customer perception |
| Ariely Decoy Effect | Pricing tiers | Structure 3-tier options so the target tier looks rational |
| Kahneman Cost of Inaction | All modules | Frame problem urgency in terms of ongoing loss, not purchase cost |
| Regulatory Focus Theory | Archetype system | Match UI flow to user's promotion vs. prevention motivation |
| Fogg Behavior Model (B=MAT) | Retention nudges | Trigger micro-actions when motivation + ability + prompt align |

**These are teaching frameworks, not covert levers.** We apply them to help you understand your customers' psychology — not to exploit gaps in your own.

---

## 2. What We Don't Do

We explicitly do **not**:

- **Dark patterns**: No hidden cancellation flows, no fake countdown timers, no forced continuity without clear opt-out.
- **Manufactured urgency**: Scarcity and urgency copy is only generated when real signals exist (e.g. actual seasonal data).
- **Covert profiling**: Archetype classification requires the user to explicitly enable adaptations (`adaptationsEnabled: true`). This is opt-in, not default-on.
- **Manipulation targeting**: DISC profiles classify communication *style*, not psychological vulnerability. We do not target distress states.
- **Opaque AI decisions**: Every behavioral recommendation includes a `rationale` and `methodology` field. You can always see *why* a recommendation was made.

---

## 3. Transparency Mechanisms (Glass-Box Design)

### 3.1 Archetype Reveal Screen

Before any UI personalization takes effect, users see a full explanation of:
- Which archetype they were classified as
- What signals led to that classification (14 signal sources, all named)
- What changes will be made to their experience (tab order, CTA verbs, copy tone)
- A clear opt-in / opt-out toggle

This is not a EULA checkbox. It's a conversational explanation screen that a user must actively engage with.

### 3.2 AdminArchetypeDebugPanel

Available to `owner`-role users. Shows:
- Active behavioral heuristics (H1–H8) and their weights
- L1–L5 resolution chain (from navigation order to CSS variables)
- Feature importance scores for each classification signal
- Raw archetype score breakdown

### 3.3 Rationale Fields

Every pricing recommendation, funnel strategy, and sales script includes bilingual `rationale` and `methodology` fields explaining the behavioral science basis. Users can inspect and override any recommendation.

### 3.4 Blind-Spot Nudges Are Rate-Limited

Archetype-specific nudges (the system noticing when a Strategist is stuck in analysis-paralysis) fire at most **once per 72 hours per module per user**. They are scoped to product behavior, not psychological profiling, and are designed to be falsifiable.

---

## 4. Data Practices

### What We Collect for Personalization
- Form inputs you provide during wizard flows
- Which modules you visit and complete
- Recommendations shown and whether you acted on them (optional: 7/30/90-day outcome tracking)

### What We Don't Collect
- Keystroke patterns or dwell time beyond aggregated engagement metrics
- Browser history, third-party tracking, or cross-site profiling
- Real customer data about *your* customers (we help you craft messages; we don't process your CRM)

### Data Minimization
Behavioral cohort aggregation is done at archetype-cohort level (not individual level) for benchmark recommendations. Individual signal history is capped at 50 entries.

---

## 5. Regulatory Compliance

### Israeli Consumer Protection Act (5741-1981)
FunnelForge's copy-generation features explicitly exclude:
- False or misleading claims
- Manufactured social proof
- Fabricated testimonials

The `qaSecurityAgent` scans all generated content for PII, injection risks, and legally unsafe templates before delivery.

### GDPR / Israeli Privacy Protection Act
- Users can request deletion of their profile and all stored plans
- Archetype profiles are stored with `user_id` and protected by Supabase RLS
- No data is sold or shared with third parties for advertising

### Advertising Standards
We encourage accuracy over persuasion. Our copy frameworks (PAS, AIDA, BAB) are taught to marketers worldwide. Using them is not deceptive — using them with false claims would be. We enforce claim accuracy in the Differentiation module.

---

## 6. What Makes This Different from Dark UX

Dark UX uses behavioral science **against** the user's interests — creating confusion, friction asymmetry, or manufactured anxiety to extract value from the user.

FunnelForge uses behavioral science **for** the user's business interests — helping them communicate more clearly, price more accurately, and retain customers more effectively.

The test: **Does the user benefit from understanding how this works?** For dark UX, the answer is no — understanding breaks the effect. For FunnelForge, the answer is yes — the ArchetypeRevealScreen and Glass-Box panels are **features**, not liabilities.

---

## 7. Our Commitments

1. We will never add behavioral features that require opacity to function.
2. Every new nudge or personalization mechanism will ship with a corresponding explanation in the Glass-Box panel.
3. We will publish an annual transparency report covering: number of archetype classifications, opt-in rates, nudge acceptance rates, and any data subject requests received.
4. We will maintain an ethics review checklist for any new behavioral feature before shipping.

---

*Questions? Contact: privacy@funnelforge.io*

*Last updated: April 2026*
