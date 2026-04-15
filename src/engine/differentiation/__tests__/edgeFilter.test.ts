import { describe, it, expect } from "vitest";
import { filterTextForContext, filterOutputTree } from "../edgeFilter";

describe("filterTextForContext — business_meeting context", () => {
  it("passes clean business text through unchanged", () => {
    const input = "Our differentiation is our speed and domain expertise.";
    const result = filterTextForContext(input);
    expect(result.replaced).toBe(false);
    expect(result.dropped).toBe(false);
    expect(result.value).toBe(input);
  });

  it("reframes a long clinical string", () => {
    const input = "The diagnosis shows the patient needs a treatment plan and medication review for the syndrome.";
    const result = filterTextForContext(input);
    expect(result.replaced).toBe(true);
    expect(result.dropped).toBe(false);
    expect(result.value).toMatch(/Reading recommendation/i);
  });

  it("drops a very short clinical string (<40 chars)", () => {
    const input = "Diagnosis: ADHD.";
    const result = filterTextForContext(input);
    expect(result.dropped).toBe(true);
    expect(result.value).toBe("");
  });

  it("detects Hebrew clinical patterns", () => {
    const input = "האבחנה שלי מראה שדרושה בדיקה רפואית לפני קבלת ההחלטה.";
    const result = filterTextForContext(input);
    expect(result.replaced || result.dropped).toBe(true);
  });

  it("uses Hebrew reading prefix for Hebrew input", () => {
    const input = "חשוב לציין: האבחנה הרפואית מחייבת בדיקות וטיפול תרופתי נוסף לאחר הפגישה.";
    const result = filterTextForContext(input);
    if (result.replaced) {
      expect(result.value).toMatch(/המלצת קריאה/);
    }
  });

  it("passes text without filtering in non-business context", () => {
    const input = "The diagnosis confirms medication is needed.";
    const result = filterTextForContext(input, "clinical");
    expect(result.replaced).toBe(false);
    expect(result.dropped).toBe(false);
    expect(result.value).toBe(input);
  });
});

describe("filterOutputTree", () => {
  it("recursively filters string leaves of an object", () => {
    const obj = {
      title: "Clean text",
      clinical: "The diagnosis requires medical testing and symptom evaluation plan.",
      nested: {
        ok: "Fine text",
        bad: "Prescribing medication for treatment plan.",
      },
    };
    const { output, transformations } = filterOutputTree(obj);
    expect(transformations).toBeGreaterThan(0);
    expect((output as typeof obj).title).toBe("Clean text");
    expect((output as typeof obj).nested.ok).toBe("Fine text");
  });

  it("handles arrays", () => {
    const arr = [
      "Safe sentence.",
      "Diagnosis: requires medical testing and a full treatment plan.",
    ];
    const { output } = filterOutputTree(arr);
    expect((output as string[])[0]).toBe("Safe sentence.");
    // second element is either replaced or dropped
    expect((output as string[])[1]).not.toBe(arr[1]);
  });

  it("returns 0 transformations for a clean object", () => {
    const obj = { a: "clean", b: { c: "also clean" } };
    const { transformations } = filterOutputTree(obj);
    expect(transformations).toBe(0);
  });
});
