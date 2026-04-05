import { describe, it, expect } from "vitest";
import { getSocialProof, getTotalUsers } from "../socialProofData";

const FIELDS = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"];

describe("socialProofData", () => {
  FIELDS.forEach((field) => {
    it(`returns data for "${field}"`, () => {
      const proof = getSocialProof(field);
      expect(proof.usersCount).toBeGreaterThan(0);
      expect(proof.topMetric.he).toBeTruthy();
      expect(proof.topMetric.en).toBeTruthy();
      expect(proof.topMetricValue).toBeTruthy();
    });
  });

  it("unknown field falls back to other", () => {
    const unknown = getSocialProof("nonexistent");
    const other = getSocialProof("other");
    expect(unknown).toEqual(other);
  });

  it("getTotalUsers returns positive number", () => {
    expect(getTotalUsers()).toBeGreaterThan(0);
  });

  it("getTotalUsers equals sum of all industries", () => {
    const total = FIELDS.reduce((sum, f) => sum + getSocialProof(f).usersCount, 0);
    expect(getTotalUsers()).toBe(total);
  });
});
