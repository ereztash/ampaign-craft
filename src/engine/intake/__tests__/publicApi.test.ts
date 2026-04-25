// ═══════════════════════════════════════════════
// Tests for the Phase-4 engines-API seam.
//
// Activates the gate via stubbing import.meta.env, calls classifyLead
// with a few representative inputs, asserts shape stability and
// correct routing pass-through.
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { FormData } from "@/types/funnel";

const sampleFormData: FormData = {
  businessField: "tech",
  audienceType: "b2b",
  ageRange: [30, 50],
  interests: "growth",
  productDescription: "B2B SaaS",
  averagePrice: 500,
  salesModel: "saas",
  budgetRange: "medium",
  mainGoal: "leads",
  existingChannels: ["email"],
  experienceLevel: "intermediate",
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("publicApi (engines-API seam)", () => {
  it("isEnginesApiEnabled — false by default (no env var)", async () => {
    vi.stubEnv("VITE_ENGINES_API_ENABLED", "");
    const { isEnginesApiEnabled } = await import("../publicApi");
    expect(isEnginesApiEnabled()).toBe(false);
  });

  it("isEnginesApiEnabled — true when flag set", async () => {
    vi.stubEnv("VITE_ENGINES_API_ENABLED", "true");
    const { isEnginesApiEnabled } = await import("../publicApi");
    expect(isEnginesApiEnabled()).toBe(true);
  });

  it("classifyLead throws when gate is closed", async () => {
    vi.stubEnv("VITE_ENGINES_API_ENABLED", "");
    const { classifyLead } = await import("../publicApi");
    expect(() => classifyLead({ need: "time", pain: "product" })).toThrow();
  });

  it("classifyLead returns routing + apiVersion when gate is open, no formData", async () => {
    vi.stubEnv("VITE_ENGINES_API_ENABLED", "true");
    const { classifyLead } = await import("../publicApi");
    const out = classifyLead({ need: "time", pain: "product" });
    expect(out.apiVersion).toBe("1.0");
    expect(out.routing.target).toBe("/differentiate");
    expect(out.archetype).toBeUndefined();
    expect(out.discPrimary).toBeUndefined();
    expect(typeof out.classifiedAt).toBe("string");
  });

  it("classifyLead enriches with archetype + DISC when formData provided", async () => {
    vi.stubEnv("VITE_ENGINES_API_ENABLED", "true");
    const { classifyLead } = await import("../publicApi");
    const out = classifyLead({
      need: "money",
      pain: "sales",
      formData: sampleFormData,
    });
    expect(out.routing.target).toBe("/sales");
    expect(out.archetype).toBeTruthy();
    expect(["D", "I", "S", "C"]).toContain(out.discPrimary);
  });

  it("classifyLead echoes externalRefId unchanged", async () => {
    vi.stubEnv("VITE_ENGINES_API_ENABLED", "true");
    const { classifyLead } = await import("../publicApi");
    const out = classifyLead({
      need: "attention",
      pain: "marketing",
      externalRefId: "ext-12345",
    });
    expect(out.externalRefId).toBe("ext-12345");
  });

  it("classifyLead never throws on missing FormData fields (graceful)", async () => {
    vi.stubEnv("VITE_ENGINES_API_ENABLED", "true");
    const { classifyLead } = await import("../publicApi");
    const incomplete = { ...sampleFormData, existingChannels: undefined as unknown as FormData["existingChannels"] };
    // Should not throw — internal try/catch keeps optional fields optional
    expect(() => classifyLead({ need: "time", pain: "finance", formData: incomplete })).not.toThrow();
  });
});
