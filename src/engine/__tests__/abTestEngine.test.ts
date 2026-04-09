import { describe, it, expect } from "vitest";
import {
  assignVariant,
  createABExperiment,
  createMultiVariantExperiment,
  calculateExperimentResults,
  type ConversionRecord,
} from "../abTestEngine";

describe("abTestEngine", () => {
  describe("assignVariant", () => {
    it("assigns the same variant for the same user+experiment", () => {
      const experiment = createABExperiment("exp1", "Test");
      const v1 = assignVariant("user-123", experiment);
      const v2 = assignVariant("user-123", experiment);
      expect(v1.id).toBe(v2.id);
    });

    it("distributes users roughly 50/50 for equal weights", () => {
      const experiment = createABExperiment("exp-dist", "Distribution Test");
      const counts: Record<string, number> = {};

      for (let i = 0; i < 1000; i++) {
        const variant = assignVariant(`user-${i}`, experiment);
        counts[variant.id] = (counts[variant.id] || 0) + 1;
      }

      // Expect roughly 50/50 split (within 10% tolerance)
      const values = Object.values(counts);
      expect(values.length).toBe(2);
      for (const count of values) {
        expect(count).toBeGreaterThan(400);
        expect(count).toBeLessThan(600);
      }
    });

    it("different experiments give different assignments for some users", () => {
      const exp1 = createABExperiment("pricing-test-2026", "Pricing Test");
      const exp2 = createABExperiment("onboarding-flow-2026", "Onboarding Test");

      // With sufficiently different experiment IDs, some users should differ
      let differences = 0;
      for (let i = 0; i < 1000; i++) {
        const v1 = assignVariant(`user-${i}`, exp1);
        const v2 = assignVariant(`user-${i}`, exp2);
        if (v1.name !== v2.name) differences++;
      }
      // At least some users should get different variants across experiments
      expect(differences).toBeGreaterThan(0);
    });

    it("throws for experiment with no variants", () => {
      const experiment = {
        id: "empty",
        name: "Empty",
        variants: [],
        status: "draft" as const,
        createdAt: new Date().toISOString(),
      };
      expect(() => assignVariant("user-1", experiment)).toThrow("no variants");
    });
  });

  describe("createMultiVariantExperiment", () => {
    it("creates experiment with custom weights", () => {
      const exp = createMultiVariantExperiment("mv1", "Multi", [
        { name: "A", weight: 0.33 },
        { name: "B", weight: 0.33 },
        { name: "C", weight: 0.34 },
      ]);
      expect(exp.variants).toHaveLength(3);
      expect(exp.status).toBe("draft");
    });

    it("rejects weights that don't sum to 1", () => {
      expect(() =>
        createMultiVariantExperiment("bad", "Bad", [
          { name: "A", weight: 0.5 },
          { name: "B", weight: 0.3 },
        ])
      ).toThrow("sum to 1");
    });
  });

  describe("calculateExperimentResults", () => {
    it("calculates conversion rates correctly", () => {
      const experiment = createABExperiment("calc1", "Calc Test");
      const controlId = experiment.variants[0].id;
      const treatmentId = experiment.variants[1].id;

      const assignments = [
        ...Array.from({ length: 100 }, (_, i) => ({ userId: `u${i}`, variantId: controlId })),
        ...Array.from({ length: 100 }, (_, i) => ({ userId: `t${i}`, variantId: treatmentId })),
      ];

      const conversions: ConversionRecord[] = [
        // 10% conversion for control
        ...Array.from({ length: 10 }, (_, i) => ({
          userId: `u${i}`,
          experimentId: "calc1",
          variantId: controlId,
          metric: "purchase",
          value: 1,
          recordedAt: new Date().toISOString(),
        })),
        // 20% conversion for treatment
        ...Array.from({ length: 20 }, (_, i) => ({
          userId: `t${i}`,
          experimentId: "calc1",
          variantId: treatmentId,
          metric: "purchase",
          value: 1,
          recordedAt: new Date().toISOString(),
        })),
      ];

      const result = calculateExperimentResults(experiment, assignments, conversions);

      expect(result.totalParticipants).toBe(200);
      expect(result.variantResults[0].conversionRate).toBeCloseTo(0.1, 2);
      expect(result.variantResults[1].conversionRate).toBeCloseTo(0.2, 2);
      expect(result.lift).toBeGreaterThan(0);
    });

    it("handles zero participants gracefully", () => {
      const experiment = createABExperiment("empty1", "Empty");
      const result = calculateExperimentResults(experiment, [], []);
      expect(result.totalParticipants).toBe(0);
      expect(result.isSignificant).toBe(false);
      expect(result.pValue).toBe(1);
    });

    it("detects significant results with large sample and clear difference", () => {
      const experiment = createABExperiment("sig1", "Significance Test");
      const controlId = experiment.variants[0].id;
      const treatmentId = experiment.variants[1].id;

      const assignments = [
        ...Array.from({ length: 500 }, (_, i) => ({ userId: `c${i}`, variantId: controlId })),
        ...Array.from({ length: 500 }, (_, i) => ({ userId: `t${i}`, variantId: treatmentId })),
      ];

      const conversions: ConversionRecord[] = [
        // 5% control
        ...Array.from({ length: 25 }, (_, i) => ({
          userId: `c${i}`,
          experimentId: "sig1",
          variantId: controlId,
          metric: "signup",
          value: 1,
          recordedAt: new Date().toISOString(),
        })),
        // 15% treatment
        ...Array.from({ length: 75 }, (_, i) => ({
          userId: `t${i}`,
          experimentId: "sig1",
          variantId: treatmentId,
          metric: "signup",
          value: 1,
          recordedAt: new Date().toISOString(),
        })),
      ];

      const result = calculateExperimentResults(experiment, assignments, conversions);
      expect(result.isSignificant).toBe(true);
      expect(result.pValue).toBeLessThan(0.05);
      expect(result.winningVariantId).toBe(treatmentId);
    });
  });
});
