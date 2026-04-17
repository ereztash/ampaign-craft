# PRD Template — FunnelForge

> Copy this file, rename to `prd-<feature-name>.md`, fill in all sections.
> Incomplete PRDs should not enter sprint planning.

---

## Meta

| Field | Value |
|---|---|
| **Feature Name** | |
| **Author** | |
| **Status** | Draft / Review / Approved / Shipped |
| **Created** | YYYY-MM-DD |
| **Target Release** | YYYY-MM-DD or "vX.Y" |
| **RICE Score** | (compute below) |
| **MoSCoW** | Must / Should / Could / Won't |

---

## Problem Statement

> 1–3 sentences. What user pain are we solving? Who feels it? How often?

---

## Job-to-be-Done

> When [situation], I want to [motivation], so I can [expected outcome].

---

## User Story (primary)

> As a [user type], I want to [action], so that [benefit].

**Acceptance criteria:**
- [ ] ...
- [ ] ...
- [ ] ...

---

## Success Metrics

| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| North Star | weekly_activated_plans | 25/wk | `/admin/aarrr` |
| Feature-specific | | | |
| Counter-metric (don't harm) | | | |

---

## RICE Prioritisation

| Factor | Score | Notes |
|---|---|---|
| **Reach** (users/quarter) | | |
| **Impact** (1=min, 3=max) | | |
| **Confidence** (%) | | |
| **Effort** (person-weeks) | | |
| **RICE = R × I × C / E** | **=** | |

---

## Scope

### In Scope
- ...

### Out of Scope (explicitly)
- ...

### Future Considerations (post-Beta)
- ...

---

## Design

> Link to Figma / wireframe, or describe UX flow in bullet points.

**Happy path:**
1. User does X
2. System responds with Y
3. User sees Z

**Edge cases:**
- Empty state: ...
- Error state: ...
- RTL (Hebrew): ...

---

## Technical Notes

**Files to create:**
- `src/pages/NewFeature.tsx`
- `src/components/NewWidget.tsx`

**Files to modify:**
- `src/App.tsx` (route)
- `src/components/AppSidebar.tsx` (nav item)

**Data model / API:**
- Supabase table: ...
- Edge function: ...
- ENV vars: ...

**Performance:**
- Expected data size: ...
- Caching strategy: ...

---

## Rollout Plan

| Phase | Audience | Trigger | Rollback |
|---|---|---|---|
| Internal | Owner only | HIDE_INCOMPLETE=false | HIDE_INCOMPLETE=true |
| Beta | All beta users | Deploy | git revert |
| GA | All users | — | — |

---

## Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | | | |

---

## Appendix

- Links to research, user interviews, competitor analysis
- ADRs if architectural decisions were made
