import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InsightsCard } from "../InsightsCard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/engine/insightsEngine", () => ({
  generateInsights: vi.fn(() => [
    {
      id: "i1",
      type: "win",
      title: { he: "הישג", en: "Great win" },
      body: { he: "תיאור", en: "Win body text" },
      metric: "+25%",
    },
    {
      id: "i2",
      type: "risk",
      title: { he: "סיכון", en: "Risk alert" },
      body: { he: "תיאור סיכון", en: "Risk body text" },
    },
    {
      id: "i3",
      type: "tip",
      title: { he: "טיפ", en: "Pro tip" },
      body: { he: "טיפ טוב", en: "Tip body text" },
    },
  ]),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("InsightsCard", () => {
  it("renders without crashing", () => {
    const { container } = render(<InsightsCard />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the card title", () => {
    render(<InsightsCard />);
    expect(screen.getByText(/insights from your plans/i)).toBeTruthy();
  });

  it("shows insight titles", () => {
    render(<InsightsCard />);
    expect(screen.getByText("Great win")).toBeTruthy();
    expect(screen.getByText("Risk alert")).toBeTruthy();
    expect(screen.getByText("Pro tip")).toBeTruthy();
  });

  it("shows insight body text", () => {
    render(<InsightsCard />);
    expect(screen.getByText("Win body text")).toBeTruthy();
  });

  it("shows metric badge when available", () => {
    render(<InsightsCard />);
    expect(screen.getByText("+25%")).toBeTruthy();
  });

  it("shows multiple insight types", () => {
    render(<InsightsCard />);
    // win, risk, tip types are all rendered
    expect(screen.getByText("Great win")).toBeTruthy();
    expect(screen.getByText("Risk alert")).toBeTruthy();
    expect(screen.getByText("Pro tip")).toBeTruthy();
  });
});
