// ═══════════════════════════════════════════════
// Tests for Phase 3 feedback loop: promise verification + behavior
// mismatch detection. The data-collection layer is always-on (gated
// only at the UI), so these tests target it as plain TypeScript.
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setIntakeSignal, clearIntakeSignal } from "../intakeSignal";
import {
  recordRouteVisit,
  recordFirstOutput,
  getTelemetry,
  clearTelemetry,
  verifyPromise,
  detectBehaviorMismatch,
} from "../feedbackLoop";

beforeEach(() => {
  localStorage.clear();
});

describe("feedbackLoop telemetry", () => {
  it("does nothing when no intake signal exists", () => {
    recordRouteVisit("/sales");
    recordFirstOutput("sales");
    expect(getTelemetry()).toBeNull();
  });

  it("initializes telemetry when intake completes", () => {
    setIntakeSignal("time", "sales");
    const t = getTelemetry();
    expect(t).not.toBeNull();
    expect(t?.events).toEqual([]);
  });

  it("records route visits in order", () => {
    setIntakeSignal("time", "sales");
    recordRouteVisit("/sales");
    recordRouteVisit("/differentiate");
    const t = getTelemetry();
    expect(t?.events.length).toBe(2);
    expect(t?.events[0].kind).toBe("route_visited");
    expect(t?.events[0].payload).toBe("/sales");
  });

  it("records first output only once even if called multiple times", () => {
    setIntakeSignal("money", "product");
    recordFirstOutput("differentiate");
    recordFirstOutput("differentiate"); // second call
    const t = getTelemetry();
    const outputs = t?.events.filter((e) => e.kind === "first_output_saved") ?? [];
    expect(outputs.length).toBe(1);
  });

  it("caps events at 100 to stay in localStorage budget", () => {
    setIntakeSignal("attention", "marketing");
    for (let i = 0; i < 150; i++) recordRouteVisit(`/route-${i}`);
    const t = getTelemetry();
    expect(t?.events.length).toBe(100);
    // Most recent kept
    expect(t?.events[t.events.length - 1].payload).toBe("/route-149");
  });

  it("clearTelemetry wipes the store", () => {
    setIntakeSignal("time", "product");
    recordRouteVisit("/differentiate");
    clearTelemetry();
    expect(getTelemetry()).toBeNull();
  });
});

describe("feedbackLoop.verifyPromise", () => {
  it("returns null when no signal", () => {
    expect(verifyPromise()).toBeNull();
  });

  it("returns null when no first output recorded", () => {
    setIntakeSignal("time", "product");
    recordRouteVisit("/differentiate"); // not an output
    expect(verifyPromise()).toBeNull();
  });

  it("flags promise as held when output came before expectedMinutes", () => {
    // time × product => 10 min budget
    const now = new Date();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    setIntakeSignal("time", "product");

    // Advance 5 minutes — within budget
    vi.setSystemTime(new Date(now.getTime() + 5 * 60_000));
    recordFirstOutput("differentiate");

    const v = verifyPromise();
    expect(v).not.toBeNull();
    expect(v?.promiseHeld).toBe(true);
    expect(v?.actualMinutes).toBeLessThanOrEqual(10);
    vi.useRealTimers();
  });

  it("flags promise as broken when output exceeded expectedMinutes", () => {
    const now = new Date();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    setIntakeSignal("time", "product"); // 10 min budget

    vi.setSystemTime(new Date(now.getTime() + 25 * 60_000));
    recordFirstOutput("differentiate");

    const v = verifyPromise();
    expect(v?.promiseHeld).toBe(false);
    expect(v?.actualMinutes).toBeGreaterThan(10);
    vi.useRealTimers();
  });
});

describe("feedbackLoop.detectBehaviorMismatch", () => {
  it("returns null when fewer than 3 visits recorded", () => {
    setIntakeSignal("time", "sales");
    recordRouteVisit("/differentiate");
    recordRouteVisit("/differentiate");
    expect(detectBehaviorMismatch()).toBeNull();
  });

  it("flags mismatch when most visits are off-route", () => {
    setIntakeSignal("time", "sales"); // routes to /sales
    recordRouteVisit("/differentiate");
    recordRouteVisit("/differentiate");
    recordRouteVisit("/differentiate");
    recordRouteVisit("/sales");
    const m = detectBehaviorMismatch();
    expect(m?.mismatched).toBe(true);
    expect(m?.statedTarget).toBe("/sales");
    expect(m?.observedTarget).toBe("/differentiate");
  });

  it("does not flag mismatch when behavior aligns with routing", () => {
    setIntakeSignal("time", "sales");
    recordRouteVisit("/sales");
    recordRouteVisit("/sales");
    recordRouteVisit("/sales");
    const m = detectBehaviorMismatch();
    expect(m?.mismatched).toBe(false);
  });

  it("returns null with no signal", () => {
    expect(detectBehaviorMismatch()).toBeNull();
  });
});
