# Differentiation Validation Harness

Synthetic-persona harness that stress-tests the Differentiation module **before** real users touch it. Goal: drive uncertainty out of the engine, copy, and promise — so the only thing left to validate with real users is **behavior**, not logic.

## When to run this

- Any change to `src/engine/differentiationEngine.ts`
- Any change to `src/components/DifferentiationResult.tsx` first-screen copy
- Before bumping `expectedMinutes` for differentiation in `intakeMatrix.ts`
- Before opening a Fake Door / landing page experiment

## Quick start

```bash
# Mock mode (default — no API key required, fail-biased by design)
bun run evals:differentiation

# Live mode — real Anthropic API. Required to actually pass IBAR gates.
ANTHROPIC_API_KEY=sk-ant-... HARNESS_MODE=live bun run evals:differentiation

# Live + force premortem
ANTHROPIC_API_KEY=sk-ant-... HARNESS_MODE=live bun run evals:differentiation -- --premortem
```

Run via `vite-node` (handled by the script) so `import.meta.env` resolves and the
engine's transitive Supabase import is satisfied with placeholder env vars.

Output is written to `evals/differentiation/outputs/run-<timestamp>.json` (gitignored).

## What the harness does

For each of 20 synthetic personas:

1. Synthesize a `mechanismStatement.oneLiner` via LLM.
2. Run `generateDifferentiation(persona.formData, { phase5: ... })`.
3. Generate two baseline alternatives: raw ChatGPT + deterministic template.
4. Run 4 red-team prompts in parallel: `critic`, `usability`, `ownership`, `comparison`.
5. (On gate failure or `--premortem`) run a single 20-reason premortem against the worst persona.

Then aggregate into Synthetic IBAR + check kill criteria.

## Synthetic IBAR — pass thresholds

| Dimension | Pass | Source |
|---|---|---|
| `clarity` | ≥16/20 | `critic.coherent && genericity_score < 70` |
| `ownership` | ≥12/20 | `ownership.feels_mine` |
| `applicability` | ≥10/20 | `usability.would_use && where.length≥1` |
| `improvability` | informational | requires v2 iteration loop (not yet wired) |
| `preference` | ≥8/20 | `comparison.winner === "ff"` |

**No persona average.** IBAR is a count of personas that passed, not a mean. Tail failures kill the run.

## Kill criteria (plan §9)

Any of these stops further iteration on UI / Fake Door:

- `genericity_failure > 8/20` → fix the engine
- `preference < 8/20` → no edge over raw ChatGPT, do not ship UI changes
- `applicability < 8/20` → wrong promise; update `intakeMatrix.ts`
- `clarity < 12/20` → engine/copy fundamentals broken
- One persona accounts for >50% of all failures → ICP problem; remove it from promise

## File layout

```
evals/differentiation/
├── README.md                  # this file
├── uncertainty-ledger.md      # 15 tracked assumptions; status updated each run
├── first-screen-audit.md      # static checklist (manual fill)
├── personas/
│   ├── personaSchema.ts       # Zod validation of personas + form data
│   └── synthetic-personas.ts  # 20 personas (data only)
├── harness/
│   ├── runHarness.ts          # CLI entry
│   ├── llmClient.ts           # mock + live LLM client
│   ├── redTeamPrompts.ts      # 5 prompt templates
│   ├── compareToAlternatives.ts
│   ├── scoring.ts             # IBAR + kill criteria
│   └── __tests__/             # vitest
└── outputs/                   # gitignored — run-*.json
```

## Reading a run

```bash
jq '.ibar' evals/differentiation/outputs/run-*.json | tail
jq '.killCriteriaTriggered' evals/differentiation/outputs/run-*.json | tail
jq '.records[] | select(.redTeam.ownership.feels_mine == false) | .personaId' \
  evals/differentiation/outputs/run-*.json
```

## Notes

- Mock mode is **fail-biased by construction** (~33% of personas always fail). This is intentional: only live runs can clear gates.
- The harness skips the production upstream that synthesizes the mechanism statement (edge function). It uses an inline LLM call instead so the harness stays self-contained.
- Out of scope: testing other modules (Funnel/Pricing/Sales/Retention). When Differentiation passes IBAR, generalize.
