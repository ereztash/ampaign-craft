import { describe, it, expect } from "vitest";
import { tx } from "../tx";

const str = { he: "שמור", en: "Save" };

describe("tx()", () => {
  it("returns Hebrew string when lang=he", () => {
    expect(tx(str, "he")).toBe("שמור");
  });

  it("returns English string when lang=en", () => {
    expect(tx(str, "en")).toBe("Save");
  });

  it("falls back to 'en' when 'he' is empty", () => {
    expect(tx({ he: "", en: "Fallback" }, "he")).toBe("Fallback");
  });

  it("falls back to 'he' when 'en' is empty", () => {
    expect(tx({ he: "גיבוי", en: "" }, "en")).toBe("גיבוי");
  });

  it("returns empty string when both values are empty", () => {
    expect(tx({ he: "", en: "" }, "en")).toBe("");
  });

  it("tx.b builds a BilingualStr identity", () => {
    const obj = tx.b({ he: "א", en: "A" });
    expect(obj).toEqual({ he: "א", en: "A" });
  });
});
