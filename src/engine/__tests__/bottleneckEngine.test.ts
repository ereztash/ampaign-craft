import { describe, it, expect } from "vitest";
import { detectBottlenecks } from "../bottleneckEngine";
import { generateFunnel } from "../funnelEngine";
import type { FormData } from "@/types/funnel";

const minimalForm: FormData = {
  businessField: "other",
  audienceType: "b2c",
  ageRange: [25, 45],
  interests: "test",
  productDescription: "A product that is long enough to pass validation checks here",
  averagePrice: 100,
  salesModel: "oneTime",
  budgetRange: "medium",
  mainGoal: "sales",
  existingChannels: ["facebook", "instagram"],
  experienceLevel: "beginner",
};

describe("detectBottlenecks", () => {
  it("flags no plan as critical", () => {
    const r = detectBottlenecks({
      funnelResult: null,
      hasDifferentiation: false,
      planCount: 0,
      connectedSources: 0,
      healthScoreTotal: null,
    });
    expect(r.some((b) => b.id === "no-plan" && b.severity === "critical")).toBe(true);
  });

  it("flags missing differentiation when plan exists", () => {
    const funnelResult = generateFunnel(minimalForm);
    const r = detectBottlenecks({
      funnelResult,
      hasDifferentiation: false,
      planCount: 1,
      connectedSources: 0,
      healthScoreTotal: 80,
    });
    expect(r.some((b) => b.id === "diff-missing")).toBe(true);
  });

  it("detects low channel count", () => {
    const fd = { ...minimalForm, existingChannels: ["facebook"] as FormData["existingChannels"] };
    const funnelResult = generateFunnel(fd);
    const r = detectBottlenecks({
      funnelResult,
      hasDifferentiation: true,
      planCount: 1,
      connectedSources: 1,
      healthScoreTotal: 80,
    });
    expect(r.some((b) => b.id === "mkt-channels")).toBe(true);
  });
});
