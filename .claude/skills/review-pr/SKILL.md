---
name: review-pr
description: Review a FunnelForge (ampaign-craft) pull request against repo-specific conventions. TRIGGER when the user types `/review-pr`, `/review-pr <number>`, `/review-pr <github-url>`, or asks to "review PR #N", "audit PR N", or "check pull request N". Fetches PR metadata, diff, files, check runs, and reviews via GitHub MCP, cross-references local source, and renders a terminal dashboard covering strict-TS quality, Vitest coverage, Hebrew i18n, engine reuse (44 engines), MAS-CC blackboard compliance, LLM Router usage, edge-function JWT pattern, security, performance, and CI gates (lint + test + tsc + audit-engines + verify-runtime-calls + score-market-gap). READ-ONLY — never writes, commits, or posts PR comments unless the user explicitly asks afterward. Optionally posts a compact summary to Slack if `SLACK_WEBHOOK_URL` is set in the environment.
---

# /review-pr — FunnelForge PR Review Dashboard

You are reviewing a pull request in `ereztash/ampaign-craft` (FunnelForge). Be rigorous, terse, and actionable.

## Hard constraints (never violate)

- **Repo scope:** only `ereztash/ampaign-craft`. If the user references any other repo, abort with a message that this skill is scoped to ampaign-craft.
- **Read-only on GitHub by default.** Do NOT call any write tool (`mcp__github__pull_request_review_write`, `mcp__github__add_issue_comment`, `mcp__github__add_comment_to_pending_review`, `mcp__github__add_reply_to_pull_request_comment`, `mcp__github__update_pull_request`, `mcp__github__merge_pull_request`, `mcp__github__create_or_update_file`, etc.) unless the user, in a **separate follow-up turn after the dashboard has been rendered**, explicitly asks to "post this review to GitHub" or similar.
- **Read-only on the filesystem.** Do NOT edit, create, delete, or move any files in the repo. No commits, no `git push`, no `npm install`, no modifications to `.claude/`, the plan file, or any source file.
- **Do not run the CI gates locally.** No `npm test`, `npm run lint`, `npx tsc --noEmit`, `tsx scripts/*`. Project the outcome from the diff and `get_check_runs` instead. The user can re-invoke with an explicit "also run the gates" if they want a local run.
- **Never echo `$SLACK_WEBHOOK_URL` to stdout or any tool output.** Use shell variable expansion only.
- **Treat the dashboard as the final output.** Stop after rendering it (and optionally posting to Slack). Do not continue with follow-up actions on your own.

## Workflow

### Step 1 — Parse the argument

Extract the PR number from the user's invocation:

- Bare integer like `42` → `pr_number = 42`.
- GitHub URL like `https://github.com/ereztash/ampaign-craft/pull/42` → extract `42`. If `owner/repo` in the URL differs from `ereztash/ampaign-craft`, abort with "This skill is scoped to ereztash/ampaign-craft only."
- No argument → call `mcp__github__list_pull_requests` with `owner: "ereztash"`, `repo: "ampaign-craft"`, `state: "open"`, `perPage: 10`, `sort: "updated"`, `direction: "desc"`. Show the list (number, title, author, updated time) and use `AskUserQuestion` to let the user pick one (or provide "Other" to type a number).

Always hardcode `owner = "ereztash"`, `repo = "ampaign-craft"`.

### Step 2 — Fetch PR data in parallel (one tool block)

Issue these six calls in a **single tool-use block** so they run in parallel:

1. `mcp__github__pull_request_read` with `method: "get"` — metadata (title, body, author, labels, base/head, state, draft, commit count).
2. `mcp__github__pull_request_read` with `method: "get_diff"` — full unified diff.
3. `mcp__github__pull_request_read` with `method: "get_files"`, `perPage: 100` — file list with `additions` / `deletions` / `status`.
4. `mcp__github__pull_request_read` with `method: "get_check_runs"` — CI job statuses (lint, test, typecheck, build, audit-engines, verify-runtime-calls, score-market-gap).
5. `mcp__github__pull_request_read` with `method: "get_reviews"` — existing reviews.
6. `mcp__github__pull_request_read` with `method: "get_status"` — combined commit status.

**Edge-case handling:**

- `draft: true` → note "DRAFT" in the header, but still review.
- `state: "closed"` and not merged → warn the user and `AskUserQuestion` whether to still review.
- `additions + deletions > 1500` → switch to **chunked mode** (see Step 4 below).
- Empty diff (no files changed) → abort with "No changes to review on PR #<n>".
- MCP call returns 429 / 5xx → retry once. If still failing, degrade by skipping `get_status` and `get_reviews` (they are nice-to-have) and proceed with `get`, `get_diff`, `get_files`, `get_check_runs`.
- Binary / image / lockfile changes (`*.png`, `*.jpg`, `*.svg`, `package-lock.json`, `bun.lockb`, `*.pdf`) → list the filenames in the Files section but do NOT attempt to review their content.

### Step 3 — Augment with local reads

For each file in `get_files` where `status !== "removed"`, read the **current** version from disk at its absolute path under `/home/user/ampaign-craft/` using the `Read` tool. Batch the reads in parallel tool-use blocks. Additionally, read these context files when the corresponding trigger applies:

| When a changed file matches… | Also read… |
|---|---|
| `src/**/*.tsx` touching UI strings | `src/i18n/he.ts`, `src/i18n/en.ts`, `src/i18n/index.ts` |
| `src/engine/**/*.ts` (potential new engine logic) | `src/engine/index.ts` plus 1–2 sibling engines for reuse comparison |
| `src/engine/blackboard/**/*.ts` | `src/engine/blackboard/contract.ts`, `src/engine/blackboard/circuitBreaker.ts`, `src/engine/blackboard/blackboardStore.ts` |
| Any call to an LLM / Anthropic / OpenAI API | `src/services/llmRouter.ts` |
| `scripts/**/*.ts` or changes that could affect gates | `scripts/audit-engines.ts`, `scripts/verify-runtime-calls.ts`, `scripts/score-market-gap.ts` |
| `supabase/functions/**/*.ts` | `supabase/functions/generate-copy/index.ts` (reference pattern) |
| Any `*.test.ts(x)` | the file-under-test nearby so coverage can be judged |

If a path does not exist locally (e.g. the file is new and only in the PR diff), skip silently — the diff already contains the new content.

### Step 4 — Review checklist

Evaluate each of these 10 categories and assign `PASS` / `WARN` / `FAIL`:

| # | Category | What to check |
|---|---|---|
| 1 | **TypeScript strictness** | zero `any`, no `@ts-ignore`, no unsafe non-null `!` on untrusted values, exhaustive discriminated unions, would `tsc --noEmit` stay clean? |
| 2 | **Tests (Vitest)** | new exported functions / components have co-located `*.test.ts(x)`; matches repo test patterns; Supabase / LLM / fetch calls mocked; no `.skip` or `.only`; does not break the `debugSwarm` baseline exclusions |
| 3 | **Hebrew i18n** | NO hard-coded user-facing Hebrew or English strings in `.tsx`; all new strings added to `src/i18n/he.ts` and `src/i18n/en.ts` with identical keys; RTL-safe Tailwind classes (`ms-*` / `me-*` / `ps-*` / `pe-*` instead of `ml-*` / `mr-*` / `pl-*` / `pr-*`); number and date formatting via existing helpers |
| 4 | **Engine reuse (44 engines)** | new logic cross-checked against `src/engine/` and `src/lib/`; no duplication of existing engines or utilities; any new engine is registered so `scripts/audit-engines.ts` will still pass; no "orphaning" of a live engine |
| 5 | **MAS-CC compliance** | blackboard writes go through `blackboardStore`; new agents honour `contract.ts`, `circuitBreaker.ts`, `goalROI.ts`, `edp.ts`; no direct cross-agent coupling; async pipeline uses the same `Promise.allSettled` pattern |
| 6 | **LLM Router + NIS caps** | ALL model calls route through `src/services/llmRouter.ts`; no raw `fetch('https://api.anthropic.com/v1/messages', …)` from client code; cost caps (NIS) respected; correct model tier (Haiku / Sonnet / Opus) chosen for the workload |
| 7 | **Edge Functions (Deno)** | JWT verification via `supabase.auth.getUser()`; CORS headers set; Anthropic fetch pattern matches `generate-copy`; error envelope `{ error: string }` returned on failure; secrets read via `Deno.env.get(...)`; no client-only imports |
| 8 | **Security** | no secrets committed (tokens, keys, service-role, `.env` contents); no `dangerouslySetInnerHTML` on untrusted input; Supabase queries respect RLS assumptions; Zod (or equivalent) validation at all system boundaries; no new SQL-injection or XSS surface |
| 9 | **Performance** | no N+1 Supabase queries; `useMemo` / `useCallback` on render-hot paths; `React.lazy` still used for heavy routes; no large sync work in render; embeddings cache hits where possible |
| 10 | **CI gates (projected)** | will `npm run lint && npm test && npx tsc --noEmit && tsx scripts/audit-engines.ts && tsx scripts/verify-runtime-calls.ts && tsx scripts/score-market-gap.ts` stay green? Cross-check your projection with the actual `get_check_runs` results |

Record each finding with these fields:

- **Sev**: `CRITICAL` / `MAJOR` / `MINOR` / `NIT`
- **Cat**: number 1–10 from the table above
- **File:Line**: `path/to/file.ts:42` (relative to repo root)
- **Problem**: one short sentence
- **Fix**: one short sentence

**Chunked mode (for PRs with `additions + deletions > 1500`):** do the review in directory groups in this order, summarising each before the final dashboard:

1. `src/engine/**` (core logic & agents)
2. `src/services/**` and `src/lib/**` (shared services)
3. `supabase/functions/**` (edge functions)
4. `src/components/**` and `src/pages/**` (UI)
5. `src/i18n/**` (localisation)
6. `scripts/**` and `.github/**` (tooling & CI)
7. `**/*.test.ts(x)` (tests)
8. Everything else

### Step 5 — Render the dashboard

Output a **single markdown response** in exactly this structure (do not add extra preamble):

```markdown
# PR #<num> — <title>

<author> → <base>  |  <state><DRAFT?>  |  +<add> / -<del> across <N> files  |  <commits> commits
<PR URL>

## Summary

<2–3 sentences: what the PR does and the intended outcome>

## Category Status

| # | Category                  | Status         | Notes |
|---|---------------------------|----------------|-------|
| 1 | TypeScript strictness     | PASS/WARN/FAIL | ...   |
| 2 | Tests (Vitest)            | PASS/WARN/FAIL | ...   |
| 3 | Hebrew i18n               | PASS/WARN/FAIL | ...   |
| 4 | Engine reuse              | PASS/WARN/FAIL | ...   |
| 5 | MAS-CC compliance         | PASS/WARN/FAIL | ...   |
| 6 | LLM Router + NIS caps     | PASS/WARN/FAIL | ...   |
| 7 | Edge Functions            | PASS/WARN/FAIL | ...   |
| 8 | Security                  | PASS/WARN/FAIL | ...   |
| 9 | Performance               | PASS/WARN/FAIL | ...   |
| 10| CI gates (projected)      | PASS/WARN/FAIL | ...   |

**Totals:** <x> PASS / <y> WARN / <z> FAIL

## Findings

| Sev      | Cat | File:Line              | Problem | Fix |
|----------|-----|------------------------|---------|-----|
| CRITICAL | 8   | src/foo/bar.ts:42      | ...     | ... |
| MAJOR    | 1   | src/baz/qux.tsx:17     | ...     | ... |
| ...      | ... | ...                    | ...     | ... |

(Sort CRITICAL → MAJOR → MINOR → NIT. If none: "No findings.")

## Reuse Opportunities

- `<existing helper or engine>` at `<file:line>` already does <X> — consider calling it from `<new file:line>` instead of the new ad-hoc implementation.
- (omit section if none)

## Action Items

1. <ordered, minimal set needed to land the PR>
2. ...

## CI Gate Projection

| Gate                     | Check runs | Projection |
|--------------------------|------------|------------|
| lint                     | <result>   | PASS/WARN/FAIL |
| test (Vitest)            | <result>   | PASS/WARN/FAIL |
| tsc --noEmit             | <result>   | PASS/WARN/FAIL |
| audit-engines            | <result>   | PASS/WARN/FAIL |
| verify-runtime-calls     | <result>   | PASS/WARN/FAIL |
| score-market-gap         | <result>   | PASS/WARN/FAIL |

## Verdict

**APPROVE** / **REQUEST_CHANGES** / **COMMENT** — <one sentence justification>

---

_Read-only review. Say `post this review to GitHub` if you want me to submit it via `pull_request_review_write`._
```

### Step 6 — Optional Slack notification (conditional)

After the dashboard is rendered, check whether a Slack webhook is configured. Use a single `Bash` call:

```bash
test -n "$SLACK_WEBHOOK_URL" && echo SET || echo UNSET
```

- If the output is `UNSET` → do nothing and do not mention Slack in your response.
- If the output is `SET` → post a compact JSON payload to `$SLACK_WEBHOOK_URL`. Use shell heredoc + `curl` so the webhook is never echoed to stdout or any tool result:

    ```bash
    curl -sS -X POST -H 'Content-Type: application/json' \
         --data-binary @- "$SLACK_WEBHOOK_URL" <<'JSON'
    {
      "text": "*PR Review: ereztash/ampaign-craft#<num>* — <title>\n*Verdict:* <APPROVE|REQUEST_CHANGES|COMMENT>\n*Categories:* <x> PASS / <y> WARN / <z> FAIL\n*Top findings:*\n• <sev> <file:line> — <problem>\n• <sev> <file:line> — <problem>\n• <sev> <file:line> — <problem>\n<PR URL>"
    }
    JSON
    ```

    Substitute the concrete values from the dashboard before running the command. If `curl` exits non-zero, print `Slack notify failed (curl exit $?)` — do NOT print the webhook URL, and do NOT abort the skill. If `curl` succeeds, print `Slack notified.` on its own line.

### Step 7 — Stop

After the dashboard (and optional Slack step), stop. Do NOT:

- post anything to GitHub
- commit, push, or modify any files
- run `npm test`, `npm run lint`, `npx tsc`, or any `scripts/*` file
- proactively continue with next steps

If and only if the user, in a new turn, explicitly says something like "post this review to GitHub", "submit the review", or "approve this PR", may you call `mcp__github__pull_request_review_write` with the dashboard content as the `body` and the appropriate `event` (`APPROVE`, `REQUEST_CHANGES`, or `COMMENT` matching the verdict). Always confirm the verdict with the user first if it is `APPROVE` or `REQUEST_CHANGES`.
