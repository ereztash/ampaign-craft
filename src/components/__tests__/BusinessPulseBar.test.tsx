import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BusinessPulseBar from "../BusinessPulseBar";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/engine/healthScoreEngine", () => ({
  getHealthScoreColor: () => "#22c55e",
}));

const defaultProps = {
  healthTotal: 72,
  connectedSources: 2,
  bottleneckCount: 1,
  planCount: 3,
  streakWeeks: 4,
  completedModules: 3,
  totalModules: 5,
};

describe("BusinessPulseBar", () => {
  it("renders without crashing", () => {
    render(<BusinessPulseBar {...defaultProps} />);
    expect(screen.getByText("Marketing health")).toBeInTheDocument();
  });

  it("shows health score", () => {
    render(<BusinessPulseBar {...defaultProps} />);
    expect(screen.getByText("72")).toBeInTheDocument();
  });

  it("shows connected sources count", () => {
    render(<BusinessPulseBar {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows bottleneck count", () => {
    render(<BusinessPulseBar {...defaultProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows action badge when bottlenecks exist", () => {
    render(<BusinessPulseBar {...defaultProps} />);
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("shows plan count", () => {
    render(<BusinessPulseBar {...defaultProps} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows modules progress", () => {
    render(<BusinessPulseBar {...defaultProps} />);
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("shows streak when positive", () => {
    render(<BusinessPulseBar {...defaultProps} />);
    expect(screen.getByText("week streak")).toBeInTheDocument();
    // "4" appears in the streak row (streakWeeks=4)
    const streakEl = screen.getByText("week streak");
    const parent = streakEl.parentElement;
    expect(parent?.textContent).toContain("4");
  });

  it("handles null healthTotal", () => {
    render(<BusinessPulseBar {...defaultProps} healthTotal={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Create a plan for score")).toBeInTheDocument();
  });

  it("does not show streak when streakWeeks is 0", () => {
    render(<BusinessPulseBar {...defaultProps} streakWeeks={0} />);
    expect(screen.queryByText("week streak")).not.toBeInTheDocument();
  });
});
