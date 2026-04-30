# Contributing to FunnelForge

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Edge Functions via Deno)
- **AI:** Anthropic Claude (Haiku/Sonnet/Opus via LLM router)
- **Payments:** Stripe (via `create-checkout` edge function)
- **i18n:** Hebrew (primary) + English — all UI strings via `tx()` or `useLanguage()`

## Local Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Meta keys
npm run dev                  # http://localhost:5173
```

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint — must pass with 0 warnings |
| `npm test` | Vitest (~4750 tests) |
| `npm test -- --coverage` | Coverage report (thresholds: stmt 31%, branch 67%, fn 49%) |

## Pre-commit Hook

Husky + lint-staged runs `eslint --max-warnings 0 --fix` on staged files automatically.

## Architecture Decision Records

Significant decisions are documented in `docs/adr/`. Before making an architectural
change, check if an existing ADR covers it. For new significant decisions, create a new
ADR from `docs/adr/0000-template.md`.

Current ADRs:
- [0001](docs/adr/0001-meta-scope-ads-read-only.md) — Meta OAuth: ads_read only for Beta
- [0002](docs/adr/0002-meta-token-sessionstorage.md) — Token storage: sessionStorage + CSP
- [0003](docs/adr/0003-edge-function-rate-limiting.md) — Rate limiting: in-memory sliding window

## Code Conventions

- **No comments** unless the *why* is non-obvious (constraint, workaround, invariant)
- **Bilingual strings** — always `tx({ he: "...", en: "..." }, language)` — never hardcode one language
- **safeStorage** over raw `localStorage` — always use `src/lib/safeStorage.ts`
- **Zod validation** at system boundaries — user input goes through `src/schemas/`
- **Feature gates** via `useFeatureGate()` — never check tier inline in components

## Edge Functions

All Supabase Edge Functions must:
1. Import CORS helpers from `_shared/cors.ts` (no wildcard `*`)
2. Import rate limit from `_shared/rateLimit.ts` with appropriate limits
3. Log structured JSON on significant events

## Test Guidelines

- Tests live next to source in `__tests__/` subdirectories
- Mock at the boundary (`vi.mock(...)`) — don't mock internals
- `jsdom` environment; use `@testing-library/react` for components
- Accessibility: use `jest-axe` for components that render interactive UI

## Branching Strategy

We use **trunk-based development**. Most work goes directly to `main` via short-lived branches.

| Scenario | Approach |
|---|---|
| Bug fix, small feature, refactor | Direct push to `main` (or same-day branch) |
| Feature spanning >1 session or >20 files | Short-lived branch off `main`, PR when ready |
| RLS / auth / payments / migrations | Always a branch + PR, never direct push |
| Dependabot / dependency bumps | Auto-PR via Dependabot |

Branch naming: `claude/<short-description>`, `fix/<issue>`, or `feat/<thing>`.

## Dependabot PR Tiers

| Tier | Examples | Action |
|---|---|---|
| **1 — Safe, merge same day** | Patch bumps, `@types/*`, `actions/*`, `@radix-ui/*` | Review diff, merge |
| **2 — Verify before merge** | Minor bumps with potential API changes (lucide-react, icon libs) | Scan imports for breaking changes, then merge |
| **3 — Dedicated session** | Major breaking bumps (vitest, eslint) | Open as tracking issue; do not merge until migration plan exists |

**Currently deferred (Tier 3):**
- `vitest` 3→4: breaking test-runner API changes
- `eslint` 9→10: requires Node 20.19+, flat config migration

## Hygiene Baseline

`bash scripts/check-hygiene-baseline.sh` must pass before merge. Counters tracked:

- `raw_storage_calls` — use `safeStorage`, never raw `localStorage`/`sessionStorage`
- `console_calls` — use `logger`, never `console.log/warn/error` in app code
- `supabase_any_cast` — use `supabaseLoose` boundary for `as any` casts
- `explicit_any` — avoid `any`; use `unknown` and narrow
- `exhaustive_deps_suppressions` — fix deps, don't suppress lint

## Rollback

See `docs/rollback-sop.md` for kill-switch procedures.  
See `docs/incident-runbook.md` for incident response.
