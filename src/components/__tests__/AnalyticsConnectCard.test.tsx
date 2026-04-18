import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnalyticsConnectCard } from "../AnalyticsConnectCard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn().mockReturnValue({}),
    setJSON: vi.fn(),
  },
}));

describe("AnalyticsConnectCard", () => {
  it("renders without crashing", () => {
    render(<AnalyticsConnectCard />);
    expect(screen.getByText("Connect Analytics")).toBeInTheDocument();
  });

  it("shows Beta badge", () => {
    render(<AnalyticsConnectCard />);
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows Google Analytics 4 connection row", () => {
    render(<AnalyticsConnectCard />);
    expect(screen.getByText("Google Analytics 4")).toBeInTheDocument();
  });

  it("shows Meta Pixel connection row", () => {
    render(<AnalyticsConnectCard />);
    expect(screen.getByText("Meta Pixel")).toBeInTheDocument();
  });

  it("shows Google Ads connection row", () => {
    render(<AnalyticsConnectCard />);
    expect(screen.getByText("Google Ads")).toBeInTheDocument();
  });

  it("shows prompt to connect real data when nothing is connected", () => {
    render(<AnalyticsConnectCard />);
    expect(
      screen.getByText(
        "Connecting real data lets FunnelForge learn what actually works"
      )
    ).toBeInTheDocument();
  });

  it("expands GA4 row on click", () => {
    render(<AnalyticsConnectCard />);
    const ga4Row = screen.getByText("Google Analytics 4").closest("button")!;
    fireEvent.click(ga4Row);
    expect(screen.getByPlaceholderText("G-XXXXXXXXXX")).toBeInTheDocument();
  });
});
