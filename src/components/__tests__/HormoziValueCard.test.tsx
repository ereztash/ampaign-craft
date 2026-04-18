import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HormoziValueCard } from "../HormoziValueCard";
import type { HormoziValueResult } from "@/types/funnel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

const makeDimension = (score: number) => ({
  score,
  analysis: { he: "ניתוח", en: "Analysis text" },
  tips: [{ he: "טיפ", en: "Tip text" }],
});

const mockData: HormoziValueResult = {
  overallScore: 78,
  offerGrade: "strong",
  valueEquationDisplay: { he: "משוואה", en: "Value equation display" },
  dreamOutcome: makeDimension(85),
  perceivedLikelihood: makeDimension(70),
  timeDelay: makeDimension(60),
  effortSacrifice: makeDimension(75),
  optimizationPriority: { he: "שפר זמן", en: "Improve time delay" },
} as unknown as HormoziValueResult;

describe("HormoziValueCard", () => {
  it("renders without crashing", () => {
    const { container } = render(<HormoziValueCard data={mockData} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows Hormozi Value Equation title", () => {
    render(<HormoziValueCard data={mockData} />);
    expect(screen.getByText(/hormozi value equation/i)).toBeTruthy();
  });

  it("shows overall score", () => {
    render(<HormoziValueCard data={mockData} />);
    expect(screen.getByText("78")).toBeTruthy();
  });

  it("shows offer grade badge", () => {
    render(<HormoziValueCard data={mockData} />);
    expect(screen.getByText("Strong")).toBeTruthy();
  });

  it("shows value equation display text", () => {
    render(<HormoziValueCard data={mockData} />);
    expect(screen.getByText("Value equation display")).toBeTruthy();
  });

  it("shows all 4 dimension labels", () => {
    render(<HormoziValueCard data={mockData} />);
    expect(screen.getByText("Dream Outcome")).toBeTruthy();
    expect(screen.getByText("Perceived Likelihood")).toBeTruthy();
    expect(screen.getByText("Time Delay")).toBeTruthy();
    expect(screen.getByText("Effort & Sacrifice")).toBeTruthy();
  });

  it("shows optimization priority", () => {
    render(<HormoziValueCard data={mockData} />);
    expect(screen.getByText("Improve time delay")).toBeTruthy();
  });

  it("shows tips when available", () => {
    render(<HormoziValueCard data={mockData} />);
    expect(screen.getAllByText("Tip text").length).toBeGreaterThan(0);
  });
});
