# Differentiation Playbook — Runs Directory

תיקיית הריצות של ה-pipeline לוולידציה של ה-Differentiation Playbook. הסקריפטים כאן מבצעים את שלבי Phase 0-3 כפי שמתועד ב-[`../test-subjects.md`](../test-subjects.md).

---

## Quick Start

### 1. Set up environment

```bash
# In repo root
cp .env.example .env

# Edit .env and add your Anthropic API key:
# ANTHROPIC_API_KEY=sk-ant-...
```

**Recommended:** create a project-specific API key at [console.anthropic.com](https://console.anthropic.com/settings/keys) with a spending cap (e.g., $50/month). See secrets section in `.env.example`.

### 2. Verify connectivity (dry run)

After adding the key, before running real syntheses:

```bash
# This will fail intentionally if the key is missing or invalid; verify
# that the error message is clean (no key leaked, no prompt content shown):
ANTHROPIC_API_KEY=invalid_key_test npm run playbook:extract -- --candidate buildots-roy-danon --model sonnet
```

You should see:
```
[extract] ERROR: Auth failed (401): ANTHROPIC_API_KEY rejected. Verify key in .env is valid and active.
```

If you see prompt content, source content, or the API key in the error → STOP. There is a sanitization bug; report it.

### 3. Collect input bundle for a candidate

For each candidate, create `runs/inputs/<slug>/` with:

| File | Content |
|------|---------|
| `candidate.json` | Metadata: candidate_name, company, source_url, source_date, source_type |
| `primary-source.md` | Full text of the long-form external source (interview/podcast transcript/article) |
| `linkedin-headline.txt` | The CEO's LinkedIn headline (single line) |
| `linkedin-about.md` | The CEO's full LinkedIn About section |
| `website-hero.md` | Company website hero text (h1 + sub) |
| `website-about-first.md` | First paragraph of company About page |

Example `candidate.json`:
```json
{
  "candidate_name": "Roy Danon",
  "company": "Buildots",
  "source_url": "https://www.unite.ai/roy-danon-ceo-of-buildots-interview-series/",
  "source_date": "2024-XX-XX",
  "source_type": "long-form Q&A interview"
}
```

### 4. Run the pipeline

```bash
# Phase 0: extract (Sonnet first; if quality is borderline, retry with Opus)
npm run playbook:extract -- --candidate buildots-roy-danon --model sonnet

# Review the extraction at: runs/extractions/buildots-roy-danon/extraction__v0.1.1__run1__YYYY-MM-DD.json

# If satisfied:
npm run playbook:approve -- --candidate buildots-roy-danon

# If not (re-extract with different model or after fixing input bundle):
npm run playbook:approve -- --candidate buildots-roy-danon --reject

# Phase 1+: synthesize (3 runs for stability check)
npm run playbook:synth -- --candidate buildots-roy-danon --runs 3

# Phase 0.5: mapping (3-run aggregate)
npm run playbook:map -- --candidate buildots-roy-danon

# Phase 2: comparison (deterministic, no LLM)
npm run playbook:compare -- --candidate buildots-roy-danon
```

---

## Pipeline architecture

```
inputs/<slug>/
   primary-source.md
   linkedin-*, website-*
        ↓
[extract.ts]   model=sonnet|opus  temperature=0.5
        ↓
extractions/<slug>/extraction__v...json
        ↓
[approve.ts]   gate: pending_review → approved
        ↓
   ┌──── parallel ────┐
   ↓                  ↓
[synth.ts]         [map.ts]
opus, T=0.3        sonnet, T=0.25, n=3
3 stability runs   aggregated
   ↓                  ↓
syntheses/<slug>/  mappings/<slug>/
   └──── joined ──────┘
              ↓
       [compare.ts]
       deterministic
              ↓
       comparisons/<slug>/comparison__...json
       (10 metrics + decision gate summary)
```

**The Extractor and Synthesizer never share context.** They run as separate API calls with separate system prompts. The Mapper bridges them deterministically via the playbook index (one-line per principle, no decision rules).

---

## Versioning

Three layers (see [`../prompts/`](../prompts/)):

1. **Per-prompt header** (in `.md` files): `<!-- prompt-version: 0.1.0 -->`
2. **Per-artifact metadata** (in JSON output): `metadata.prompt_version`, `metadata.prompt_hash_sha256`, `metadata.playbook_version`, `metadata.playbook_hash_sha256`
3. **Git tags** (manual): `prompts-v0.1.0` after each Phase milestone

When changing a prompt: bump the version header (semver), commit, tag if appropriate. The script will pick up the new version automatically and write it to all subsequent artifacts.

---

## Cost expectations

Per-Phase rough estimates (depends on source length):

| Phase | What runs | Model | Approximate cost |
|-------|-----------|-------|------------------|
| 0 (extract) | 1 call per candidate | Sonnet | $0.05–$0.20 |
| 0 (extract, Opus comparison) | 1 call per candidate | Opus | $0.25–$1.00 |
| 1 (synth × 3 stability runs) | 3 calls per candidate | Opus | $1.50–$3.00 |
| 0.5 (map × 3 aggregate runs) | 3 calls per candidate | Sonnet | $0.30–$0.60 |
| 2 (compare) | 0 LLM calls | (deterministic) | $0 |

**Total for one candidate full pipeline:** ~$2–$5 with Opus synth + Sonnet extract.
**Phase 1 (Buildots only with Opus):** ~$5–$10 (1 candidate, multiple iterations expected).
**Phases 1-3 full (3-6 candidates):** ~$30–$60.

Each script prints a cost preview before any API call so you can abort if it looks wrong.

---

## Decision gates

Per `test-subjects.md`:

- **Phase 0:** extraction `validation_quality` flag. Low-quality extractions are kept but excluded from decision gates.
- **Phase 1:** mechanical structure check (15 principles present, scores valid, evidence quotes present, stability ≤1.5).
- **Phase 2:** comparison metrics (ground-truth coverage ≥60%, hallucination ≤30%, axis match ≥60%).
- **Phase 3:** within-axis discrimination across 3+ M-axis candidates.
- **Phase 4:** deferred until empirical signal from 1-3.

A failing gate doesn't auto-stop the pipeline; it prints PASS/FAIL and the user decides whether to iterate or proceed.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ANTHROPIC_API_KEY missing` | `.env` not loaded or key not set | Verify `.env` in repo root contains the key |
| `Auth failed (401)` | Key invalid or revoked | Verify at console.anthropic.com |
| `Permission/quota error` | Spending cap hit or model unavailable | Increase cap; or wait for monthly reset |
| `Cannot synthesize: STATUS not 'approved'` | Gate not satisfied | Run `npm run playbook:approve -- --candidate <slug>` |
| `Input bundle missing required file` | Secondary sources not collected | See section 3 above |
| `Failed to parse JSON from response` | LLM returned malformed JSON | Re-run; if persistent, the prompt may need clarification |
| Synthesis returned `<15 principleOutputs` | Structural failure (LLM dropped principles) | Re-run; if persistent, prompt enforcement may need strengthening |

---

## Files NOT to commit

- `.env`
- API keys in any form
- Anything under `runs/inputs/` that contains private content (LinkedIn About, internal notes)

The `.gitignore` already handles `.env`. For `runs/inputs/`, decide per-candidate whether to commit (public sources OK; private/scraped content → leave local).
