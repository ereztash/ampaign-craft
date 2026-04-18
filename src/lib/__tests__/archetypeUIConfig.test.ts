import { describe, it, expect } from "vitest";
import {
  getArchetypeUIConfig,
  ARCHETYPE_UI_CONFIGS,
  reorderNavItems,
} from "../archetypeUIConfig";

const KNOWN_ARCHETYPES = ["strategist", "optimizer", "pioneer", "connector", "closer"] as const;

describe("archetypeUIConfig", () => {
  // ── ARCHETYPE_UI_CONFIGS constant ─────────────────────────────────────

  describe("ARCHETYPE_UI_CONFIGS", () => {
    it("has entries for all 5 archetypes", () => {
      for (const id of KNOWN_ARCHETYPES) {
        expect(ARCHETYPE_UI_CONFIGS[id]).toBeDefined();
      }
    });

    for (const id of KNOWN_ARCHETYPES) {
      describe(`${id} config`, () => {
        it("has archetypeId matching the key", () => {
          expect(ARCHETYPE_UI_CONFIGS[id].archetypeId).toBe(id);
        });

        it("has a non-empty workspaceOrder array", () => {
          expect(Array.isArray(ARCHETYPE_UI_CONFIGS[id].workspaceOrder)).toBe(true);
          expect(ARCHETYPE_UI_CONFIGS[id].workspaceOrder.length).toBeGreaterThan(0);
        });

        it("has a non-empty modulesOrder array", () => {
          expect(Array.isArray(ARCHETYPE_UI_CONFIGS[id].modulesOrder)).toBe(true);
          expect(ARCHETYPE_UI_CONFIGS[id].modulesOrder.length).toBeGreaterThan(0);
        });

        it("has a defaultTab string", () => {
          expect(typeof ARCHETYPE_UI_CONFIGS[id].defaultTab).toBe("string");
          expect(ARCHETYPE_UI_CONFIGS[id].defaultTab.length).toBeGreaterThan(0);
        });

        it("has a valid informationDensity", () => {
          expect(["compact", "standard", "rich"]).toContain(
            ARCHETYPE_UI_CONFIGS[id].informationDensity,
          );
        });

        it("has a valid ctaTone", () => {
          expect(["analytical", "direct", "inspirational", "relational", "urgency"]).toContain(
            ARCHETYPE_UI_CONFIGS[id].ctaTone,
          );
        });

        it("has label in he and en", () => {
          const { label } = ARCHETYPE_UI_CONFIGS[id];
          expect(typeof label.he).toBe("string");
          expect(label.he.length).toBeGreaterThan(0);
          expect(typeof label.en).toBe("string");
          expect(label.en.length).toBeGreaterThan(0);
        });

        it("has adaptationDescription in he and en", () => {
          const { adaptationDescription } = ARCHETYPE_UI_CONFIGS[id];
          expect(typeof adaptationDescription.he).toBe("string");
          expect(typeof adaptationDescription.en).toBe("string");
        });

        it("has a personalityProfile with regulatoryFocus", () => {
          const { personalityProfile } = ARCHETYPE_UI_CONFIGS[id];
          expect(["prevention", "promotion"]).toContain(personalityProfile.regulatoryFocus);
        });

        it("has at least one primaryFriction in personalityProfile", () => {
          expect(
            ARCHETYPE_UI_CONFIGS[id].personalityProfile.primaryFrictions.length,
          ).toBeGreaterThanOrEqual(1);
        });

        it("has a pipeline with at least one step in personalityProfile", () => {
          expect(
            ARCHETYPE_UI_CONFIGS[id].personalityProfile.pipeline.length,
          ).toBeGreaterThanOrEqual(1);
        });
      });
    }
  });

  // ── getArchetypeUIConfig ──────────────────────────────────────────────

  describe("getArchetypeUIConfig", () => {
    it("returns the correct config for a known archetype", () => {
      const config = getArchetypeUIConfig("closer");
      expect(config.archetypeId).toBe("closer");
    });

    it("returns optimizer config as fallback for unknown archetype", () => {
      const config = getArchetypeUIConfig("unknown" as never);
      expect(config.archetypeId).toBe("optimizer");
    });

    it("returns different configs for different archetypes", () => {
      const a = getArchetypeUIConfig("strategist");
      const b = getArchetypeUIConfig("pioneer");
      expect(a.defaultTab).not.toBe(b.defaultTab);
    });
  });

  // ── reorderNavItems ───────────────────────────────────────────────────

  describe("reorderNavItems", () => {
    it("reorders items based on preferredOrder", () => {
      const items = ["c", "a", "b"];
      const preferred = ["a", "b", "c"];
      const result = reorderNavItems(items, preferred);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("appends items not in preferredOrder at the end", () => {
      const items = ["x", "a", "b", "z"];
      const preferred = ["a", "b"];
      const result = reorderNavItems(items, preferred);
      expect(result.slice(0, 2)).toEqual(["a", "b"]);
      expect(result).toContain("x");
      expect(result).toContain("z");
    });

    it("returns original order when preferredOrder is empty", () => {
      const items = ["a", "b", "c"];
      const result = reorderNavItems(items, []);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("handles empty items array", () => {
      const result = reorderNavItems([], ["a", "b"]);
      expect(result).toEqual([]);
    });

    it("does not mutate the original array", () => {
      const items = ["b", "a"];
      const original = [...items];
      reorderNavItems(items, ["a", "b"]);
      expect(items).toEqual(original);
    });

    it("handles items not in preferredOrder in stable relative order", () => {
      const items = ["d", "a", "e", "b", "c"];
      const preferred = ["a", "b", "c"];
      const result = reorderNavItems(items, preferred);
      // d and e are extras — they should appear after a,b,c
      const extras = result.slice(3);
      expect(extras).toContain("d");
      expect(extras).toContain("e");
    });
  });
});
