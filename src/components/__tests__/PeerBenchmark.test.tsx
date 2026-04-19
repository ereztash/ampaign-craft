import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeerBenchmark } from "../PeerBenchmark";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/lib/socialProofData", () => ({
  getSocialProof: vi.fn(() => ({
    usersCount: 1200,
    topMetric: { he: "שיפור ב-ROI", en: "ROI improvement" },
    topMetricValue: "37%",
  })),
  getTotalUsers: vi.fn(() => 5000),
}));

describe("PeerBenchmark", () => {
  const defaultProps = {
    businessField: "tech",
    modulesCompleted: 2,
    modulesTotal: 5,
  };

  it("renders without crashing", () => {
    expect(() => render(<PeerBenchmark {...defaultProps} />)).not.toThrow();
  });

  it("shows Peer Benchmark heading", () => {
    render(<PeerBenchmark {...defaultProps} />);
    expect(screen.getByText("Peer Benchmark")).toBeInTheDocument();
  });

  it("shows user count from social proof data", () => {
    render(<PeerBenchmark {...defaultProps} />);
    expect(screen.getByText(/1,200.*businesses/i)).toBeInTheDocument();
  });

  it("shows modules completed fraction", () => {
    render(<PeerBenchmark {...defaultProps} />);
    expect(screen.getByText("2/5")).toBeInTheDocument();
  });

  it("shows health score when provided", () => {
    render(<PeerBenchmark {...defaultProps} healthScore={82} />);
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("shows 'Your health score' label when healthScore is provided", () => {
    render(<PeerBenchmark {...defaultProps} healthScore={82} />);
    expect(screen.getByText("Your health score")).toBeInTheDocument();
  });

  it("shows top metric value badge", () => {
    render(<PeerBenchmark {...defaultProps} />);
    expect(screen.getByText("37%")).toBeInTheDocument();
  });

  it("does not render health score section when not provided", () => {
    render(<PeerBenchmark {...defaultProps} />);
    expect(screen.queryByText("Your health score")).toBeNull();
  });
});
