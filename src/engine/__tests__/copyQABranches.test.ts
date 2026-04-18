// ═══════════════════════════════════════════════
// copyQABranches.test.ts
// Branch-coverage additions for analyzeCopy
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { analyzeCopy } from "../copyQAEngine";
import type { UserKnowledgeGraph } from "../userKnowledgeGraph";

function makeUKGWithStyle(style: "system1" | "system2" | "balanced"): Partial<UserKnowledgeGraph> {
  return {
    derived: {
      discCommunicationStyle: style,
      urgencySignal: "stable",
      realMetrics: { avgCPL: 50, avgOrderValue: 200, monthlyLeads: 20, conversionRate: 0.1, revenueMonthly: 4000 },
    },
  } as unknown as UserKnowledgeGraph;
}

// Copies constructed to trigger specific branches
const FEAR_HEAVY =
  "סכנה! אתה מפסיד! זה הדבר האחרון ללא סיכון! דחוף! warning: miss this and fail. danger risk urgent";
const TRUST_COPY =
  "מוכח: 2,400 לקוחות עם תוצאות מדידות. מחקר מראה 87% הצלחה. proven by research. data shows results.";
const FEAR_AND_TRUST =
  "אתה מפסיד ₪5,000 כל חודש ללא פעולה (danger). אבל 1,200 לקוחות כבר חוו תוצאות מוכחות. proven results. start now.";
const FLAT_COPY = "אנחנו מציעים שירות מקצועי. אנו עוזרים לעסקים לצמוח. יש לנו ניסיון רב בתחום.";
const CAPS_COPY = "THIS IS A GREAT OFFER. GET IT NOW. THE BEST SOLUTION.";
const CTA_COPY = "הצטרף עכשיו לאלפי לקוחות מרוצים. התחל היום. join now.";
const NO_CTA_LONG = "מוצר מעולה עם תכונות רבות. אנחנו עובדים קשה כדי לספק שירות מצוין. יש לנו ניסיון של 10 שנים בתחום.";
const EMOTION_HEAVY = "מדהים! מרגש! בלעדי! הרגש הכי גדול! free! instant exclusive! חינם! חדש! מיידי!";
const DATA_HEAVY = "proven by 5 studies. 2,400 clients. research data shows 87% results. 12-month study. 4.9 stars.";

describe("analyzeCopy — cortisol branches", () => {
  it("fearCount > 3 triggers cortisol_overload high risk", () => {
    const result = analyzeCopy(FEAR_HEAVY);
    expect(result.risks.some((r) => r.type === "cortisol_overload" && r.severity === "high")).toBe(true);
  });

  it("fearCount 1-3 adds cortisol_balanced strength (not risk)", () => {
    const copy = "danger: don't miss this. start now. proven results.";
    const result = analyzeCopy(copy);
    expect(result.strengths).toContain("cortisol_balanced");
    expect(result.risks.some((r) => r.type === "cortisol_overload")).toBe(false);
  });

  it("fearCount 0 does NOT add cortisol_balanced strength", () => {
    const result = analyzeCopy(FLAT_COPY);
    expect(result.strengths).not.toContain("cortisol_balanced");
  });
});

describe("analyzeCopy — entropy collapse branch", () => {
  it("no fear AND no power words → entropy_collapse risk", () => {
    const result = analyzeCopy(FLAT_COPY);
    expect(result.risks.some((r) => r.type === "entropy_collapse")).toBe(true);
  });

  it("has fear words → no entropy_collapse (hasFear=true)", () => {
    const result = analyzeCopy("danger: lose your chance. start now.");
    expect(result.risks.some((r) => r.type === "entropy_collapse")).toBe(false);
  });

  it("has power words → no entropy_collapse (hasPower=true)", () => {
    const result = analyzeCopy("free exclusive instant solution. get it now.");
    expect(result.risks.some((r) => r.type === "entropy_collapse")).toBe(false);
  });
});

describe("analyzeCopy — tension balance branch", () => {
  it("hasFear AND hasTrust → tension_balance strength", () => {
    const result = analyzeCopy(FEAR_AND_TRUST);
    expect(result.strengths).toContain("tension_balance");
  });

  it("hasFear WITHOUT trust → no tension_balance", () => {
    const fearNoTrust = "danger! lose! risk! urgent! miss! fail! last! now start get";
    const result = analyzeCopy(fearNoTrust);
    expect(result.strengths).not.toContain("tension_balance");
  });

  it("hasTrust WITHOUT fear → no tension_balance", () => {
    const result = analyzeCopy(TRUST_COPY + " start now.");
    expect(result.strengths).not.toContain("tension_balance");
  });
});

describe("analyzeCopy — reactance branch", () => {
  it("CAPS words > 2 triggers reactance even without exclamations", () => {
    const result = analyzeCopy(CAPS_COPY);
    expect(result.risks.some((r) => r.type === "reactance")).toBe(true);
  });

  it("4+ exclamations triggers reactance", () => {
    const result = analyzeCopy("buy now! hurry! last chance! act fast! do it!");
    expect(result.risks.some((r) => r.type === "reactance")).toBe(true);
  });

  it("1 exclamation and no CAPS → no reactance", () => {
    const result = analyzeCopy("great results proven by research. start today!");
    expect(result.risks.some((r) => r.type === "reactance")).toBe(false);
  });
});

describe("analyzeCopy — persona mismatch branches", () => {
  it("system2 persona with emotion-heavy copy → persona_mismatch", () => {
    const result = analyzeCopy(EMOTION_HEAVY, "system2");
    expect(result.risks.some((r) => r.type === "persona_mismatch")).toBe(true);
  });

  it("system1 persona with data-heavy copy → persona_mismatch", () => {
    const result = analyzeCopy(DATA_HEAVY, "system1");
    expect(result.risks.some((r) => r.type === "persona_mismatch")).toBe(true);
  });

  it("system2 persona with data-heavy copy → no persona_mismatch", () => {
    const result = analyzeCopy(DATA_HEAVY + " start now.", "system2");
    expect(result.risks.some((r) => r.type === "persona_mismatch")).toBe(false);
  });

  it("balanced persona skips mismatch check entirely", () => {
    const result = analyzeCopy(EMOTION_HEAVY, "balanced");
    expect(result.risks.some((r) => r.type === "persona_mismatch")).toBe(false);
  });

  it("UKG discCommunicationStyle overrides balanced default", () => {
    const result = analyzeCopy(
      EMOTION_HEAVY,
      "balanced",
      makeUKGWithStyle("system2") as UserKnowledgeGraph,
    );
    expect(result.risks.some((r) => r.type === "persona_mismatch")).toBe(true);
  });

  it("explicitly provided non-balanced persona takes precedence over UKG", () => {
    const result = analyzeCopy(
      EMOTION_HEAVY,
      "system1",
      makeUKGWithStyle("system2") as UserKnowledgeGraph,
    );
    // explicit system1 persona overrides UKG system2 → no mismatch (emotion matches system1)
    expect(result.risks.some((r) => r.type === "persona_mismatch")).toBe(false);
  });
});

describe("analyzeCopy — CTA branches", () => {
  it("no CTA words → weak_cta high risk", () => {
    const result = analyzeCopy(FLAT_COPY);
    expect(result.risks.some((r) => r.type === "weak_cta" && r.severity === "high")).toBe(true);
  });

  it("has CTA word → clear_cta strength", () => {
    const result = analyzeCopy(CTA_COPY);
    expect(result.strengths).toContain("clear_cta");
  });
});

describe("analyzeCopy — social proof branches", () => {
  it("no trust words + more than 2 sentences → no_proof risk", () => {
    const noProof = "אנחנו מציעים פתרון מקצועי. המוצר שלנו מעולה. לחץ כאן להתחיל. start now.";
    const result = analyzeCopy(noProof);
    expect(result.risks.some((r) => r.type === "no_proof")).toBe(true);
  });

  it("short text (≤ 2 sentences) without trust → no no_proof risk", () => {
    const result = analyzeCopy("start now. great offer.");
    expect(result.risks.some((r) => r.type === "no_proof")).toBe(false);
  });

  it("has trust words → social_proof strength", () => {
    const result = analyzeCopy(TRUST_COPY + " start now.");
    expect(result.strengths).toContain("social_proof");
  });
});

describe("analyzeCopy — power words branch", () => {
  it("2+ power words → power_words strength", () => {
    const result = analyzeCopy("free exclusive instant offer. start now. proven.");
    expect(result.strengths).toContain("power_words");
  });

  it("1 power word → no power_words strength", () => {
    const result = analyzeCopy("free offer. great service. proven results. start now.");
    expect(result.strengths).not.toContain("power_words");
  });
});

describe("analyzeCopy — score suggestions branches", () => {
  it("score < 60 adds first-sentence rewrite suggestion", () => {
    const result = analyzeCopy(FLAT_COPY);
    expect(result.suggestions.some((s) => s.en.includes("first sentence"))).toBe(true);
  });

  it("no trust → adds specific-number suggestion", () => {
    const result = analyzeCopy(FLAT_COPY);
    expect(result.suggestions.some((s) => s.en.includes("specific number"))).toBe(true);
  });

  it("has trust + high score → no number suggestion", () => {
    const goodCopy = "proven by 2,400 clients. free exclusive instant results. start now!";
    const result = analyzeCopy(goodCopy);
    expect(result.suggestions.some((s) => s.en.includes("specific number"))).toBe(false);
  });
});

describe("analyzeCopy — score clamping", () => {
  it("score never goes below 0", () => {
    const result = analyzeCopy(FEAR_HEAVY + " " + CAPS_COPY);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("score never exceeds 100", () => {
    const perfect = "free exclusive instant proven results by 2,400 clients! start now. join today.";
    const result = analyzeCopy(perfect);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
