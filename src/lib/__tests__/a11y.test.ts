import { describe, it, expect } from "vitest";
import {
  livePolite,
  liveAssert,
  decorative,
  iconBtn,
  radioCard,
  radioGroup,
  checkboxCard,
  progressBar,
  fieldId,
} from "../a11y";

describe("a11y", () => {
  // ── Constants ──────────────────────────────────────────────────────────

  describe("livePolite", () => {
    it("has aria-live polite and aria-atomic true", () => {
      expect(livePolite["aria-live"]).toBe("polite");
      expect(livePolite["aria-atomic"]).toBe("true");
    });
  });

  describe("liveAssert", () => {
    it("has aria-live assertive and aria-atomic true", () => {
      expect(liveAssert["aria-live"]).toBe("assertive");
      expect(liveAssert["aria-atomic"]).toBe("true");
    });
  });

  describe("decorative", () => {
    it("has aria-hidden true", () => {
      expect(decorative["aria-hidden"]).toBe(true);
    });
  });

  // ── iconBtn ───────────────────────────────────────────────────────────

  describe("iconBtn", () => {
    it("returns aria-label for a plain string", () => {
      expect(iconBtn("Close")).toEqual({ "aria-label": "Close" });
    });

    it("returns english label by default when no lang provided", () => {
      const label = { he: "סגור", en: "Close" };
      expect(iconBtn(label)).toEqual({ "aria-label": "Close" });
    });

    it("returns hebrew label when lang=he", () => {
      const label = { he: "סגור", en: "Close" };
      expect(iconBtn(label, "he")).toEqual({ "aria-label": "סגור" });
    });

    it("returns english label when lang=en", () => {
      const label = { he: "סגור", en: "Close dialog" };
      expect(iconBtn(label, "en")).toEqual({ "aria-label": "Close dialog" });
    });
  });

  // ── radioCard ────────────────────────────────────────────────────────

  describe("radioCard", () => {
    it("returns role=radio with aria-checked true when checked", () => {
      const props = radioCard(true);
      expect(props.role).toBe("radio");
      expect(props["aria-checked"]).toBe(true);
    });

    it("returns aria-checked false when not checked", () => {
      const props = radioCard(false);
      expect(props["aria-checked"]).toBe(false);
    });

    it("includes aria-label when label is provided", () => {
      const props = radioCard(true, "Pro Plan");
      expect(props["aria-label"]).toBe("Pro Plan");
    });

    it("omits aria-label when label is not provided", () => {
      const props = radioCard(false);
      expect("aria-label" in props).toBe(false);
    });
  });

  // ── radioGroup ───────────────────────────────────────────────────────

  describe("radioGroup", () => {
    it("returns role=radiogroup", () => {
      const props = radioGroup();
      expect(props.role).toBe("radiogroup");
    });

    it("includes aria-labelledby when labelledBy is provided", () => {
      const props = radioGroup("group-title-id");
      expect(props["aria-labelledby"]).toBe("group-title-id");
    });

    it("omits aria-labelledby when not provided", () => {
      const props = radioGroup();
      expect("aria-labelledby" in props).toBe(false);
    });
  });

  // ── checkboxCard ─────────────────────────────────────────────────────

  describe("checkboxCard", () => {
    it("returns role=checkbox", () => {
      const props = checkboxCard(false);
      expect(props.role).toBe("checkbox");
    });

    it("returns aria-checked true when checked", () => {
      expect(checkboxCard(true)["aria-checked"]).toBe(true);
    });

    it("returns aria-checked false when not checked", () => {
      expect(checkboxCard(false)["aria-checked"]).toBe(false);
    });

    it("includes aria-label when label is provided", () => {
      const props = checkboxCard(true, "Select this");
      expect(props["aria-label"]).toBe("Select this");
    });

    it("omits aria-label when no label", () => {
      const props = checkboxCard(false);
      expect("aria-label" in props).toBe(false);
    });
  });

  // ── progressBar ──────────────────────────────────────────────────────

  describe("progressBar", () => {
    it("returns role=progressbar with correct values", () => {
      const props = progressBar(50, 0, 100);
      expect(props.role).toBe("progressbar");
      expect(props["aria-valuenow"]).toBe(50);
      expect(props["aria-valuemin"]).toBe(0);
      expect(props["aria-valuemax"]).toBe(100);
    });

    it("uses default min=0 and max=100", () => {
      const props = progressBar(25);
      expect(props["aria-valuemin"]).toBe(0);
      expect(props["aria-valuemax"]).toBe(100);
    });

    it("includes aria-label when label is provided", () => {
      const props = progressBar(33, 0, 100, "Step 2 of 6");
      expect(props["aria-label"]).toBe("Step 2 of 6");
    });

    it("omits aria-label when label is not provided", () => {
      const props = progressBar(33);
      expect("aria-label" in props).toBe(false);
    });
  });

  // ── fieldId ──────────────────────────────────────────────────────────

  describe("fieldId", () => {
    it("prefixes with field-", () => {
      expect(fieldId("email")).toBe("field-email");
    });

    it("converts spaces to hyphens and lowercases", () => {
      expect(fieldId("Business Name")).toBe("field-business-name");
    });

    it("handles multiple spaces", () => {
      expect(fieldId("my   field")).toBe("field-my---field");
    });

    it("handles already lowercase input", () => {
      expect(fieldId("username")).toBe("field-username");
    });
  });
});
