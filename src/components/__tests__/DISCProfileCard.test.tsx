import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DISCProfileCard } from "../DISCProfileCard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

const mockProfile = {
  primary: "D" as const,
  secondary: "C" as const,
  distribution: {
    D: 45,
    I: 20,
    S: 15,
    C: 20,
  },
  communicationTone: { he: "ישיר ותוצאתי", en: "Direct and results-oriented" },
  messagingStrategy: {
    emphasize: [
      { he: "ROI", en: "ROI and results" },
      { he: "יעילות", en: "Efficiency" },
    ],
    avoid: [
      { he: "פרטים עודפים", en: "Excessive details" },
    ],
  },
  ctaStyle: { he: "פנה עכשיו", en: "Act now for results" },
  funnelEmphasis: "bottom" as const,
};

describe("DISCProfileCard", () => {
  it("renders without crashing", () => {
    render(<DISCProfileCard profile={mockProfile} />);
    expect(screen.getByText("DISC Profile")).toBeInTheDocument();
  });

  it("shows primary type badge", () => {
    render(<DISCProfileCard profile={mockProfile} />);
    expect(screen.getByText("Dominant")).toBeInTheDocument();
  });

  it("shows secondary type badge", () => {
    render(<DISCProfileCard profile={mockProfile} />);
    expect(screen.getByText("Conscientious")).toBeInTheDocument();
  });

  it("shows communication tone", () => {
    render(<DISCProfileCard profile={mockProfile} />);
    expect(screen.getByText("Direct and results-oriented")).toBeInTheDocument();
  });

  it("shows emphasize section", () => {
    render(<DISCProfileCard profile={mockProfile} />);
    expect(screen.getByText("Emphasize:")).toBeInTheDocument();
    expect(screen.getByText("ROI and results")).toBeInTheDocument();
  });

  it("shows avoid section", () => {
    render(<DISCProfileCard profile={mockProfile} />);
    expect(screen.getByText("Avoid:")).toBeInTheDocument();
    expect(screen.getByText("Excessive details")).toBeInTheDocument();
  });

  it("shows CTA style", () => {
    render(<DISCProfileCard profile={mockProfile} />);
    expect(screen.getByText("CTA Style:")).toBeInTheDocument();
    expect(screen.getByText("Act now for results")).toBeInTheDocument();
  });

  it("shows distribution percentages", () => {
    render(<DISCProfileCard profile={mockProfile} />);
    expect(screen.getByText("45%")).toBeInTheDocument();
  });
});
