# Competitor Research Strategy — FunnelForge

**Owner:** Product / Founder
**Last Updated:** 2026-04-25
**Status:** v1 — Active

---

## 1. The Question

Not "who are our competitors" — but:

> **Where is the gap that lets us establish a 6–18 month rebuild-gap MOAT on the CRM↔Data↔Copy↔Ads axis, before someone else closes it?**

Every finding maps to one of three sub-questions:
- **A. Defensibility:** What is the competitor's defensible asset?
- **B. Loop Closure:** Do they close the Data→Decision→Action→Measurement loop, or just part of it?
- **C. Wedge:** Where are they weak enough for us to enter?

---

## 2. MOAT Anchor (Locked)

**CRM-as-Platform** (HubSpot model). FunnelForge IS the system of record. Rationale:

1. The repo already contains a native CRM (`CrmPage.tsx`, contacts/deals/pipeline).
2. The 6 closed feedback loops require end-to-end data ownership — orchestration on top of someone else's CRM cannot self-correct.
3. Stylome (writing fingerprint), archetype classification, and cohort benchmarks all need long-term source-of-truth data.
4. The Israeli SMB ICP is largely CRM-illiterate — wedge is to be the *first* CRM, not a bolt-on.
5. Orchestration mode reduces FunnelForge to "another HubSpot Marketplace app" — commodity, not MOAT.

**Implication:** competitor research must measure each player on whether they could become a CRM-as-platform threat, not just feature parity.

---

## 3. Competitor Segmentation (16 entities, 5 layers)

| Layer | Definition | Entities |
|---|---|---|
| **L1 — Direct** | All-in-one growth platforms with CRM+Marketing+Sales+AI | HighLevel, ActiveCampaign, Keap |
| **L2 — CRM-as-Platform** | The strategic threat: they own the data, could add behavioral/copy/ads layers | HubSpot, Monday CRM, Pipedrive, Powerlink |
| **L3 — Single-layer specialists** | Deep in one of {copy, ads, retention} — could expand | Jasper, Copy.ai, Madgicx, Klaviyo, AdCreative.ai |
| **L4 — Human alternatives** | Who SMBs actually replace today | Israeli agencies, consultants, Hebrew freelancers |
| **L5 — Status quo** | DIY baseline — what 70% of the ICP uses today | Excel + Canva + ChatGPT + Meta Ads Manager |

---

## 4. The 9 Analysis Axes

Every competitor is scored on the same 9 dimensions:

- **A. Product & Capability** — module coverage, AI Hebrew quality, Meta Ads depth, CRM depth, feedback loop sophistication
- **B. Defensibility & MOAT** — defensible asset, rebuild gap
- **C. ICP & Positioning** — size, verticals, Hebrew/RTL, value prop
- **D. Pricing & Packaging** — model, tiers, anchor/decoy structure
- **E. Distribution & GTM** — channels, Israel presence, partners
- **F. Traction & Signals** — stage, employees, funding, negative reviews
- **G. Data & AI Architecture** — models used, glass-box / explainability
- **H. Cultural & Linguistic Fit** — Hebrew quality, gendered copy, Israeli context
- **I. Risks & Vulnerabilities** — top wedges to exploit

Full data is in `competitor-matrix.csv`.

---

## 5. Source Hierarchy

| Tier | Source | What it produces | Time per competitor |
|---|---|---|---|
| **T1 — Primary** | Free trial + 3 standard prompts; 30-min calls with 3 of their customers | Hands-on output, switching triggers | 60–90 min |
| **T2 — Secondary structured** | G2/Capterra/Trustpilot, official site, pricing, docs, changelog, blog | Feature parity, pricing, roadmap signals | 30 min |
| **T2** | LinkedIn + Crunchbase | Traction, capital, direction | 15 min |
| **T3 — Community** | Israeli Facebook marketing groups, Reddit, Twitter/X, Wayback Machine | Unmediated complaints, positioning drift | Ongoing |
| **T4 — Inferred** | SimilarWeb, Builtwith, SEO tools | Traffic, stack, content strategy | 15 min |

**Rule:** No conclusion based solely on T2/T4. Every competitor needs at least one T1 touch before final positioning.

> v1 of this research used T2/T3/T4 sources (web research). T1 (trials + customer calls) is the v2 task.

---

## 6. Deliverables

Four documents, one CSV — each for a different decision-maker:

| File | Audience | Purpose |
|---|---|---|
| `competitor-matrix.csv` | Product, founders | Source of truth — 16 × 22 cells |
| `wedge-map.md` | PM, founder | Top 5 exploitable gaps with concrete features |
| `positioning-canvas.md` | Marketing | How we frame ourselves vs each segment + anti-positioning |
| `moat-defensibility-doc.md` | Founder, fundraising | 6 loops × competitor risk timeline |

---

## 7. Cadence

Living research. Update schedule:

- **Weekly:** Scan changelogs + LinkedIn posts of top-6 competitors (Powerlink, HubSpot, Madgicx, HighLevel, Monday, ActiveCampaign). 30 minutes.
- **Monthly:** Update Pricing (D) + Traction (F) for the matrix.
- **Quarterly:** Full refresh of all 9 axes for all 16 competitors. Re-evaluate whether the list of 16 is still right.
- **Ad-hoc trigger:** Material competitor funding round / pricing change / product launch → 48-hour deep dive.

---

## 8. Known Gaps in v1

This v1 was built from web sources only. To upgrade to v2:

1. **Hands-on trials** of HubSpot Breeze, Powerlink Fireberry AI, Madgicx AI Marketer with identical Hebrew prompts. Score Hebrew quality on the same 6 neuropsychological checks our `copyQAEngine.ts` uses.
2. **Israeli customer interviews:** 5 SMBs currently using Powerlink + 5 using monday CRM + 5 using DIY stack. 30 minutes each. Switching triggers, frustrations, willingness-to-pay.
3. **Agency/consultant interviews:** 3 Israeli digital agencies on what they'd resell vs build internally.
4. **Powerlink deep-dive:** They are the highest strategic threat (see `moat-defensibility-doc.md`). Independent reverse-engineering of Fireberry AI Journeys feedback loop sophistication.
