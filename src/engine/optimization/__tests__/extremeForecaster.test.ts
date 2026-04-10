import { describe, it, expect } from "vitest";
import { forecastCollapse, type ForecastInput } from "../extremeForecaster";

// ───────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────

describe("forecastCollapse", () => {
  it("clear: all signals below their thresholds", () => {
    const input: ForecastInput = {
      velocity: 1.0,
      fatigue: 0.1,
      cost_escalation: 1.0,
      history_volatility: 0.1,
    };
    const out = forecastCollapse(input);
    expect(out.signal).toBe("clear");
    expect(out.collapse_probability).toBeLessThan(0.3);
    expect(out.drivers).toEqual([]);
    expect(out.horizon_days).toBe(3);
  });

  it("watch: one mild-band signal crosses into the watch band", () => {
    const input: ForecastInput = {
      velocity: 1.5, // mild (T1 <= v < T2)
      fatigue: 0.1,
      cost_escalation: 1.0,
      history_volatility: 0.1,
    };
    const out = forecastCollapse(input);
    expect(out.signal).toBe("watch");
    expect(out.collapse_probability).toBeGreaterThanOrEqual(0.3);
    expect(out.collapse_probability).toBeLessThan(0.6);
    expect(out.drivers.length).toBeGreaterThanOrEqual(1);
  });

  it("act via velocity: a strong velocity signal alone reaches act", () => {
    const input: ForecastInput = {
      velocity: 2.5, // strong
      fatigue: 0.1,
      cost_escalation: 1.0,
      history_volatility: 0.1,
    };
    const out = forecastCollapse(input);
    expect(out.signal).toBe("act");
    expect(out.collapse_probability).toBeGreaterThanOrEqual(0.6);
    expect(out.drivers[0]).toContain("הוצאה");
  });

  it("act via fatigue: a strong fatigue signal alone reaches act", () => {
    const input: ForecastInput = {
      velocity: 1.0,
      fatigue: 0.7, // strong
      cost_escalation: 1.0,
      history_volatility: 0.1,
    };
    const out = forecastCollapse(input);
    expect(out.signal).toBe("act");
    expect(out.drivers[0]).toContain("שחיקת");
  });

  it("act via cost_escalation: a strong cost signal alone reaches act", () => {
    const input: ForecastInput = {
      velocity: 1.0,
      fatigue: 0.1,
      cost_escalation: 1.6, // strong
      history_volatility: 0.1,
    };
    const out = forecastCollapse(input);
    expect(out.signal).toBe("act");
    expect(out.drivers[0]).toContain("עלות");
  });

  it("multi-signal compound: two mild signals together reach act", () => {
    const input: ForecastInput = {
      velocity: 1.5, // mild
      fatigue: 0.45, // mild
      cost_escalation: 1.0,
      history_volatility: 0.5, // amplifier active
    };
    const out = forecastCollapse(input);
    expect(out.signal).toBe("act");
    expect(out.drivers.length).toBeGreaterThanOrEqual(2);
    // Amplifier driver should appear when volatility is high and signals fired.
    expect(out.drivers).toContain("תנודתיות היסטורית גבוהה");
  });
});
