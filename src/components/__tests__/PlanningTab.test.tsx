import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PlanningTab from "../PlanningTab";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/components/GlossaryTooltip", () => ({
  default: () => <span data-testid="glossary-tooltip" />,
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
}));

vi.mock("@/lib/colorSemantics", () => ({
  chartColorPalette: ["#1a1a2e", "#16213e"],
}));

const barData = [
  { name: "Awareness", budget: 30, fill: "#3b82f6" },
  { name: "Conversion", budget: 70, fill: "#22c55e" },
];

const pieData = [
  { name: "Instagram", value: 40 },
  { name: "Google", value: 60 },
];

const kpis = [
  { name: { he: "ROI", en: "ROI" }, target: "3x", confidence: "high" as const },
  { name: { he: "CPA", en: "CPA" }, target: "₪50", confidence: "medium" as const },
];

const benchmarks = [
  {
    metric: { he: "עלות לליד", en: "Cost per lead" },
    value: "₪45",
    context: { he: "ממוצע ישראלי", en: "Israeli average" },
  },
];

describe("PlanningTab", () => {
  it("renders without crashing", () => {
    expect(() =>
      render(<PlanningTab barData={barData} pieData={pieData} kpis={kpis} benchmarks={benchmarks} />),
    ).not.toThrow();
  });

  it("shows budget allocation charts", () => {
    render(<PlanningTab barData={barData} pieData={pieData} kpis={kpis} benchmarks={benchmarks} />);
    expect(screen.getAllByTestId("bar-chart").length).toBeGreaterThan(0);
  });

  it("shows KPI targets", () => {
    render(<PlanningTab barData={barData} pieData={pieData} kpis={kpis} benchmarks={benchmarks} />);
    expect(screen.getByText("3x")).toBeInTheDocument();
    expect(screen.getByText("₪50")).toBeInTheDocument();
  });

  it("shows KPI names", () => {
    render(<PlanningTab barData={barData} pieData={pieData} kpis={kpis} benchmarks={benchmarks} />);
    expect(screen.getByText("ROI")).toBeInTheDocument();
    expect(screen.getByText("CPA")).toBeInTheDocument();
  });

  it("shows industry benchmarks when provided", () => {
    render(<PlanningTab barData={barData} pieData={pieData} kpis={kpis} benchmarks={benchmarks} />);
    expect(screen.getByText("₪45")).toBeInTheDocument();
  });

  it("renders empty benchmarks without crash", () => {
    expect(() =>
      render(<PlanningTab barData={barData} pieData={pieData} kpis={kpis} benchmarks={[]} />),
    ).not.toThrow();
  });
});
