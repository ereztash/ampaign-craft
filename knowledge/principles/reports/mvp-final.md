# Differentiation Playbook — MVP Final Report

**Branch:** `claude/simplify-differentiation-module-e5wvG`
**Tag:** `mvp-v1.0`
**Date:** 2026-05-09
**Total cost:** $13.50 across all candidates and infrastructure
**Total time:** ~6 hours of session work
**Code state:** all scripts in `runs/scripts/`, prompts in `prompts/`, candidate data in `runs/inputs/`, run artifacts under `runs/{extractions,syntheses,mappings,comparisons}/`

---

## BLUF

The engine works: it produces stable, evidence-backed differentiation signals on n=3 candidates, with cross-candidate discrimination (each candidate gets a distinct top-principle signature). Breadth-first architecture broke the single-source ceiling on n=1 (Aquant: P09 Domain-Empathy 7,8,7 → 8,8,8 across 3 runs when a second independent source was added). This is a working proof, not a product.

---

## What — Empirical Findings

3 candidates evaluated end-to-end (extract → synth × 3 → map × 3 → compare):

| Candidate | Track | Top stable principles (≥6 in all 3 runs) | coverage_at_6 | coverage_at_8 | axis_match | stability | score_spread | metrics passed |
|-----------|-------|-------------------------------------------|---------------|---------------|------------|-----------|--------------|----------------|
| Buildots / Roy Danon | depth | P02 (6,6,6) · P03 (6,6,6) · P05 (6,6,7) · P09 (7,7,7) | 50% | 0% | 33% FAIL | PASS (1.0) | PASS (2.10) | 6/9 |
| Aquant / Shahar Chen | depth | P09 (7,8,7) | 33% | 8.3% | 100% PASS | PASS (1.0) | FAIL (1.88) | 6/9 |
| Aquant / Shahar Chen | **breadth** (2 sources) | **P09 (8,8,8)** · P02 (6,7,6) · P03 (6,6,6) | **50%** | **25%** | 100% PASS | PASS (1.0) | **PASS (2.11)** | **7/9** |
| Finout / Roi Ravhon | depth | P02 (6,7,7) · P05 (7,6,7) · P15 (6,6,6) | 20% | 0% | 100% PASS | FAIL (2.0)* | PASS (2.07) | 6/9 |

*Finout stability fail: P12 and P13 noise (2-point variance), top principles still stable.

**Cross-candidate discrimination — three distinct signatures emerged:**
- Buildots (M-axis multi-framing): mechanism + frame-shift + domain-empathy + explanation efficiency, no single dominance
- Aquant (T-axis dominant): P09 Domain-Empathy strongly dominant (the only principle to break 8)
- Finout (M+C hybrid): mechanism articulation + crisp explanation + brand legitimacy via SiriusXM/NYT/Lyft customer logos

The playbook discriminates between positionings. The disqualifier policy works (Synthesizer correctly capped P12 Loss-Avoided at 4 for Buildots' McKinsey 50% citation because the disqualifier "industry stat ≠ company-specific evidence" applied).

**Breadth-first comparative experiment (Aquant only, n=1):**
Adding Emerj as a second independent source to Aquant raised P09 from 7,8,7 to 8,8,8 (consistent ceiling break across all 3 runs). coverage_at_6 33% → 50%, coverage_at_8 8.3% → 25%, score_spread 1.88 → 2.11. Cost increment: $0.18.

---

## So What — Five Weaknesses Identified

1. **Breadth-first proven on n=1 only.** Aquant's ceiling break with 2 sources is suggestive but not generalizable. We don't know if Buildots, Finout, or other candidates would show the same pattern. The breadth-first hypothesis (more sources → higher scores → cleaner discrimination) needs n≥3 to be considered validated.

2. **Mapper-Synthesizer mismatch is structural, not calibration.** The Mapper reads only the extraction's `in_ceo_own_terminology` array (term-based). The Synthesizer can detect content-meta features like P09 Domain-Empathy via consistent industry-language use across the source. They legitimately disagree on principles like P09 (always missed by Mapper, always seen by Synthesizer). The current `coverage_at_6` and `synthesis_only_themes_at_6` metrics measure this mismatch, not engine quality. Need a third metric class that doesn't penalize epistemic difference.

3. **Single-source ceiling at score 7.** Across all 3 depth-track candidates, no principle reached 8 in all 3 runs. Aquant's P09=8 in 1 run was the only ceiling break in depth mode. With 2 sources, Aquant achieved 8,8,8 consistently. This suggests structural evidence (visible in cross-source consistency) is the missing piece for "strong signal" classification — and single-source extraction inherently lacks it.

4. **McKinsey-like misranking, non-systematic.** Buildots showed McKinsey 50% productivity stat misranked into P03 Frame-Shift at score 6 instead of P12 Loss-Avoided where it semantically belongs (capped at 4 by disqualifier). Finout and Aquant don't show this pattern (no industry stats cited). Per-source quirk, not engine bug. No fix justified by current data.

5. **ICP is narrower than the research suggested.** The test was on Israeli B2B Growth-Stage CEOs. Real-world independent source accessibility is the binding constraint: only 8 of 11 candidates from the original Deep Research had ≥5 independent sources publicly accessible, and many of those couldn't pass WebFetch (LinkedIn 999, Citybiz 403, paywalled trade pubs blocked). Operating ICP for breadth-first methodology is closer to "presence-rich Israeli B2B CEOs with 3+ verbatim-rich external interviews" — narrower than the playbook's stated audience.

---

## Now What — Three Options

### Option A — Continue technical optimization
Add 5+ candidates, run breadth-first across all, refine metrics, fix Mapper-Synthesizer mismatch with a third metric class. Cost: $30-50, 8-15 hours additional.
**Why not:** marginal returns. Current weaknesses are mostly structural (ICP, source-access, epistemic difference between Mapper and Synthesizer), not calibration. More technical runs won't surface new questions.

### Option B — Build production UX on current engine
Wrap the engine in a UI, make it self-serve for users, deploy to a feedback environment. Cost: substantial.
**Why not yet:** the test runs were against external CEOs we never spoke to. We don't know if a CEO using this on themselves would find the output useful, accurate, or insulting. UX work without that signal is premature.

### Option C — Human validation with 2-3 ICP CEOs (recommended)
Find 2-3 actual Israeli B2B Growth-Stage CEOs (not from the test set), run the engine on their public corpora, present the synthesis output to them in person, and ask three questions: (a) is this what you'd say about your differentiation? (b) does it surface anything you hadn't articulated? (c) what would you change?

This produces qualitative data the technical metrics can't: whether the output is useful to the actual user, not whether it converges with a constructed mapping. Cost: time + 2-3 conversations + ~$10 in API spend.

**Recommendation: C.** The technical infrastructure is sufficient for proof. The next constraint is whether the output is useful to the audience, and that question is human, not technical.

---

## Reference

- Branch: `claude/simplify-differentiation-module-e5wvG`
- Tag: `mvp-v1.0`
- Architecture decisions: see `test-subjects.md`
- Edge function deployment: `supabase/functions/playbook-llm/` (verify_jwt: true, version 2)
- Key prompts: `prompts/extractor-depth.md` (v0.2.1), `prompts/extractor-breadth.md` (v0.3.0), `prompts/mapper.md` (v0.1.1), `prompts/synthesizer.md` (v0.3.0), `prompts/playbook-index.md` (v0.1.0)
- Playbook: `playbook.md` (v0.2.0)
- Nicolas Bandurek run was archived (not part of MVP) due to source-asymmetry between Erez's NotebookLM-based manual synthesis and the engine's web-only bundle.
