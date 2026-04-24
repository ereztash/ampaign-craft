import { describe, it, expect } from "vitest";
import {
  getLibrary,
  getSourceRegistry,
  findPrinciple,
  findSource,
  libraryVersion,
} from "../principleLibrary";

describe("principleLibrary", () => {
  it("T1: loads without error on import (startup validation passes)", () => {
    // If validation had thrown, this file would have failed to load at all.
    expect(libraryVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("T1: loads exactly 16 principles with P01..P16 ids", () => {
    const lib = getLibrary();
    expect(lib.principles.length).toBe(16);
    const ids = new Set(lib.principles.map((p) => p.id));
    for (let i = 1; i <= 16; i++) {
      const id = `P${String(i).padStart(2, "0")}`;
      expect(ids.has(id as `P${string}`)).toBe(true);
    }
  });

  it("T1: loads source registry with 65 sources", () => {
    const reg = getSourceRegistry();
    expect(reg.sources.length).toBe(65);
    expect(reg.count).toBe(65);
  });

  it("findPrinciple returns P03 with Hobfoll + Kahneman backbone", () => {
    const p = findPrinciple("P03");
    expect(p).toBeDefined();
    expect(p!.research_backbone.join(" ")).toMatch(/Hobfoll/);
    expect(p!.research_backbone.join(" ")).toMatch(/Kahneman/);
  });

  it("findPrinciple returns undefined for unknown id (never fabricates)", () => {
    expect(findPrinciple("P99" as `P${string}`)).toBeUndefined();
  });

  it("findSource resolves D001 to a real SourceDoc", () => {
    const s = findSource("D001");
    expect(s).toBeDefined();
    expect(s!.course).toContain("טראומה");
  });

  it("every principle source ref resolves to a real SourceDoc (no dangling refs)", () => {
    const lib = getLibrary();
    for (const p of lib.principles) {
      for (const ref of p.sources) {
        expect(findSource(ref), `${p.id} refs ${ref}`).toBeDefined();
      }
    }
  });

  it("every principle has at least 1 module_relevance entry", () => {
    const lib = getLibrary();
    for (const p of lib.principles) {
      expect(p.module_relevance.length, `${p.id} module_relevance`).toBeGreaterThan(0);
    }
  });
});
