import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase dynamic import
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { emitArchetypeEvent } from "../archetypeAnalytics";

describe("archetypeAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  describe("emitArchetypeEvent", () => {
    it("does not throw when called without payload", () => {
      expect(() => emitArchetypeEvent("archetype_revealed")).not.toThrow();
    });

    it("does not throw with full payload", () => {
      expect(() =>
        emitArchetypeEvent("blindspot_nudge_shown", {
          archetypeId: "strategist",
          moduleId: "differentiate",
          dwellDays: 5,
        }),
      ).not.toThrow();
    });

    it("logs to console.debug in DEV mode", () => {
      const originalDev = import.meta.env.DEV;
      (import.meta.env as Record<string, unknown>).DEV = true;

      emitArchetypeEvent("archetype_opted_in", { archetypeId: "optimizer" });

      expect(console.debug).toHaveBeenCalledWith(
        "[archetypeAnalytics]",
        "archetype_opted_in",
        expect.objectContaining({ archetypeId: "optimizer" }),
      );

      (import.meta.env as Record<string, unknown>).DEV = originalDev;
    });

    it("accepts all defined event names without error", () => {
      const events: Parameters<typeof emitArchetypeEvent>[0][] = [
        "archetype_revealed",
        "archetype_opted_in",
        "archetype_opted_out",
        "archetype_override_changed",
        "blindspot_nudge_shown",
        "blindspot_nudge_dismissed",
        "theme_pack_applied",
      ];

      for (const name of events) {
        expect(() => emitArchetypeEvent(name)).not.toThrow();
      }
    });

    it("does not throw when payload includes dismissReason", () => {
      expect(() =>
        emitArchetypeEvent("blindspot_nudge_dismissed", {
          dismissReason: "cta_followed",
          archetypeId: "closer",
        }),
      ).not.toThrow();
    });

    it("does not throw with fromArchetype and toArchetype override", () => {
      expect(() =>
        emitArchetypeEvent("archetype_override_changed", {
          fromArchetype: "pioneer",
          toArchetype: "connector",
        }),
      ).not.toThrow();
    });

    it("handles empty payload gracefully", () => {
      expect(() => emitArchetypeEvent("theme_pack_applied", {})).not.toThrow();
    });
  });
});
