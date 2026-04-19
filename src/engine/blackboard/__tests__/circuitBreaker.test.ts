import { describe, it, expect, vi, beforeEach } from "vitest";
import { CircuitBreaker } from "../circuitBreaker";

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker({ maxIterations: 5, minConfidence: 0.8, consecutiveFailures: 3, cooldownMs: 1000 });
  });

  it("starts in closed state and allows continuation", () => {
    expect(cb.canContinue()).toBe(true);
    expect(cb.getSnapshot().state).toBe("closed");
  });

  it("records successes and increments iteration count", () => {
    cb.recordSuccess(0.9);
    cb.recordSuccess(0.95);
    expect(cb.getSnapshot().iteration).toBe(2);
    expect(cb.getSnapshot().consecutiveFailures).toBe(0);
  });

  it("resets consecutive failures after a success", () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess(0.9);
    expect(cb.getSnapshot().consecutiveFailures).toBe(0);
  });

  it("trips open after maxIterations", () => {
    for (let i = 0; i < 5; i++) cb.recordSuccess(0.9);
    expect(cb.getSnapshot().state).toBe("open");
    expect(cb.canContinue()).toBe(false);
    expect(cb.getSnapshot().trippedReason).toMatch(/Max iterations/);
  });

  it("trips open after consecutiveFailures threshold", () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getSnapshot().state).toBe("open");
    expect(cb.getSnapshot().trippedReason).toMatch(/consecutive failures/);
  });

  it("trips open after consecutive low-confidence results", () => {
    cb.recordSuccess(0.1);
    cb.recordSuccess(0.1);
    cb.recordSuccess(0.1);
    expect(cb.getSnapshot().state).toBe("open");
    expect(cb.getSnapshot().trippedReason).toMatch(/low-confidence/);
  });

  it("trips open when session cost exceeds cap", () => {
    const expensive = new CircuitBreaker({}, 5);
    expensive.recordSuccess(0.9, 6);
    expect(expensive.getSnapshot().state).toBe("open");
    expect(expensive.getSnapshot().trippedReason).toMatch(/cost/);
  });

  it("transitions to half-open after cooldown", async () => {
    const fast = new CircuitBreaker({ maxIterations: 1, cooldownMs: 10 });
    fast.recordSuccess(0.9);
    expect(fast.canContinue()).toBe(false);
    await new Promise((r) => setTimeout(r, 15));
    expect(fast.canContinue()).toBe(true);
    expect(fast.getSnapshot().state).toBe("half-open");
  });

  it("closes circuit after successful half-open attempt", async () => {
    // Trip via consecutive failures (not maxIterations) so recovery doesn't re-trip
    const fast = new CircuitBreaker({ maxIterations: 100, consecutiveFailures: 1, cooldownMs: 10 });
    fast.recordFailure("first");
    expect(fast.getSnapshot().state).toBe("open");
    await new Promise((r) => setTimeout(r, 15));
    fast.canContinue(); // → half-open
    fast.recordSuccess(0.9);
    expect(fast.getSnapshot().state).toBe("closed");
  });

  it("re-opens from half-open on failure", async () => {
    const fast = new CircuitBreaker({ maxIterations: 100, consecutiveFailures: 1, cooldownMs: 10 });
    fast.recordFailure("first");
    await new Promise((r) => setTimeout(r, 15));
    fast.canContinue(); // → half-open
    fast.recordFailure("still broken");
    expect(fast.getSnapshot().state).toBe("open");
  });

  it("reset restores closed state", () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    cb.reset();
    expect(cb.getSnapshot().state).toBe("closed");
    expect(cb.getSnapshot().iteration).toBe(0);
    expect(cb.getSnapshot().sessionCostNIS).toBe(0);
    expect(cb.canContinue()).toBe(true);
  });

  it("accumulates session cost across calls", () => {
    cb.recordSuccess(0.9, 1.5);
    cb.recordSuccess(0.9, 2.0);
    expect(cb.getSnapshot().sessionCostNIS).toBeCloseTo(3.5);
  });
});
