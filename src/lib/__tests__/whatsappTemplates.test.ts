import { describe, it, expect } from "vitest";
import { getWhatsAppTemplates, getWhatsAppCostEstimate } from "../whatsappTemplates";

describe("whatsappTemplates", () => {
  it("returns exactly 6 templates", () => {
    expect(getWhatsAppTemplates()).toHaveLength(6);
  });

  it("each template has required fields", () => {
    for (const tmpl of getWhatsAppTemplates()) {
      expect(tmpl.stage).toBeTruthy();
      expect(tmpl.stageName.he).toBeTruthy();
      expect(tmpl.stageName.en).toBeTruthy();
      expect(tmpl.template.he).toBeTruthy();
      expect(tmpl.template.en).toBeTruthy();
      expect(tmpl.timing.he).toBeTruthy();
      expect(tmpl.timing.en).toBeTruthy();
      expect(tmpl.emoji).toBeTruthy();
    }
  });

  it("templates cover the full funnel", () => {
    const stages = getWhatsAppTemplates().map((t) => t.stage);
    expect(stages).toContain("welcome");
    expect(stages).toContain("offer");
    expect(stages).toContain("referral");
  });
});

describe("getWhatsAppCostEstimate", () => {
  it("returns bilingual cost strings", () => {
    const cost = getWhatsAppCostEstimate(500);
    expect(cost.total.he).toContain("₪");
    expect(cost.total.en).toContain("$");
    expect(cost.marketing.he).toContain("₪");
  });

  it("higher volume = higher cost", () => {
    const low = getWhatsAppCostEstimate(100);
    const high = getWhatsAppCostEstimate(1000);
    const lowNum = parseInt(low.total.en.replace(/\D/g, ""));
    const highNum = parseInt(high.total.en.replace(/\D/g, ""));
    expect(highNum).toBeGreaterThan(lowNum);
  });
});
