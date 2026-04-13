import { describe, it, expect } from "vitest";
import { buildChurnPlaybook } from "../churnPlaybookEngine";
import { buildUserKnowledgeGraph } from "../userKnowledgeGraph";
import { FormData } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2b",
    ageRange: [25, 45],
    interests: "software",
    productDescription: "SaaS analytics platform",
    averagePrice: 299,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "email"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

describe("buildChurnPlaybook", () => {
  it("returns a complete playbook with all required fields", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    expect(playbook.riskTier).toBeDefined();
    expect(playbook.riskScore).toBeDefined();
    expect(playbook.riskTierLabel).toBeDefined();
    expect(playbook.nrrBaseline).toBeDefined();
    expect(playbook.nrrTarget).toBeDefined();
    expect(playbook.weeklyActions).toBeDefined();
    expect(playbook.nudgeSchedule).toBeDefined();
    expect(playbook.leadingIndicators).toBeDefined();
    expect(playbook.phase6090).toBeDefined();
    expect(playbook.quickWin).toBeDefined();
  });

  it("always has exactly 4 weekly actions (weeks 1-4)", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    expect(playbook.weeklyActions).toHaveLength(4);
    expect(playbook.weeklyActions[0].week).toBe(1);
    expect(playbook.weeklyActions[1].week).toBe(2);
    expect(playbook.weeklyActions[2].week).toBe(3);
    expect(playbook.weeklyActions[3].week).toBe(4);
  });

  it("always has exactly 2 phases (60d and 90d)", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    expect(playbook.phase6090).toHaveLength(2);
  });

  it("each weekly action has bilingual text and template", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    for (const action of playbook.weeklyActions) {
      expect(action.weekLabel.he).toBeTruthy();
      expect(action.weekLabel.en).toBeTruthy();
      expect(action.focus.he).toBeTruthy();
      expect(action.focus.en).toBeTruthy();
      expect(action.template.he).toBeTruthy();
      expect(action.template.en).toBeTruthy();
      expect(action.actions.length).toBeGreaterThan(0);
    }
  });

  it("nudge schedule has events ordered by triggerDays ascending", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    for (let i = 0; i < playbook.nudgeSchedule.length - 1; i++) {
      expect(playbook.nudgeSchedule[i].triggerDays).toBeLessThanOrEqual(playbook.nudgeSchedule[i + 1].triggerDays);
    }
  });

  it("subscription model includes MRR churn indicator", () => {
    const formData = makeFormData({ salesModel: "subscription" });
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    const hasMRR = playbook.leadingIndicators.some(
      (ind) => ind.name.en.toLowerCase().includes("mrr")
    );
    expect(hasMRR).toBe(true);
  });

  it("b2b includes account health indicator", () => {
    const formData = makeFormData({ audienceType: "b2b" });
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    const hasAccountHealth = playbook.leadingIndicators.some(
      (ind) => ind.name.en.toLowerCase().includes("account")
    );
    expect(hasAccountHealth).toBe(true);
  });

  it("riskTierLabel is bilingual", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    expect(playbook.riskTierLabel.he).toBeTruthy();
    expect(playbook.riskTierLabel.en).toBeTruthy();
  });

  it("quickWin is bilingual", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    expect(playbook.quickWin.he).toBeTruthy();
    expect(playbook.quickWin.en).toBeTruthy();
  });

  it("nrrTarget is >= nrrBaseline", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    expect(playbook.nrrTarget).toBeGreaterThanOrEqual(playbook.nrrBaseline);
  });

  it("phases have bilingual labels and objectives", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    for (const phase of playbook.phase6090) {
      expect(phase.label.he).toBeTruthy();
      expect(phase.label.en).toBeTruthy();
      expect(phase.objective.he).toBeTruthy();
      expect(phase.objective.en).toBeTruthy();
      expect(phase.keyActions.length).toBeGreaterThan(0);
    }
  });

  it("leading indicators have check frequency", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const playbook = buildChurnPlaybook(formData, ukg);

    const validFreqs = new Set(["daily", "weekly", "monthly"]);
    for (const indicator of playbook.leadingIndicators) {
      expect(validFreqs.has(indicator.checkFrequency)).toBe(true);
    }
  });

  // Smoke test across sales models
  const salesModels: FormData["salesModel"][] = ["oneTime", "subscription", "leads"];
  salesModels.forEach((model) => {
    it(`generates valid playbook for salesModel=${model}`, () => {
      const formData = makeFormData({ salesModel: model });
      const ukg = buildUserKnowledgeGraph(formData);
      const playbook = buildChurnPlaybook(formData, ukg);

      expect(playbook.weeklyActions).toHaveLength(4);
      expect(playbook.riskTier).toBeDefined();
    });
  });

  // Smoke test across business fields
  const fields: FormData["businessField"][] = [
    "fashion", "tech", "food", "services", "education", "health",
  ];
  fields.forEach((field) => {
    it(`generates valid playbook for ${field}`, () => {
      const formData = makeFormData({ businessField: field });
      const ukg = buildUserKnowledgeGraph(formData);
      const playbook = buildChurnPlaybook(formData, ukg);

      expect(playbook.riskScore).toBeGreaterThanOrEqual(0);
      expect(playbook.riskScore).toBeLessThanOrEqual(100);
    });
  });
});
