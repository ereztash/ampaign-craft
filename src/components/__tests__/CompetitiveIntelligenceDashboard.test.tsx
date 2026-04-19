import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CompetitiveIntelligenceDashboard from "../CompetitiveIntelligenceDashboard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/lib/industryBenchmarks", () => ({
  getIndustryBenchmarks: vi.fn().mockReturnValue([
    {
      metric: { he: "CPC", en: "CPC" },
      value: "₪1.80-3.50",
    },
    {
      metric: { he: "CTR", en: "CTR" },
      value: "1.5-3.2%",
    },
  ]),
}));

vi.mock("recharts", () => ({
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  PolarGrid: () => <div />,
  PolarAngleAxis: () => <div />,
  PolarRadiusAxis: () => <div />,
  Radar: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => <div />,
  Tooltip: () => <div />,
}));

describe("CompetitiveIntelligenceDashboard", () => {
  it("renders without crashing", () => {
    render(<CompetitiveIntelligenceDashboard industry="tech" />);
    expect(screen.getByText("Competitive Intelligence")).toBeInTheDocument();
  });

  it("shows industry comparison description", () => {
    render(<CompetitiveIntelligenceDashboard industry="tech" />);
    expect(screen.getByText(/Comparison to tech industry benchmarks/)).toBeInTheDocument();
  });

  it("renders radar chart", () => {
    render(<CompetitiveIntelligenceDashboard industry="tech" />);
    expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
  });

  it("shows KPI breakdown section", () => {
    render(<CompetitiveIntelligenceDashboard industry="tech" />);
    expect(screen.getByText("KPI Breakdown")).toBeInTheDocument();
  });

  it("shows KPI metrics", () => {
    render(<CompetitiveIntelligenceDashboard industry="tech" />);
    expect(screen.getByText("CPC")).toBeInTheDocument();
    expect(screen.getByText("CTR")).toBeInTheDocument();
  });

  it("shows industry avg labels", () => {
    render(<CompetitiveIntelligenceDashboard industry="tech" />);
    const avgLabels = screen.getAllByText(/Industry avg:/);
    expect(avgLabels.length).toBeGreaterThan(0);
  });

  it("shows empty state when no benchmark data", async () => {
    const { getIndustryBenchmarks } = await import("@/lib/industryBenchmarks") as any;
    getIndustryBenchmarks.mockReturnValueOnce([]);
    render(<CompetitiveIntelligenceDashboard industry="unknown-industry" />);
    expect(screen.getByText("No benchmark data for this industry")).toBeInTheDocument();
  });

  it("shows competitor archetypes when provided", () => {
    render(
      <CompetitiveIntelligenceDashboard
        industry="tech"
        differentiationResult={{
          archetype: { he: "חלוץ", en: "Pioneer" },
          competitors: [
            {
              name: "Competitor A",
              strength: { he: "חוזק", en: "Strong brand" },
              weakness: { he: "חולשה", en: "Weak retention" },
            },
          ],
        }}
      />
    );
    expect(screen.getByText("Competitor Archetypes")).toBeInTheDocument();
    expect(screen.getByText("Competitor A")).toBeInTheDocument();
  });
});
