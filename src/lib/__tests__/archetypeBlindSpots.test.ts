import { describe, it, expect } from "vitest";
import { ARCHETYPE_BLIND_SPOTS, getBlindSpotProfile } from "../archetypeBlindSpots";

const KNOWN_ARCHETYPES = ["strategist", "optimizer", "pioneer", "connector", "closer"] as const;

describe("archetypeBlindSpots", () => {
  // ── ARCHETYPE_BLIND_SPOTS constant ────────────────────────────────────

  describe("ARCHETYPE_BLIND_SPOTS", () => {
    it("has entries for all 5 archetypes", () => {
      for (const id of KNOWN_ARCHETYPES) {
        expect(ARCHETYPE_BLIND_SPOTS[id]).toBeDefined();
      }
    });

    for (const id of KNOWN_ARCHETYPES) {
      describe(`${id} profile`, () => {
        it("has archetypeId matching the key", () => {
          expect(ARCHETYPE_BLIND_SPOTS[id].archetypeId).toBe(id);
        });

        it("has strength in both he and en", () => {
          const { strength } = ARCHETYPE_BLIND_SPOTS[id];
          expect(typeof strength.he).toBe("string");
          expect(strength.he.length).toBeGreaterThan(0);
          expect(typeof strength.en).toBe("string");
          expect(strength.en.length).toBeGreaterThan(0);
        });

        it("has blindSpot in both he and en", () => {
          const { blindSpot } = ARCHETYPE_BLIND_SPOTS[id];
          expect(typeof blindSpot.he).toBe("string");
          expect(blindSpot.he.length).toBeGreaterThan(0);
          expect(typeof blindSpot.en).toBe("string");
          expect(blindSpot.en.length).toBeGreaterThan(0);
        });

        it("has at least one moduleBlindSpot", () => {
          const { moduleBlindSpots } = ARCHETYPE_BLIND_SPOTS[id];
          expect(moduleBlindSpots.length).toBeGreaterThanOrEqual(1);
        });

        it("each moduleBlindSpot has required fields", () => {
          for (const spot of ARCHETYPE_BLIND_SPOTS[id].moduleBlindSpots) {
            expect(typeof spot.moduleId).toBe("string");
            expect(spot.moduleId.length).toBeGreaterThan(0);
            expect(typeof spot.routePath).toBe("string");
            expect(spot.routePath.startsWith("/")).toBe(true);
            expect(typeof spot.dwellThresholdDays).toBe("number");
            expect(spot.dwellThresholdDays).toBeGreaterThan(0);
            expect(typeof spot.description.he).toBe("string");
            expect(typeof spot.description.en).toBe("string");
            expect(typeof spot.nudge.he).toBe("string");
            expect(typeof spot.nudge.en).toBe("string");
            expect(typeof spot.suggestedNextModule).toBe("string");
            expect(typeof spot.suggestedNextRoutePath).toBe("string");
          }
        });
      });
    }
  });

  // ── getBlindSpotProfile ───────────────────────────────────────────────

  describe("getBlindSpotProfile", () => {
    it("returns the correct profile for a known archetype", () => {
      const profile = getBlindSpotProfile("strategist");
      expect(profile.archetypeId).toBe("strategist");
    });

    it("returns the optimizer profile as fallback for an unknown archetype", () => {
      const profile = getBlindSpotProfile("unknown" as never);
      expect(profile.archetypeId).toBe("optimizer");
    });

    it("returns different profiles for different archetypes", () => {
      const strategist = getBlindSpotProfile("strategist");
      const closer = getBlindSpotProfile("closer");
      expect(strategist.archetypeId).not.toBe(closer.archetypeId);
    });
  });
});
