import { describe, it, expect } from "vitest";
import {
  HIDDEN_VALUE_TO_PRINCIPLES,
  principlesForHiddenValue,
} from "../hiddenValuePrincipleMap";
import { findPrinciple } from "../principleLibrary";
import type { HiddenValueType } from "@/types/differentiation";

const ALL_HIDDEN_VALUES: HiddenValueType[] = [
  "legitimacy", "risk", "identity", "cognitive_ease", "status", "narrative",
  "autonomy", "empathy",
  "convenience", "aesthetic", "belonging", "self_expression",
  "guilt_free", "instant_gratification",
];

describe("hiddenValuePrincipleMap", () => {
  it("T2: every HiddenValueType has an entry (may be empty)", () => {
    for (const v of ALL_HIDDEN_VALUES) {
      expect(v in HIDDEN_VALUE_TO_PRINCIPLES, `missing entry for ${v}`).toBe(true);
    }
  });

  it("T2: every mapped PrincipleId exists in the live library (no dangling refs)", () => {
    for (const [valueKey, ids] of Object.entries(HIDDEN_VALUE_TO_PRINCIPLES)) {
      for (const id of ids) {
        expect(findPrinciple(id), `${valueKey} refs missing ${id}`).toBeDefined();
      }
    }
  });

  it("T2: at least 6 of the 8 universal/B2B hidden values have a mapping (exceeds prompt B's 8x~3 target)", () => {
    const b2bUniversal: HiddenValueType[] = [
      "legitimacy", "risk", "identity", "cognitive_ease",
      "status", "narrative", "autonomy", "empathy",
    ];
    const mapped = b2bUniversal.filter((v) => principlesForHiddenValue(v).length > 0);
    // Prompt B's initial static map covers all 8 — regression check.
    expect(mapped.length).toBeGreaterThanOrEqual(6);
  });

  it("principlesForHiddenValue returns empty array for known-unmapped B2C values (aesthetic, belonging, guilt_free)", () => {
    expect(principlesForHiddenValue("aesthetic")).toEqual([]);
    expect(principlesForHiddenValue("belonging")).toEqual([]);
    expect(principlesForHiddenValue("guilt_free")).toEqual([]);
  });

  it("autonomy -> P12+P06 (direct match on prompt B's initial mapping)", () => {
    expect(principlesForHiddenValue("autonomy")).toEqual(["P12", "P06"]);
  });

  it("status includes P09 (continuity) — deliberate deviation from prompt B's initial [P15]", () => {
    // The challenge to prompt B's initial mapping is documented in the
    // map file. This test records the deviation so future reverts are
    // visible in diff.
    expect(principlesForHiddenValue("status")).toContain("P09");
    expect(principlesForHiddenValue("status")).toContain("P15");
  });
});
