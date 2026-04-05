import { describe, it, expect } from "vitest";
import { getGlossaryTerm, getAllGlossaryTerms } from "../glossary";

describe("glossary", () => {
  it("has at least 15 terms", () => {
    const all = getAllGlossaryTerms();
    expect(all.length).toBeGreaterThanOrEqual(15);
  });

  it("each term has bilingual fields", () => {
    for (const { term } of getAllGlossaryTerms()) {
      expect(term.term.he).toBeTruthy();
      expect(term.term.en).toBeTruthy();
      expect(term.definition.he).toBeTruthy();
      expect(term.definition.en).toBeTruthy();
    }
  });

  it("getGlossaryTerm('cpc') returns valid term", () => {
    const term = getGlossaryTerm("cpc");
    expect(term).toBeDefined();
    expect(term!.term.en).toContain("CPC");
  });

  it("getGlossaryTerm is case-insensitive", () => {
    expect(getGlossaryTerm("CPC")).toEqual(getGlossaryTerm("cpc"));
    expect(getGlossaryTerm("ROAS")).toEqual(getGlossaryTerm("roas"));
  });

  it("unknown term returns undefined", () => {
    expect(getGlossaryTerm("nonexistent")).toBeUndefined();
  });

  const KEY_TERMS = ["cpc", "cpl", "cpa", "cpm", "roas", "roi", "ltv", "ctr", "nps"];
  KEY_TERMS.forEach((key) => {
    it(`contains term "${key}"`, () => {
      expect(getGlossaryTerm(key)).toBeDefined();
    });
  });
});
