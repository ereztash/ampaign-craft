import { describe, it, expect } from "vitest";
import { getHebrewCopyRules, scoreHebrewCopy } from "../hebrewCopyOptimizer";

describe("getHebrewCopyRules", () => {
  it("returns at least 7 rules", () => {
    expect(getHebrewCopyRules().length).toBeGreaterThanOrEqual(7);
  });

  it("each rule has bilingual content", () => {
    for (const rule of getHebrewCopyRules()) {
      expect(rule.name.he).toBeTruthy();
      expect(rule.name.en).toBeTruthy();
      expect(rule.description.he).toBeTruthy();
      expect(rule.example.he).toBeTruthy();
      expect(rule.emoji).toBeTruthy();
    }
  });
});

describe("scoreHebrewCopy", () => {
  it("good Hebrew copy scores high", () => {
    const result = scoreHebrewCopy("הצטרפו ל-2,400 עסקים ישראליים שכבר חוסכים ₪5,000 בחודש. התחילו עכשיו — נשארו 12 מקומות.");
    expect(result.total).toBeGreaterThanOrEqual(60);
  });

  it("minimal text scores lower", () => {
    const result = scoreHebrewCopy("שלום");
    expect(result.total).toBeLessThan(70);
  });

  it("returns breakdown with tips", () => {
    const result = scoreHebrewCopy("טקסט לדוגמה");
    expect(result.breakdown.length).toBeGreaterThan(0);
    for (const item of result.breakdown) {
      expect(item.rule).toBeTruthy();
      expect(typeof item.score).toBe("number");
      expect(item.tip.he).toBeTruthy();
    }
  });

  it("score is between 0 and 100", () => {
    const result = scoreHebrewCopy("הצטרפו עכשיו! חינם! מוגבל! מוכח! לקוחות! ביקורות!");
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("fake urgency gets lower score than real urgency", () => {
    const fake = scoreHebrewCopy("מהרו!!!! עכשיו!!!! חינם!!!!");
    const real = scoreHebrewCopy("נשארו 12 מקומות. ההרשמה נסגרת ביום חמישי. הצטרפו עכשיו.");
    expect(real.total).toBeGreaterThan(fake.total);
  });
});
