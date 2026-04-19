import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DataAnalysisTab from "../DataAnalysisTab";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
  }),
}));

vi.mock("@/lib/colorSemantics", () => ({
  getTrendColor: vi.fn().mockReturnValue({ bg: "bg-green-100", icon: "text-green-600" }),
  getDatasetHealthColor: vi.fn().mockReturnValue("bg-green-100"),
  chartColorPalette: ["#3b82f6", "#10b981", "#f59e0b"],
}));

vi.mock("@/components/DataImportModal", () => ({
  default: ({ open }: any) =>
    open ? <div data-testid="data-import-modal">DataImportModal</div> : null,
}));

vi.mock("recharts", () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  CartesianGrid: () => <div />,
}));

vi.mock("@/hooks/useImportedData", () => ({
  useImportedData: () => ({
    datasets: [],
    importDataset: vi.fn(),
    deleteDataset: vi.fn(),
    getAnalysis: vi.fn().mockReturnValue(null),
  }),
}));

describe("DataAnalysisTab", () => {
  it("renders without crashing", () => {
    render(<DataAnalysisTab />);
    expect(screen.getByText("Data Analysis")).toBeInTheDocument();
  });

  it("shows import button", () => {
    render(<DataAnalysisTab />);
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("shows empty state when no datasets", () => {
    render(<DataAnalysisTab />);
    expect(screen.getByText("No imported data")).toBeInTheDocument();
  });

  it("shows import file button in empty state", () => {
    render(<DataAnalysisTab />);
    expect(screen.getByText("Import File")).toBeInTheDocument();
  });

  it("opens import modal on Import button click", () => {
    render(<DataAnalysisTab />);
    fireEvent.click(screen.getByText("Import"));
    expect(screen.getByTestId("data-import-modal")).toBeInTheDocument();
  });

  it("shows subtitle text", () => {
    render(<DataAnalysisTab />);
    expect(
      screen.getByText("Import Excel data and get trend analysis")
    ).toBeInTheDocument();
  });
});
