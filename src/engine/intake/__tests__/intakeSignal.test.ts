// ═══════════════════════════════════════════════
// Tests for IntakeSignal persistence (read/write/clear/has).
// Uses jsdom localStorage; no Supabase mocking needed.
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import {
  getIntakeSignal,
  setIntakeSignal,
  clearIntakeSignal,
  hasCompletedIntake,
} from "../intakeSignal";

beforeEach(() => {
  localStorage.clear();
});

describe("intakeSignal persistence", () => {
  it("getIntakeSignal returns null when none stored", () => {
    expect(getIntakeSignal()).toBeNull();
    expect(hasCompletedIntake()).toBe(false);
  });

  it("setIntakeSignal stores and getIntakeSignal reads back the same value", () => {
    const sig = setIntakeSignal("time", "product");
    expect(sig.need).toBe("time");
    expect(sig.pain).toBe("product");
    expect(sig.routing.target).toBe("/differentiate");
    expect(sig.completedAt).toBeTruthy();

    const read = getIntakeSignal();
    expect(read).not.toBeNull();
    expect(read?.need).toBe("time");
    expect(read?.pain).toBe("product");
    expect(read?.routing.target).toBe("/differentiate");
  });

  it("hasCompletedIntake reflects stored state", () => {
    expect(hasCompletedIntake()).toBe(false);
    setIntakeSignal("money", "sales");
    expect(hasCompletedIntake()).toBe(true);
  });

  it("clearIntakeSignal removes the stored signal", () => {
    setIntakeSignal("attention", "marketing");
    expect(hasCompletedIntake()).toBe(true);
    clearIntakeSignal();
    expect(hasCompletedIntake()).toBe(false);
    expect(getIntakeSignal()).toBeNull();
  });

  it("re-take overwrites previous signal", () => {
    setIntakeSignal("time", "product");
    const second = setIntakeSignal("money", "finance");
    const read = getIntakeSignal();
    expect(read?.need).toBe("money");
    expect(read?.pain).toBe("finance");
    expect(read?.completedAt).toBe(second.completedAt);
  });

  it("survives malformed JSON gracefully — falls back to null", () => {
    localStorage.setItem("funnelforge-intake-signal", "{not valid json");
    expect(getIntakeSignal()).toBeNull();
    expect(hasCompletedIntake()).toBe(false);
  });
});
