import { describe, it, expect } from "vitest";
import { getCurrentEvents, getUpcomingEvents, getEventsForField, getSeasonalBudgetMultiplier } from "../israeliMarketCalendar";

describe("israeliMarketCalendar", () => {
  it("getCurrentEvents returns events for specific month", () => {
    const events = getCurrentEvents(11); // November = Black Friday
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.id === "black_friday_il")).toBe(true);
  });

  it("getUpcomingEvents returns 3 months of events", () => {
    const events = getUpcomingEvents(9); // September
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("getEventsForField filters by industry", () => {
    const fashionEvents = getEventsForField("fashion", 11);
    expect(fashionEvents.some((e) => e.id === "black_friday_il")).toBe(true);
  });

  it("all events have required fields", () => {
    for (let month = 1; month <= 12; month++) {
      for (const event of getCurrentEvents(month)) {
        expect(event.name.he).toBeTruthy();
        expect(event.name.en).toBeTruthy();
        expect(event.impact.he).toBeTruthy();
        expect(event.recommendation.he).toBeTruthy();
        expect(event.budgetMultiplier).toBeGreaterThan(0);
        expect(event.emoji).toBeTruthy();
      }
    }
  });

  it("getSeasonalBudgetMultiplier returns multiplier", () => {
    const result = getSeasonalBudgetMultiplier("fashion", 11);
    expect(result.multiplier).toBeGreaterThan(1);
  });

  it("normal months return 1.0 multiplier", () => {
    const result = getSeasonalBudgetMultiplier("tech", 6); // June — no major events
    expect(result.multiplier).toBe(1.0);
  });

  it("pesach affects all industries", () => {
    const events = getCurrentEvents(4);
    const pesach = events.find((e) => e.id === "pesach");
    expect(pesach?.affectedIndustries).toContain("all");
  });
});
