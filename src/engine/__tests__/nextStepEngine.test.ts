import { describe, it, expect } from "vitest";
import { getRecommendedNextStep } from "../nextStepEngine";
import type { UserKnowledgeGraph } from "../userKnowledgeGraph";

// ═══════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════

function makeGraph(): UserKnowledgeGraph {
  return {} as unknown as UserKnowledgeGraph;
}

// ═══════════════════════════════════════════════
// getRecommendedNextStep — priority logic
// ═══════════════════════════════════════════════

describe("getRecommendedNextStep — Priority 1: no differentiation", () => {
  it("returns differentiation step when hasDiff is false", () => {
    const step = getRecommendedNextStep(makeGraph(), false, 0, new Set());
    expect(step.id).toBe("differentiation");
  });

  it("differentiation step has correct route", () => {
    const step = getRecommendedNextStep(makeGraph(), false, 5, new Set(["pricing", "retention"]));
    expect(step.route).toBe("/differentiate");
  });

  it("differentiation step has priority 1", () => {
    const step = getRecommendedNextStep(makeGraph(), false, 3, new Set());
    expect(step.priority).toBe(1);
  });

  it("differentiation step has bilingual title and description", () => {
    const step = getRecommendedNextStep(makeGraph(), false, 0, new Set());
    expect(step.title.he.length).toBeGreaterThan(0);
    expect(step.title.en.length).toBeGreaterThan(0);
    expect(step.description.he.length).toBeGreaterThan(0);
    expect(step.description.en.length).toBeGreaterThan(0);
  });

  it("returns differentiation even when planCount > 0 and features are mastered", () => {
    const step = getRecommendedNextStep(makeGraph(), false, 10, new Set(["pricing", "retention", "sales"]));
    expect(step.id).toBe("differentiation");
  });
});

describe("getRecommendedNextStep — Priority 2: no plan", () => {
  it("returns wizard step when hasDiff=true and planCount=0", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 0, new Set());
    expect(step.id).toBe("wizard");
  });

  it("wizard step routes to /wizard", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 0, new Set());
    expect(step.route).toBe("/wizard");
  });

  it("wizard step has priority 2", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 0, new Set());
    expect(step.priority).toBe(2);
  });

  it("returns wizard even when features are mastered", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 0, new Set(["pricing", "retention", "sales"]));
    expect(step.id).toBe("wizard");
  });
});

describe("getRecommendedNextStep — Priority 3: pricing not mastered", () => {
  it("returns pricing step when hasDiff=true, planCount>0, no pricing mastery", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 1, new Set());
    expect(step.id).toBe("pricing");
  });

  it("pricing step routes to /pricing", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 2, new Set());
    expect(step.route).toBe("/pricing");
  });

  it("pricing step has priority 3", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 1, new Set());
    expect(step.priority).toBe(3);
  });

  it("returns pricing even when retention and sales not mastered", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 1, new Set(["retention"]));
    // pricing not in set → pricing should be returned
    expect(step.id).toBe("pricing");
  });
});

describe("getRecommendedNextStep — Priority 4: retention not mastered", () => {
  it("returns retention step when pricing mastered but not retention", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 1, new Set(["pricing"]));
    expect(step.id).toBe("retention");
  });

  it("retention step routes to /retention", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 1, new Set(["pricing"]));
    expect(step.route).toBe("/retention");
  });

  it("retention step has priority 4", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 1, new Set(["pricing"]));
    expect(step.priority).toBe(4);
  });
});

describe("getRecommendedNextStep — Priority 5: sales not mastered", () => {
  it("returns sales step when pricing+retention mastered but not sales", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 1, new Set(["pricing", "retention"]));
    expect(step.id).toBe("sales");
  });

  it("sales step routes to /sales", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 1, new Set(["pricing", "retention"]));
    expect(step.route).toBe("/sales");
  });

  it("sales step has priority 5", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 1, new Set(["pricing", "retention"]));
    expect(step.priority).toBe(5);
  });
});

describe("getRecommendedNextStep — Default: update plan", () => {
  it("returns update step when all features mastered", () => {
    const step = getRecommendedNextStep(
      makeGraph(),
      true,
      1,
      new Set(["pricing", "retention", "sales"]),
    );
    expect(step.id).toBe("update");
  });

  it("update step routes to /wizard", () => {
    const step = getRecommendedNextStep(
      makeGraph(),
      true,
      1,
      new Set(["pricing", "retention", "sales"]),
    );
    expect(step.route).toBe("/wizard");
  });

  it("update step has priority 10", () => {
    const step = getRecommendedNextStep(
      makeGraph(),
      true,
      1,
      new Set(["pricing", "retention", "sales"]),
    );
    expect(step.priority).toBe(10);
  });
});

// ═══════════════════════════════════════════════
// Structure validation
// ═══════════════════════════════════════════════

describe("getRecommendedNextStep — NextStep structure", () => {
  const scenarios: [string, boolean, number, Set<string>][] = [
    ["differentiation", false, 0, new Set()],
    ["wizard", true, 0, new Set()],
    ["pricing", true, 1, new Set()],
    ["retention", true, 1, new Set(["pricing"])],
    ["sales", true, 1, new Set(["pricing", "retention"])],
    ["update", true, 1, new Set(["pricing", "retention", "sales"])],
  ];

  scenarios.forEach(([id, hasDiff, planCount, features]) => {
    it(`"${id}" step always returns required NextStep fields`, () => {
      const step = getRecommendedNextStep(makeGraph(), hasDiff, planCount, features);
      expect(typeof step.id).toBe("string");
      expect(typeof step.route).toBe("string");
      expect(typeof step.icon).toBe("string");
      expect(typeof step.color).toBe("string");
      expect(typeof step.priority).toBe("number");
      expect(step.title.he.length).toBeGreaterThan(0);
      expect(step.title.en.length).toBeGreaterThan(0);
      expect(step.description.he.length).toBeGreaterThan(0);
      expect(step.description.en.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════
// Edge cases
// ═══════════════════════════════════════════════

describe("getRecommendedNextStep — edge cases", () => {
  it("large planCount with no mastery still returns pricing (priority 3)", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 999, new Set());
    expect(step.id).toBe("pricing");
  });

  it("extra unrecognized features in masterySet do not skip steps", () => {
    const step = getRecommendedNextStep(
      makeGraph(),
      true,
      1,
      new Set(["analytics", "export"]), // pricing not in set
    );
    expect(step.id).toBe("pricing");
  });

  it("pricing feature alone does not skip retention", () => {
    const step = getRecommendedNextStep(makeGraph(), true, 1, new Set(["pricing"]));
    expect(step.id).toBe("retention");
  });
});
