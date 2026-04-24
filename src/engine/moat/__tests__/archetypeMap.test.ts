import { describe, it, expect } from "vitest";
import {
  ARCHETYPE_TO_PRINCIPLES,
  principlesForArchetype,
} from "../archetypePrincipleMap";
import { findPrinciple } from "../principleLibrary";
import type { CompetitorArchetypeId } from "@/types/differentiation";

const ALL_ARCHETYPES: CompetitorArchetypeId[] = [
  "laser_focused", "quiet_vendor", "hidden_cost_engineer",
  "political_disruptor", "unexpected_joiner",
  "category_king", "price_anchor", "lifestyle_brand",
  "platform_aggregator", "creator_led",
];

describe("archetypePrincipleMap", () => {
  it("T2: every CompetitorArchetypeId has an entry", () => {
    for (const a of ALL_ARCHETYPES) {
      expect(a in ARCHETYPE_TO_PRINCIPLES, `missing entry for ${a}`).toBe(true);
    }
  });

  it("T2: every mapped PrincipleId exists in the live library (no dangling refs)", () => {
    for (const [arch, ids] of Object.entries(ARCHETYPE_TO_PRINCIPLES)) {
      for (const id of ids) {
        expect(findPrinciple(id), `${arch} refs missing ${id}`).toBeDefined();
      }
    }
  });

  it("all 10 archetypes have at least 1 principle mapped in v1", () => {
    // This is a v1 pledge — no archetype ships without a research-
    // backed counter. If a future archetype is intentionally empty,
    // relax this assertion and document why.
    for (const a of ALL_ARCHETYPES) {
      expect(principlesForArchetype(a).length, `${a} is empty`).toBeGreaterThan(0);
    }
  });

  it("hidden_cost_engineer -> P03 (loss framing is the canonical counter)", () => {
    expect(principlesForArchetype("hidden_cost_engineer")).toContain("P03");
  });

  it("laser_focused -> P08 (resilience triad beats scalar niche)", () => {
    expect(principlesForArchetype("laser_focused")).toContain("P08");
  });
});
