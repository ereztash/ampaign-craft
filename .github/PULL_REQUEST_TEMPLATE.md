## What

<!-- One sentence: what does this PR do? -->

## Why

<!-- Why is this change needed? Link to issue/context if relevant. -->

## Test plan

- [ ] `npx tsc --noEmit` — clean
- [ ] `npx vitest run` — all tests pass
- [ ] Manual smoke test on the affected UI path (if any)

## Checklist

- [ ] No new raw `localStorage` / `sessionStorage` calls (use `safeStorage`)
- [ ] No new `console.log/warn` (use `logger`)
- [ ] No breaking changes to engine output types without updating ViewModels
- [ ] Supabase migrations are idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`)
- [ ] RLS enabled on any new table; writes via SECURITY DEFINER functions only
