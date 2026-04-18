import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CopyLabTab from "../CopyLabTab";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

const mockCopyLab = {
  readerProfile: {
    level: 3,
    name: { he: "קורא מקצוע", en: "Professional Reader" },
    description: { he: "תיאור", en: "Sophisticated reader who values substance" },
    copyArchitecture: { he: "ארכיטקטורה", en: "Headline → Proof → CTA" },
    principles: [
      { he: "עיקרון 1", en: "Clarity over cleverness" },
      { he: "עיקרון 2", en: "Lead with the benefit" },
    ],
  },
  formulas: [
    {
      name: { he: "PAS", en: "PAS Formula" },
      structure: { he: "בעיה - הגברה - פתרון", en: "Problem - Agitate - Solve" },
      example: { he: "דוגמה", en: "You struggle with X. Without fixing it, Y. Here's Z." },
      conversionLift: "+18%",
      origin: "Direct response",
      bestFor: ["email", "landing-page"],
    },
  ],
  writingTechniques: [
    {
      name: { he: "טכניקה", en: "Power Words" },
      description: { he: "תיאור", en: "Words that drive action" },
      metric: "CTR +8%",
      doExample: { he: "כן", en: "Use 'proven' and 'guaranteed'" },
      dontExample: { he: "לא", en: "Avoid vague claims" },
    },
  ],
};

describe("CopyLabTab", () => {
  it("renders without crashing", () => {
    render(<CopyLabTab copyLab={mockCopyLab} />);
    expect(screen.getByText("readerProfile")).toBeInTheDocument();
  });

  it("shows reader profile name and level", () => {
    render(<CopyLabTab copyLab={mockCopyLab} />);
    expect(screen.getByText("Professional Reader (Level 3)")).toBeInTheDocument();
  });

  it("shows reader profile description", () => {
    render(<CopyLabTab copyLab={mockCopyLab} />);
    expect(screen.getByText("Sophisticated reader who values substance")).toBeInTheDocument();
  });

  it("shows copy architecture", () => {
    render(<CopyLabTab copyLab={mockCopyLab} />);
    expect(screen.getByText("Headline → Proof → CTA")).toBeInTheDocument();
  });

  it("shows formula name", () => {
    render(<CopyLabTab copyLab={mockCopyLab} />);
    expect(screen.getByText("PAS Formula")).toBeInTheDocument();
  });

  it("shows formula conversion lift badge", () => {
    render(<CopyLabTab copyLab={mockCopyLab} />);
    expect(screen.getByText("+18%")).toBeInTheDocument();
  });

  it("shows writing technique name", () => {
    render(<CopyLabTab copyLab={mockCopyLab} />);
    expect(screen.getByText("Power Words")).toBeInTheDocument();
  });

  it("shows do and don't examples", () => {
    render(<CopyLabTab copyLab={mockCopyLab} />);
    expect(screen.getByText("doThis:")).toBeInTheDocument();
    expect(screen.getByText("dontDoThis:")).toBeInTheDocument();
  });
});
