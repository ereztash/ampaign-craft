

# Integrate Behavioral Science Hooks (10 Meta-Laws) into FunnelForge Engine

## What the Document Contains

The PDF describes **10 meta-laws for attention capture** based on behavioral science, cognitive psychology, and stylometry — designed for digital marketing content creation:

1. **Epistemic Curiosity Gap** — information gaps that trigger System 1 "cognitive itch"
2. **Asymmetric Loss Pricing** — loss aversion (Kahneman/Tversky Prospect Theory), losses hurt 2x more than gains
3. **Anchoring & Absolute Specificity** — hyper-specific numbers (47.3% not "about half") bypass skepticism
4. **Pattern Interrupt** — breaking expected patterns forces attention reallocation
5. **Social Identity Boundary Drawing** — tribal in-group/out-group triggers (Tajfel)
6. **SPOK Violation & Semantic Tension** — paradoxical word pairings that halt automatic reading
7. **Peak-End Rule in Micro-Copy** — emotional peak placement at the "see more" cut point
8. **Time Compression Illusion** — making effort seem trivially small
9. **Weaponized Vulnerability / POV Framing** — authentic weakness as a trust Trojan horse
10. **Execution Gap Architecture** — positioning content as friction-removing systems, not just information

## What Changes

### `src/engine/funnelEngine.ts` — `getOverallTips()`

Add a new section of **content creation tips** based on the 10 meta-laws, contextualized by audience type, experience level, and channels:

- **B2B users**: Emphasize laws 1 (Curiosity Gap), 3 (Specificity/Anchoring), 5 (Identity), 9 (Vulnerability), 10 (Execution Gap) — best for LinkedIn, email, thought leadership
- **B2C users**: Emphasize laws 2 (Loss Aversion), 4 (Pattern Interrupt), 7 (Peak-End), 8 (Time Compression) — best for Reels/TikTok, social ads
- **Beginners**: Get 2-3 actionable hook formulas with examples
- **Advanced**: Get the full framework with stylometric guidance

### `src/engine/funnelEngine.ts` — Channel tips enrichment

Enrich existing channel tips with hook-specific advice:
- **Instagram/TikTok channels**: Add Pattern Interrupt + Peak-End Rule tips (laws 4, 7)
- **LinkedIn channels**: Add Curiosity Gap + Vulnerability + Identity tips (laws 1, 5, 9)
- **Email channels**: Add Loss Aversion + Specificity tips (laws 2, 3)
- **Google Ads channels**: Add Anchoring + Execution Gap tips (laws 3, 10)

### `src/i18n/translations.ts`

Add a new tab label for "Content Hooks" or integrate into existing "Tips" tab with a subsection header.

### `src/components/ResultsDashboard.tsx`

Add a visual subsection in the Tips tab that presents the relevant hook formulas with examples, categorized by the user's channels.

## Technical Approach
- All hook logic lives in `funnelEngine.ts` — new helper function `getHookTips(data)` returns channel-specific hook recommendations
- Tips include Hebrew + English with concrete examples and formulas
- No new dependencies needed

