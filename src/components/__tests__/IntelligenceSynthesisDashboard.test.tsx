import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntelligenceSynthesisDashboard } from "../IntelligenceSynthesisDashboard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/engine/emotionalPerformanceEngine", () => ({
  getEPSVerdict: vi.fn(() => ({ he: "ממוצע", en: "Average" })),
}));

vi.mock("@/engine/predictiveContentScoreEngine", () => ({
  getPredictiveContentVerdict: vi.fn(() => ({ he: "טוב", en: "Good" })),
}));

vi.mock("recharts", () => ({
  RadarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="radar-chart">{children}</div>
  ),
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  Radar: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => null,
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

const mockEps = {
  score: 82,
  emotionalBalance: { cortisol: 30, oxytocin: 70, dopamine: 60 },
  components: {
    copyQuality: 80,
    brandAlignment: 75,
    discAlignment: 85,
    stylomeAuthenticity: 90,
  },
  recommendations: [{ he: "שפר קופי", en: "Improve copy" }],
};

const mockPredictiveScore = {
  overallScore: 78,
  engagementPrediction: 72,
  conversionPrediction: 55,
  channelFit: [{ channel: "email", fit: 80 }],
  improvementSuggestions: [{ he: "שפר", en: "Improve subject line" }],
};

describe("IntelligenceSynthesisDashboard", () => {
  it("renders without crashing (no data)", () => {
    const { container } = render(<IntelligenceSynthesisDashboard />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the dashboard title", () => {
    render(<IntelligenceSynthesisDashboard />);
    expect(screen.getByText(/behavioral intelligence synthesis/i)).toBeTruthy();
  });

  it("shows EPS, Predictive, Cross-Domain, and Cohort tabs", () => {
    render(<IntelligenceSynthesisDashboard />);
    expect(screen.getByRole("tab", { name: /EPS/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /predictive/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /cross-domain/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /cohort/i })).toBeTruthy();
  });

  it("shows EPS score when eps data is provided", () => {
    render(<IntelligenceSynthesisDashboard eps={mockEps as unknown as typeof mockEps} />);
    expect(screen.getByText("82")).toBeTruthy();
  });

  it("shows empty state when no EPS data", () => {
    render(<IntelligenceSynthesisDashboard />);
    expect(screen.getByText(/no eps data/i)).toBeTruthy();
  });

  it("shows predictive score when switching to predictive tab", () => {
    render(
      <IntelligenceSynthesisDashboard
        predictiveScore={mockPredictiveScore as unknown as typeof mockPredictiveScore}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /predictive/i }));
    expect(screen.getByText("78")).toBeTruthy();
  });

  it("shows empty state for cross-domain tab with no data", () => {
    render(<IntelligenceSynthesisDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: /cross-domain/i }));
    expect(screen.getByText(/no cross-domain insights/i)).toBeTruthy();
  });

  it("shows empty state for cohort tab with no data", () => {
    render(<IntelligenceSynthesisDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: /cohort/i }));
    expect(screen.getByText(/no cohort assigned/i)).toBeTruthy();
  });
});
