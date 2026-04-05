import { describe, it, expect } from "vitest";
import { getTabConfig } from "../adaptiveTabRules";
import { FunnelResult, FormData } from "@/types/funnel";
import { UserProfile } from "@/contexts/UserProfileContext";

function makeResult(overrides: Partial<FormData> = {}): FunnelResult {
  const formData: FormData = {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "",
    productDescription: "",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: [],
    experienceLevel: "intermediate",
    ...overrides,
  };
  return {
    id: "test",
    funnelName: { he: "test", en: "test" },
    stages: [],
    totalBudget: { min: 0, max: 0 },
    overallTips: [],
    hookTips: [],
    copyLab: { readerProfile: {} as any, formulas: [], writingTechniques: [] },
    kpis: [],
    createdAt: "",
    formData,
    neuroStorytelling: { vectors: [], promptTemplates: [], entropyGuide: {} as any, axiom: { he: "", en: "" } },
  };
}

const defaultProfile: UserProfile = {
  isReturningUser: false,
  visitCount: 1,
  savedPlanCount: 0,
  userSegment: "new-beginner",
  lastPlanSummary: null,
  isMobile: false,
  lastVisitDate: null,
  lastFormData: null,
  currentFormData: null,
  experienceLevel: "",
  prefersReducedMotion: false,
  achievements: [],
};

describe("getTabConfig", () => {
  it("returns 8 tabs for subscription tech (includes pricing + retention)", () => {
    const tabs = getTabConfig(makeResult(), defaultProfile);
    expect(tabs).toHaveLength(8);
    const ids = tabs.map((t) => t.id);
    expect(ids).toContain("strategy");
    expect(ids).toContain("planning");
    expect(ids).toContain("content");
    expect(ids).toContain("analytics");
    expect(ids).toContain("sales");
    expect(ids).toContain("pricing");
    expect(ids).toContain("retention");
    expect(ids).toContain("stylome");
  });

  it("returns 8 tabs when branddna conditions not met (tech field)", () => {
    const tabs = getTabConfig(makeResult({ businessField: "tech" }), defaultProfile);
    const ids = tabs.map((t) => t.id);
    expect(ids).not.toContain("branddna");
    expect(tabs).toHaveLength(8);
  });

  it("includes branddna for personalBrand", () => {
    const tabs = getTabConfig(makeResult({ businessField: "personalBrand" }), defaultProfile);
    const ids = tabs.map((t) => t.id);
    expect(ids).toContain("branddna");
    expect(tabs).toHaveLength(9);
  });

  it("includes branddna for services", () => {
    const tabs = getTabConfig(makeResult({ businessField: "services" }), defaultProfile);
    const ids = tabs.map((t) => t.id);
    expect(ids).toContain("branddna");
  });

  it("beginner gets simplifiedMode on content, analytics, stylome", () => {
    const tabs = getTabConfig(makeResult({ experienceLevel: "beginner" }), defaultProfile);
    const content = tabs.find((t) => t.id === "content");
    const analytics = tabs.find((t) => t.id === "analytics");
    const stylome = tabs.find((t) => t.id === "stylome");
    expect(content?.simplifiedMode).toBe(true);
    expect(analytics?.simplifiedMode).toBe(true);
    expect(stylome?.simplifiedMode).toBe(true);
  });

  it("advanced gets no simplifiedMode", () => {
    const tabs = getTabConfig(makeResult({ experienceLevel: "advanced" }), defaultProfile);
    const simplified = tabs.filter((t) => t.simplifiedMode);
    expect(simplified).toHaveLength(0);
  });

  it("strategy is always first", () => {
    const tabs = getTabConfig(makeResult(), defaultProfile);
    expect(tabs[0].id).toBe("strategy");
  });

  it("all tabs have required properties", () => {
    const tabs = getTabConfig(makeResult(), defaultProfile);
    for (const tab of tabs) {
      expect(tab.id).toBeTruthy();
      expect(tab.labelKey).toBeTruthy();
      expect(typeof tab.visible).toBe("boolean");
      expect(typeof tab.priority).toBe("number");
    }
  });

  it("sales tab gets New! badge when goal is sales", () => {
    const tabs = getTabConfig(makeResult({ mainGoal: "sales" }), defaultProfile);
    const sales = tabs.find((t) => t.id === "sales");
    expect(sales).toBeDefined();
    expect(sales?.badge?.en).toBe("New!");
  });

  it("sales tab is promoted (priority ≤ 15) when goal is sales/leads", () => {
    for (const mainGoal of ["sales", "leads"] as const) {
      const tabs = getTabConfig(makeResult({ mainGoal }), defaultProfile);
      const sales = tabs.find((t) => t.id === "sales");
      expect(sales!.priority).toBeLessThanOrEqual(15);
    }
  });

  it("sales goal gives planning tab Key badge", () => {
    const tabs = getTabConfig(makeResult({ mainGoal: "sales" }), defaultProfile);
    const planning = tabs.find((t) => t.id === "planning");
    expect(planning?.badge?.en).toBe("Key");
  });

  it("advanced user gets analytics Key badge", () => {
    const tabs = getTabConfig(makeResult({ experienceLevel: "advanced" }), defaultProfile);
    const analytics = tabs.find((t) => t.id === "analytics");
    expect(analytics?.badge?.en).toBe("Key");
  });
});
