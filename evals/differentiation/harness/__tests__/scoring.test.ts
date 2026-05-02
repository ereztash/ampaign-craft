import { describe, it, expect } from "vitest";
import { computeIBAR, genericityFailureCount, formatIBAR, type PersonaRedTeamBundle } from "../scoring";
import { validatePersonas } from "../../personas/personaSchema";
import { personas } from "../../personas/synthetic-personas";
import {
  buildCriticPrompt, buildUsabilityPrompt, buildOwnershipPrompt,
  buildComparisonPrompt, buildPreMortemPrompt,
} from "../redTeamPrompts";
import type { DifferentiationResult } from "@/types/differentiation";

// ─── Fixtures ──────────────────────────────────────────────────────────────

function bundle(id: string, overrides: Partial<PersonaRedTeamBundle> = {}): PersonaRedTeamBundle {
  return {
    personaId: id,
    critic: { coherent: true, weakest_claim: "", why: "", genericity_score: 30 },
    usability: { would_use: true, where: ["LinkedIn"], confidence: 70 },
    ownership: { feels_mine: true, what_to_change: "" },
    comparison: {
      winner: "ff",
      on_dimensions: { clarity: "ff", specificity: "ff", actionability: "ff", ownership: "ff" },
      reason: "",
    },
    improvedClarityHigher: false,
    ...overrides,
  };
}

function fakeResult(): DifferentiationResult {
  return {
    id: "fake",
    createdAt: new Date().toISOString(),
    formData: personas[0].formData,
    claimVerificationScore: 50,
    differentiationStrength: 60,
    verifiedClaims: [],
    gapAnalysis: [],
    hiddenValueProfile: [],
    ashamedPainInsights: [],
    competitorMap: [],
    committeeNarratives: [],
    mechanismStatement: {
      oneLiner: { he: "משפט בדיקה", en: "test oneLiner" },
      mechanism: "x via y",
      proof: "evidence",
      antiStatement: "",
      perRole: {},
    },
    tradeoffDeclarations: [],
    hybridCategory: { name: { he: "", en: "" }, description: { he: "", en: "" }, existingCategories: [], whitespace: "" },
    contraryMetrics: [],
    executiveSummary: { he: "", en: "" },
    nextSteps: [],
  };
}

// ─── Personas validation ────────────────────────────────────────────────────

describe("synthetic-personas", () => {
  it("contains exactly 20 personas with valid form data", () => {
    expect(personas).toHaveLength(20);
    expect(() => validatePersonas(personas)).not.toThrow();
  });

  it("covers all 6 segments", () => {
    const segments = new Set(personas.map((p) => p.segment));
    expect(segments).toEqual(new Set([
      "b2b_services", "b2c_services", "b2b_saas",
      "b2c_creator", "edge_case", "failure_state",
    ]));
  });

  it("has unique persona ids p01..p20", () => {
    const ids = personas.map((p) => p.id).sort();
    const expected = Array.from({ length: 20 }, (_, i) => `p${String(i + 1).padStart(2, "0")}`);
    expect(ids).toEqual(expected);
  });
});

// ─── Scoring ────────────────────────────────────────────────────────────────

describe("computeIBAR", () => {
  it("counts all-pass bundles correctly", () => {
    const bundles = Array.from({ length: 20 }, (_, i) => bundle(`p${i}`));
    const ibar = computeIBAR(bundles);
    expect(ibar.clarity).toBe(20);
    expect(ibar.ownership).toBe(20);
    expect(ibar.applicability).toBe(20);
    expect(ibar.preference).toBe(20);
    expect(ibar.passesGates).toBe(true);
    expect(ibar.firstFailedGate).toBeUndefined();
  });

  it("identifies the first failed gate (clarity)", () => {
    // 11 personas with low clarity (genericity_score >= 70)
    const bundles = Array.from({ length: 20 }, (_, i) =>
      bundle(`p${i}`, i < 11 ? { critic: { coherent: true, weakest_claim: "", why: "", genericity_score: 80 } } : {}),
    );
    const ibar = computeIBAR(bundles);
    expect(ibar.clarity).toBe(9);
    expect(ibar.passesGates).toBe(false);
    expect(ibar.firstFailedGate).toBe("clarity");
  });

  it("flags preference failure when ChatGPT wins majority", () => {
    const bundles = Array.from({ length: 20 }, (_, i) =>
      bundle(`p${i}`, i < 13 ? {
        comparison: {
          winner: "chatgpt",
          on_dimensions: { clarity: "chatgpt", specificity: "chatgpt", actionability: "chatgpt", ownership: "chatgpt" },
          reason: "",
        },
      } : {}),
    );
    const ibar = computeIBAR(bundles);
    expect(ibar.preference).toBe(7);
    expect(ibar.firstFailedGate).toBe("preference");
  });

  it("counts genericity failures separately", () => {
    const bundles = Array.from({ length: 20 }, (_, i) =>
      bundle(`p${i}`, i < 9 ? { critic: { coherent: true, weakest_claim: "", why: "", genericity_score: 75 } } : {}),
    );
    expect(genericityFailureCount(bundles)).toBe(9);
  });

  it("formatIBAR outputs both line and verdict", () => {
    const ibar = computeIBAR(Array.from({ length: 20 }, (_, i) => bundle(`p${i}`)));
    const out = formatIBAR(ibar);
    expect(out).toMatch(/IBAR: clarity 20\/20/);
    expect(out).toMatch(/PASS — all gates cleared/);
  });
});

// ─── Prompts (build only — runtime parsing covered in llmClient tests) ────

describe("redTeamPrompts builders", () => {
  const persona = personas[0];
  const result = fakeResult();

  it("includes anti-flattery clause and persona context in every prompt", () => {
    const prompts = [
      buildCriticPrompt(persona, result),
      buildUsabilityPrompt(persona, result),
      buildOwnershipPrompt(persona, result),
      buildComparisonPrompt(persona, result, "alt-chatgpt", "alt-template"),
      buildPreMortemPrompt(persona, result),
    ];
    for (const p of prompts) {
      expect(p).toContain("red team");
      expect(p).toContain(persona.formData.businessName);
    }
  });

  it("comparison prompt includes all three options", () => {
    const p = buildComparisonPrompt(persona, result, "alt-chatgpt-text", "alt-template-text");
    expect(p).toContain("alt-chatgpt-text");
    expect(p).toContain("alt-template-text");
    expect(p).toContain("FunnelForge");
  });
});
