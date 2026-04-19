import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MetaMonitor from "../MetaMonitor";
import type { FunnelResult } from "@/types/funnel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/services/metaApi", () => ({
  getCampaignInsights: vi.fn(() =>
    Promise.resolve({
      spend: "1000",
      impressions: "50000",
      clicks: "2500",
      ctr: "5.0",
      cpc: "0.4",
      cpm: "20",
      reach: "30000",
      actions: [],
      date_start: "2026-01-01",
      date_stop: "2026-01-07",
    }),
  ),
}));

vi.mock("@/engine/gapEngine", () => ({
  computeGaps: vi.fn(() => []),
}));

vi.mock("@/engine/guidanceEngine", () => ({
  generateGuidance: vi.fn(() => []),
  getOverallHealth: vi.fn(() => ({ score: 80, color: "green", label: { he: "בריא", en: "Healthy" } })),
}));

vi.mock("@/lib/colorSemantics", () => ({
  getKpiStatusColor: vi.fn(() => ({
    text: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  })),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

const mockResult: FunnelResult = {
  formData: {
    businessField: "tech",
    mainGoal: "leads",
    audienceType: "B2B",
  },
  stages: [],
  kpis: [],
  hookTips: [],
} as unknown as FunnelResult;

describe("MetaMonitor", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MetaMonitor result={mockResult} accountId="act_123" accessToken="mock-token" />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows Performance Monitor heading", () => {
    render(
      <MetaMonitor result={mockResult} accountId="act_123" accessToken="mock-token" />,
    );
    expect(screen.getByText(/performance monitor/i)).toBeTruthy();
  });

  it("shows date range buttons", () => {
    render(
      <MetaMonitor result={mockResult} accountId="act_123" accessToken="mock-token" />,
    );
    expect(screen.getByText("7 days")).toBeTruthy();
    expect(screen.getByText("14 days")).toBeTruthy();
    expect(screen.getByText("30 days")).toBeTruthy();
  });

  it("shows Refresh button", () => {
    render(
      <MetaMonitor result={mockResult} accountId="act_123" accessToken="mock-token" />,
    );
    expect(screen.getByRole("button", { name: /refresh/i })).toBeTruthy();
  });

  it("shows 7 days selected by default", () => {
    const { container } = render(
      <MetaMonitor result={mockResult} accountId="act_123" accessToken="mock-token" />,
    );
    // The active button has bg-primary class
    const buttons = container.querySelectorAll("button");
    const activeButton = Array.from(buttons).find((b) =>
      b.className.includes("bg-primary"),
    );
    expect(activeButton?.textContent).toContain("7 days");
  });
});
