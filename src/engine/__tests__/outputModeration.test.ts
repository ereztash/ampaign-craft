import { describe, it, expect } from "vitest";
import { moderateOutput } from "../outputModeration";

// ═══════════════════════════════════════════════
// moderateOutput — structure
// ═══════════════════════════════════════════════

describe("moderateOutput — result structure", () => {
  it("returns all required fields for safe text", () => {
    const result = moderateOutput("Great marketing copy that converts!");
    expect(result.safe).toBeDefined();
    expect(result.flags).toBeDefined();
    expect(result.severity).toBeDefined();
    expect(result.sanitizedText).toBeDefined();
  });

  it("safe text returns safe=true, empty flags, severity none", () => {
    const result = moderateOutput("Grow your business with our amazing platform.");
    expect(result.safe).toBe(true);
    expect(result.flags).toHaveLength(0);
    expect(result.severity).toBe("none");
    expect(result.sanitizedText).toBeNull();
  });
});

// ═══════════════════════════════════════════════
// moderateOutput — empty / invalid inputs
// ═══════════════════════════════════════════════

describe("moderateOutput — empty / invalid inputs", () => {
  it("empty string returns safe=true", () => {
    const result = moderateOutput("");
    expect(result.safe).toBe(true);
    expect(result.severity).toBe("none");
  });

  it("null returns safe=true", () => {
    const result = moderateOutput(null as unknown as string);
    expect(result.safe).toBe(true);
    expect(result.severity).toBe("none");
  });

  it("undefined returns safe=true", () => {
    const result = moderateOutput(undefined as unknown as string);
    expect(result.safe).toBe(true);
    expect(result.severity).toBe("none");
  });

  it("number input returns safe=true", () => {
    const result = moderateOutput(42 as unknown as string);
    expect(result.safe).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// moderateOutput — blocklist EN
// ═══════════════════════════════════════════════

describe("moderateOutput — blocklist English", () => {
  it("text containing 'nazi' is blocked", () => {
    const result = moderateOutput("This campaign uses nazi imagery");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
    expect(result.flags).toContain("blocked_content");
    expect(result.sanitizedText).toBeNull();
  });

  it("text containing 'hitler' is blocked (case-insensitive)", () => {
    const result = moderateOutput("Like Hitler did");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });

  it("text containing 'terrorism' is blocked", () => {
    const result = moderateOutput("Stop terrorism now!");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });

  it("text containing 'suicide' is blocked", () => {
    const result = moderateOutput("This product prevents suicidal thoughts");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });

  it("text containing 'racist' is blocked", () => {
    const result = moderateOutput("The racist approach to marketing");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });

  it("text containing 'illegal drugs' is blocked", () => {
    const result = moderateOutput("Selling illegal drugs online");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });

  it("text containing 'kill yourself' is blocked", () => {
    const result = moderateOutput("Just kill yourself already");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });
});

// ═══════════════════════════════════════════════
// moderateOutput — blocklist HE
// ═══════════════════════════════════════════════

describe("moderateOutput — blocklist Hebrew", () => {
  it("text containing 'נאצי' is blocked", () => {
    const result = moderateOutput("קמפיין בסגנון נאצי");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });

  it("text containing 'היטלר' is blocked", () => {
    const result = moderateOutput("כמו היטלר אמר");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });

  it("text containing 'טרור' is blocked", () => {
    const result = moderateOutput("מניעת טרור");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });

  it("text containing 'התאבדות' is blocked", () => {
    const result = moderateOutput("מניעת התאבדות");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });

  it("text containing 'סמים' is blocked", () => {
    const result = moderateOutput("מכירת סמים");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });
});

// ═══════════════════════════════════════════════
// moderateOutput — excessive negativity
// ═══════════════════════════════════════════════

describe("moderateOutput — excessive negativity", () => {
  it("single negativity word does not flag (count < 2)", () => {
    const result = moderateOutput("This is a terrible mistake in our approach today.");
    // 1 match → no excessive_negativity
    expect(result.flags).not.toContain("excessive_negativity");
  });

  it("two or more negativity matches across patterns flags excessive_negativity", () => {
    // "terrible" matches NEGATIVITY_PATTERNS[0]; "awful" also matches NEGATIVITY_PATTERNS[0]
    const result = moderateOutput("This is terrible and awful campaign idea.");
    expect(result.flags).toContain("excessive_negativity");
  });

  it("English negativity words: worthless + hopeless", () => {
    const result = moderateOutput("Your business is worthless and hopeless.");
    expect(result.flags).toContain("excessive_negativity");
  });

  it("Hebrew negativity words: חסר תקווה + אסון", () => {
    // Both patterns appear: חסר תקווה (matches NEGATIVITY_PATTERNS[1]) and אסון (matches NEGATIVITY_PATTERNS[1])
    const result = moderateOutput("זה חסר תקווה ואסון גמור ובעיה קטסטרופלית");
    expect(result.flags).toContain("excessive_negativity");
  });
});

// ═══════════════════════════════════════════════
// moderateOutput — high pressure
// ═══════════════════════════════════════════════

describe("moderateOutput — high pressure", () => {
  it("'BUY NOW' flags high_pressure", () => {
    const result = moderateOutput("BUY NOW before it's too late!");
    expect(result.flags).toContain("high_pressure");
  });

  it("'ACT NOW' flags high_pressure", () => {
    const result = moderateOutput("ACT NOW and get 50% off");
    expect(result.flags).toContain("high_pressure");
  });

  it("'LAST CHANCE' flags high_pressure", () => {
    const result = moderateOutput("LAST CHANCE to join!");
    expect(result.flags).toContain("high_pressure");
  });

  it("'LIMITED TIME' flags high_pressure", () => {
    const result = moderateOutput("LIMITED TIME offer ends today");
    expect(result.flags).toContain("high_pressure");
  });

  it("three or more exclamation marks flags high_pressure", () => {
    const result = moderateOutput("Get your offer now!!!");
    expect(result.flags).toContain("high_pressure");
  });

  it("two exclamation marks does NOT flag high_pressure", () => {
    const result = moderateOutput("Get your offer now!!");
    expect(result.flags).not.toContain("high_pressure");
  });
});

// ═══════════════════════════════════════════════
// moderateOutput — cortisol overload
// ═══════════════════════════════════════════════

describe("moderateOutput — cortisol overload", () => {
  it("high density of fear/urgency words flags cortisol_overload", () => {
    // The check requires: words > 20 (strictly) AND fearWords/words > 0.03
    // Construct 21+ word text where fear words dominate
    const fearText = "danger risk lose miss fail urgent now last now danger risk now lose fail urgent last danger risk lose miss extra";
    // 21 words; nearly all are fear words → ratio >> 3%
    const result = moderateOutput(fearText);
    expect(result.flags).toContain("cortisol_overload");
  });

  it("text with exactly 20 words does not trigger cortisol check (requires > 20)", () => {
    const text20 = "danger risk lose miss fail urgent now last danger risk now lose fail urgent now last risk lose miss fail";
    // exactly 20 words — condition is words > 20, so this is NOT checked
    const result = moderateOutput(text20);
    expect(result.flags).not.toContain("cortisol_overload");
  });

  it("low density of fear words in long text does not flag", () => {
    // Carefully craft text with 0 fear words from the pattern
    const normal = "We help clients succeed by delivering excellent marketing strategies. Our team is dedicated to providing outstanding results through creative approaches. The platform offers comprehensive tools for businesses. Clients achieve their goals effectively.";
    const result = moderateOutput(normal);
    expect(result.flags).not.toContain("cortisol_overload");
  });
});

// ═══════════════════════════════════════════════
// moderateOutput — severity calculation
// ═══════════════════════════════════════════════

describe("moderateOutput — severity levels", () => {
  it("no flags → severity is none", () => {
    const result = moderateOutput("Professional marketing copy for your business.");
    expect(result.severity).toBe("none");
  });

  it("one flag → severity is warning", () => {
    const result = moderateOutput("BUY NOW! Excellent marketing approach.");
    expect(result.severity).toBe("warning");
  });

  it("multiple flags → severity is warning", () => {
    // BUY NOW → high_pressure; terrible+awful → excessive_negativity
    const result = moderateOutput("BUY NOW!!! This is terrible and awful approach.");
    expect(result.severity).toBe("warning");
    expect(result.flags.length).toBeGreaterThanOrEqual(1);
  });

  it("blocked content → severity is blocked", () => {
    const result = moderateOutput("nazi reference here");
    expect(result.severity).toBe("blocked");
    expect(result.safe).toBe(false);
  });

  it("safe text → safe is true", () => {
    const result = moderateOutput("Grow your audience with targeted campaigns.");
    expect(result.safe).toBe(true);
  });

  it("flagged but not blocked → safe is false", () => {
    const result = moderateOutput("BUY NOW!!! terrible awful disaster");
    expect(result.safe).toBe(false);
  });
});
