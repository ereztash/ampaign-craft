import { describe, it, expect } from "vitest";
import { translations } from "../translations";

describe("translations", () => {
  const keys = Object.keys(translations) as (keyof typeof translations)[];

  it("has at least 20 translation keys", () => {
    expect(keys.length).toBeGreaterThanOrEqual(20);
  });

  it("every key has a non-empty 'en' value", () => {
    const missing = keys.filter((k) => !translations[k].en);
    expect(missing).toHaveLength(0);
  });

  it("every key has a non-empty 'he' value", () => {
    const missing = keys.filter((k) => !translations[k].he);
    expect(missing).toHaveLength(0);
  });

  it("appName is FunnelForge in both languages", () => {
    expect(translations.appName.he).toBe("FunnelForge");
    expect(translations.appName.en).toBe("FunnelForge");
  });

  it("navigation keys (next, back) exist in both languages", () => {
    expect(translations.next.he).toBeTruthy();
    expect(translations.next.en).toBe("Next");
    expect(translations.back.he).toBeTruthy();
    expect(translations.back.en).toBe("Back");
  });

  it("step1Title key has bilingual content", () => {
    expect(translations.step1Title.he).toBeTruthy();
    expect(translations.step1Title.en).toBeTruthy();
  });

  it("all field keys (fieldFashion through fieldOther) are present", () => {
    const fieldKeys = [
      "fieldFashion", "fieldTech", "fieldFood", "fieldServices",
      "fieldEducation", "fieldHealth", "fieldRealEstate",
      "fieldTourism", "fieldPersonalBrand", "fieldOther",
    ] as (keyof typeof translations)[];
    for (const k of fieldKeys) {
      expect(translations[k], `missing key: ${k}`).toBeDefined();
      expect(translations[k].en).toBeTruthy();
    }
  });
});
