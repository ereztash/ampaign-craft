import { describe, it, expect } from "vitest";
import { DEFAULT_CIRCUIT_BREAKER, DEFAULT_COST_CAP_NIS } from "../agentTypes";

describe("agentTypes constants", () => {
  describe("DEFAULT_CIRCUIT_BREAKER", () => {
    it("maxIterations is 5", () => {
      expect(DEFAULT_CIRCUIT_BREAKER.maxIterations).toBe(5);
    });

    it("minConfidence is 0.8", () => {
      expect(DEFAULT_CIRCUIT_BREAKER.minConfidence).toBe(0.8);
    });

    it("consecutiveFailures is 3", () => {
      expect(DEFAULT_CIRCUIT_BREAKER.consecutiveFailures).toBe(3);
    });

    it("cooldownMs is 5000", () => {
      expect(DEFAULT_CIRCUIT_BREAKER.cooldownMs).toBe(5000);
    });
  });

  it("DEFAULT_COST_CAP_NIS is 10", () => {
    expect(DEFAULT_COST_CAP_NIS).toBe(10);
  });
});
