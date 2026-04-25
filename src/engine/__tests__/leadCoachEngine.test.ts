import { describe, it, expect } from "vitest";
import { generateLeadRecommendations, type LeadCoachInput } from "../leadCoachEngine";
import type { Lead, LeadInteraction, LeadStatus } from "@/services/leadsService";
import type { DISCProfile } from "../discProfileEngine";
import type { CrmInsights } from "../crmInsightEngine";

function makeLead(o: Partial<Lead> = {}): Lead {
  return {
    id: o.id ?? "lead-x",
    userId: "u1",
    name: o.name ?? "Test",
    phone: "", email: "", business: "",
    status: (o.status ?? "lead") as LeadStatus,
    notes: "",
    valueNIS: o.valueNIS ?? 0,
    nextFollowup: null,
    source: o.source ?? "",
    whyUs: o.whyUs ?? "",
    lostReason: o.lostReason ?? "",
    closedAt: o.closedAt ?? null,
    planId: null,
    createdAt: o.createdAt ?? "2026-04-20T00:00:00Z",
    updatedAt: "2026-04-25T00:00:00Z",
  };
}

function makeDisc(primary: DISCProfile["primary"]): DISCProfile {
  return {
    primary,
    secondary: "I",
    distribution: { D: 25, I: 25, S: 25, C: 25 },
    messagingStrategy: { emphasize: [], avoid: [] },
    ctaStyle: { he: "", en: "" },
    funnelEmphasis: "",
    communicationTone: { he: "", en: "" },
  };
}

const baseInput: Omit<LeadCoachInput, "lead"> = {
  userDisc: makeDisc("D"),
  funnel: null,
  closing: null,
  hormozi: null,
  crmInsights: null,
  interactions: [],
  now: new Date("2026-04-25T00:00:00Z"),
};

describe("leadCoachEngine — structure", () => {
  it("always returns exactly 3 recommendations, one per category", () => {
    const recs = generateLeadRecommendations({ ...baseInput, lead: makeLead() });
    expect(recs).toHaveLength(3);
    expect(recs.map((r) => r.category)).toEqual(["approach", "timing", "leverage"]);
  });

  it("every recommendation includes a framework name and bilingual citation", () => {
    const recs = generateLeadRecommendations({ ...baseInput, lead: makeLead({ whyUs: "fast results" }) });
    for (const r of recs) {
      expect(r.framework).toMatch(/^(DISC|Cialdini|Hormozi|Challenger|SPIN|Sandler)$/);
      expect(r.citationHe.length).toBeGreaterThan(10);
      expect(r.citationEn.length).toBeGreaterThan(10);
      expect(r.titleHe.length).toBeGreaterThan(0);
      expect(r.titleEn.length).toBeGreaterThan(0);
      expect(r.bodyHe.length).toBeGreaterThan(0);
      expect(r.bodyEn.length).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("leadCoachEngine — Approach (DISC bridge)", () => {
  it("uses DISC framework", () => {
    const recs = generateLeadRecommendations({ ...baseInput, lead: makeLead({ whyUs: "fast results" }) });
    expect(recs[0].framework).toBe("DISC");
  });

  it("infers buyer DISC from whyUs keywords (D)", () => {
    const recs = generateLeadRecommendations({
      ...baseInput,
      userDisc: makeDisc("S"),
      lead: makeLead({ whyUs: "fast results, high ROI, decisive team" }),
    });
    expect(recs[0].titleEn).toMatch(/D buyer/);
    expect(recs[0].confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("infers buyer DISC = C from analytical language", () => {
    const recs = generateLeadRecommendations({
      ...baseInput,
      userDisc: makeDisc("I"),
      lead: makeLead({ whyUs: "I need data, research, and a written guarantee" }),
    });
    expect(recs[0].titleEn).toMatch(/C buyer/);
  });

  it("falls back to lower confidence when whyUs is empty", () => {
    const recs = generateLeadRecommendations({ ...baseInput, lead: makeLead({ whyUs: "" }) });
    expect(recs[0].confidence).toBeLessThan(0.85);
  });

  it("infers buyer DISC from Hebrew text (S)", () => {
    const recs = generateLeadRecommendations({
      ...baseInput,
      userDisc: makeDisc("D"),
      lead: makeLead({ whyUs: "אמינות וטווח ארוך, יחסי משפחה" }),
    });
    expect(recs[0].titleEn).toMatch(/S buyer/);
  });
});

describe("leadCoachEngine — Timing", () => {
  it("Sandler pain funnel for recently lost lead", () => {
    const recs = generateLeadRecommendations({
      ...baseInput,
      lead: makeLead({ status: "lost", lostReason: "price was too high", createdAt: "2026-04-23T00:00:00Z" }),
    });
    expect(recs[1].framework).toBe("Sandler");
    expect(recs[1].bodyHe).toContain("price was too high");
  });

  it("Challenger reframe for stale (>=7 days untouched) open lead", () => {
    const recs = generateLeadRecommendations({
      ...baseInput,
      lead: makeLead({ status: "meeting", createdAt: "2026-04-15T00:00:00Z" }),
      interactions: [],
    });
    expect(recs[1].framework).toBe("Challenger");
    expect(recs[1].titleEn).toMatch(/reframe/i);
  });

  it("Cialdini for proposal stage", () => {
    const recs = generateLeadRecommendations({
      ...baseInput,
      lead: makeLead({ status: "proposal", createdAt: "2026-04-23T00:00:00Z" }),
      interactions: [
        { id: "i", leadId: "x", userId: "u", type: "note", note: "talked", occurredAt: "2026-04-24T00:00:00Z" },
      ],
    });
    expect(recs[1].framework).toBe("Cialdini");
  });

  it("SPIN implication for new leads", () => {
    const recs = generateLeadRecommendations({
      ...baseInput,
      lead: makeLead({ status: "lead", createdAt: "2026-04-24T00:00:00Z" }),
      interactions: [
        { id: "i", leadId: "x", userId: "u", type: "note", note: "ping", occurredAt: "2026-04-24T00:00:00Z" },
      ],
    });
    expect(recs[1].framework).toBe("SPIN");
    expect(recs[1].titleEn).toMatch(/implication/i);
  });

  it("uses cohort median when crmInsights is meaningful", () => {
    const insights: CrmInsights = {
      meaningful: true,
      totalLeads: 20,
      closedCount: 12,
      lostCount: 8,
      openCount: 0,
      closeRate: 0.6,
      medianTimeToCloseMs: 5 * 24 * 60 * 60 * 1000,
      ltvActualNIS: 1000,
      openPipelineNIS: 0,
      winThemes: [],
      objectionThemes: [],
      sourceThemes: [],
      staleLeads: [],
    };
    const recs = generateLeadRecommendations({
      ...baseInput,
      crmInsights: insights,
      lead: makeLead({ status: "meeting", createdAt: "2026-04-23T00:00:00Z" }),
      interactions: [
        { id: "i", leadId: "x", userId: "u", type: "note", note: "ping", occurredAt: "2026-04-24T00:00:00Z" },
      ],
    });
    // meeting + recent touch + cohort median present → cohort hint
    expect(recs[1].bodyEn).toMatch(/5 days/);
  });
});

describe("leadCoachEngine — Leverage", () => {
  it("anchors on whyUs (Cialdini) when ≥8 chars", () => {
    const recs = generateLeadRecommendations({
      ...baseInput,
      lead: makeLead({ whyUs: "the team's reliability over 5 years was the deciding factor" }),
    });
    expect(recs[2].framework).toBe("Cialdini");
    expect(recs[2].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("preempts top objection (Sandler) when CRM is meaningful and whyUs is sparse", () => {
    const insights: CrmInsights = {
      meaningful: true,
      totalLeads: 20, closedCount: 5, lostCount: 15, openCount: 0,
      closeRate: 0.25, medianTimeToCloseMs: null, ltvActualNIS: 0, openPipelineNIS: 0,
      winThemes: [],
      objectionThemes: [{ id: "price", label: "price", count: 8, sampleNames: [] }],
      sourceThemes: [],
      staleLeads: [],
    };
    const recs = generateLeadRecommendations({
      ...baseInput, crmInsights: insights, lead: makeLead({ whyUs: "" }),
    });
    expect(recs[2].framework).toBe("Sandler");
    expect(recs[2].bodyEn).toMatch(/price/);
  });

  it("Hormozi reframe for high-value leads (≥1.2× cohort LTV)", () => {
    const insights: CrmInsights = {
      meaningful: true,
      totalLeads: 15, closedCount: 10, lostCount: 5, openCount: 0,
      closeRate: 0.66, medianTimeToCloseMs: null, ltvActualNIS: 1000, openPipelineNIS: 0,
      winThemes: [], objectionThemes: [], sourceThemes: [], staleLeads: [],
    };
    const hormozi = {
      overallScore: 72,
      offerGrade: "strong",
      dreamOutcomeScore: 80,
      perceivedLikelihoodScore: 70,
      timeDelayScore: 60,
      effortAndSacrificeScore: 70,
      improvements: [],
      recommendedActions: [],
    } as unknown as LeadCoachInput["hormozi"];
    const recs = generateLeadRecommendations({
      ...baseInput,
      hormozi,
      crmInsights: insights,
      lead: makeLead({ whyUs: "", valueNIS: 5000 }),
    });
    expect(recs[2].framework).toBe("Hormozi");
    expect(recs[2].bodyEn).toMatch(/72\/100/);
  });

  it("falls back to SPIN need-payoff when no qualitative signal", () => {
    const recs = generateLeadRecommendations({
      ...baseInput,
      lead: makeLead({ whyUs: "", lostReason: "" }),
    });
    expect(recs[2].framework).toBe("SPIN");
    expect(recs[2].confidence).toBeLessThan(0.7);
  });
});
