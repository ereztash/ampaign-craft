import { describe, it, expect, beforeEach } from "vitest";
import type { FormData, SavedPlan, FunnelResult } from "@/types/funnel";
import { useDerivedStore } from "../derivedStore";

// ── fixtures ──────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeSavedPlan(formData: FormData, name = "test-plan"): SavedPlan {
  const result = {
    id: name,
    formData,
    stages: [],
    kpis: [],
    hookTips: [],
    totalBudget: 0,
    copyLab: { formulas: [] },
  } as unknown as FunnelResult;
  return {
    id: name,
    name,
    savedAt: new Date().toISOString(),
    result,
  };
}

beforeEach(() => {
  useDerivedStore.getState().reset();
});

describe("derivedStore", () => {
  it("starts empty", () => {
    const s = useDerivedStore.getState();
    expect(s.formData).toBeNull();
    expect(s.latestPlan).toBeNull();
    expect(s.graph).toBeNull();
    expect(s.healthScore).toBeNull();
    expect(s.disc).toBeNull();
    expect(s.churnRisk).toBeNull();
    expect(s.cohort).toBeNull();
    expect(s.costOfInaction).toBeNull();
  });

  it("builds formData-scoped derivations when formData is provided", () => {
    const formData = makeFormData();
    useDerivedStore.getState().syncFromInputs(formData, null);

    const s = useDerivedStore.getState();
    expect(s.formData).toBe(formData);
    expect(s.graph).not.toBeNull();
    expect(s.disc).not.toBeNull();
    expect(s.churnRisk).not.toBeNull();
    // Plan-scoped derivations stay null without a plan.
    expect(s.healthScore).toBeNull();
    expect(s.costOfInaction).toBeNull();
    // Cohort requires both formData + disc — should exist.
    expect(s.cohort).not.toBeNull();
  });

  it("builds plan-scoped derivations when plan is provided", () => {
    const formData = makeFormData();
    const plan = makeSavedPlan(formData);
    useDerivedStore.getState().syncFromInputs(formData, plan);

    const s = useDerivedStore.getState();
    expect(s.healthScore).not.toBeNull();
    expect(s.costOfInaction).not.toBeNull();
  });

  it("is a no-op when inputs are identical by reference", () => {
    const formData = makeFormData();
    const plan = makeSavedPlan(formData);
    useDerivedStore.getState().syncFromInputs(formData, plan);

    const snapshotBefore = useDerivedStore.getState();
    const graphRefBefore = snapshotBefore.graph;
    const discRefBefore = snapshotBefore.disc;

    // Calling again with the exact same references must not recompute
    // (we verify by checking the output references survive).
    useDerivedStore.getState().syncFromInputs(formData, plan);

    const snapshotAfter = useDerivedStore.getState();
    expect(snapshotAfter.graph).toBe(graphRefBefore);
    expect(snapshotAfter.disc).toBe(discRefBefore);
  });

  it("rebuilds graph/disc when formData reference changes", () => {
    const plan = makeSavedPlan(makeFormData());
    useDerivedStore.getState().syncFromInputs(makeFormData(), plan);
    const graphRefBefore = useDerivedStore.getState().graph;

    // New reference, same-ish content → engines rerun and produce a new object.
    useDerivedStore.getState().syncFromInputs(makeFormData({ businessField: "finance" }), plan);
    const graphRefAfter = useDerivedStore.getState().graph;

    expect(graphRefAfter).not.toBe(graphRefBefore);
  });

  it("clears everything on reset", () => {
    useDerivedStore.getState().syncFromInputs(makeFormData(), makeSavedPlan(makeFormData()));
    useDerivedStore.getState().reset();

    const s = useDerivedStore.getState();
    expect(s.formData).toBeNull();
    expect(s.graph).toBeNull();
    expect(s.healthScore).toBeNull();
  });
});
